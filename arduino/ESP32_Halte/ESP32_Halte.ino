#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>

// ==========================================
// 1. KONFIGURASI JARINGAN & MQTT
// ==========================================
const char* ssid = "Pred S24";
const char* password = "predoip4";

const char* mqtt_server = "9576a285a49641c9aa3331ebdb1eab9b.s1.eu.hivemq.cloud";
const int   mqtt_port = 8883;
const char* mqtt_user = "wilfredo";
const char* mqtt_pass = "GH9DwybrUR!FmLc";

// PENTING: DEVICE_ID harus PERSIS sama dengan ID di halte-data.ts Dashboard.
// Daftar ID yang valid:
//   HALTE_UNPAD_DIPATIUKUR, HALTE_ITB_GANESHA, HALTE_DISPORA, HALTE_GASIBU,
//   HALTE_PUSDAI, HALTE_SUPRATMAN, HALTE_TAMAN_PRAMUKA, HALTE_GRAND_TEBU,
//   HALTE_BCH, HALTE_HORISON, HALTE_PT_INTI, HALTE_BYPASS,
//   HALTE_CILEUNYI, HALTE_IPDN, HALTE_ITB_JATINANGOR, HALTE_UNPAD_JATINANGOR
const char* DEVICE_ID  = "HALTE_UNPAD_DIPATIUKUR";
const char* mqtt_topic = "transumbdg/koridor5/halte/HALTE_UNPAD_DIPATIUKUR";

// NTP — Zona WIB (UTC+7)
const char* ntpServer       = "pool.ntp.org";
const long  gmtOffset_sec   = 7 * 3600;
const int   daylightOffset_sec = 0;

// ==========================================
// 2. KONFIGURASI PIN SENSOR
// ==========================================
#define TRIG_PIN_1 12   // Sensor 1 — Sisi Luar (Masuk ke halte)
#define ECHO_PIN_1 13
#define TRIG_PIN_2 14   // Sensor 2 — Sisi Dalam (Keluar dari halte / naik bus)
#define ECHO_PIN_2 27

// ==========================================
// 3. PARAMETER TUNING
// ==========================================
const int   THRESHOLD_CM       = 50;   // Jarak (cm) deteksi ada orang
const int   CONFIRM_COUNT       = 3;   // Berapa bacaan berturut-turut untuk dianggap "terhalang"
const int   CLEAR_COUNT         = 3;   // Berapa bacaan berturut-turut untuk dianggap "bebas"
const unsigned long SENSOR_GAP_MS      = 30;   // Jeda (ms) antara tembak Sensor 1 dan Sensor 2 (anti crosstalk)
const unsigned long FSM_TIMEOUT_MS     = 2500; // Reset FSM jika tidak ada gerakan lebih dari 2.5 detik
const unsigned long EVENT_COOLDOWN_MS  = 1500; // Jeda (ms) setelah setiap hitungan (anti double count)

// ==========================================
// 4. VARIABEL GLOBAL
// ==========================================
WiFiClientSecure espClient;
PubSubClient client(espClient);

// Data Penumpang Halte
int count_masuk     = 0;
int count_keluar    = 0;
int total_saat_ini  = 0;

// State FSM
// 0 = Idle, 1 = Tunggu S2 (potensi masuk), 2 = Tunggu S1 (potensi keluar), 3 = Cooldown selesai
int  fsmState          = 0;
unsigned long fsmStateStartTime = 0;
unsigned long lastEventTime     = 0;

// Debounce sensor (counter berturut-turut)
int s1BlockedCount = 0;
int s2BlockedCount = 0;
int s1ClearCount   = 0;
int s2ClearCount   = 0;
bool s1Blocked = false;  // Status stabil Sensor 1
bool s2Blocked = false;  // Status stabil Sensor 2

// ==========================================
// 5. FUNGSI UTILITAS
// ==========================================

// Baca jarak satu sensor (cm). 
// PENTING: Jangan tembak 2 sensor bersamaan — tunggu SENSOR_GAP_MS di antara keduanya.
int getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long dur = pulseIn(echoPin, HIGH, 25000); // timeout ~4.3 meter
  if (dur == 0) return 999;
  float cm = (float)dur * 0.034f / 2.0f;
  return (int)cm;
}

// Update status stabil satu sensor menggunakan debounce hysteresis
// Menghindari flip-flop jika sensor membaca nilai tepat di batas threshold
bool updateSensorState(bool currentStable, int distCm, int &blockedCnt, int &clearCnt) {
  bool rawBlocked = (distCm > 0 && distCm < THRESHOLD_CM);

  if (rawBlocked) {
    blockedCnt++;
    clearCnt = 0;
  } else {
    clearCnt++;
    blockedCnt = 0;
  }

  if (!currentStable && blockedCnt >= CONFIRM_COUNT) return true;  // Baru terhalang
  if (currentStable  && clearCnt   >= CLEAR_COUNT)   return false; // Baru bebas
  return currentStable; // Belum berubah
}

String getTimestamp() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) return "";
  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buf);
}

void sendPayload() {
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  String ts = getTimestamp();
  doc["timestamp"] = ts.length() > 0 ? ts : ""; // Fallback: dashboard isi timestamp

  JsonObject data = doc.createNestedObject("data");
  data["masuk"]        = count_masuk;
  data["keluar"]       = count_keluar;
  data["total_saat_ini"] = total_saat_ini;

  char buf[256];
  serializeJson(doc, buf);

  if (client.publish(mqtt_topic, buf)) {
    Serial.print("[OK] ");
  } else {
    Serial.print("[GAGAL] ");
  }
  Serial.println(buf);
}

void setup_wifi() {
  WiFi.begin(ssid, password);
  Serial.print("Koneksi WiFi");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (++tries > 40) { ESP.restart(); }
  }
  Serial.println(" OK! IP: " + WiFi.localIP().toString());
  
  // FIX: Mencegah WiFi ESP32 terputus karena power saving
  WiFi.setSleep(false);
}

void mqttReconnect() {
  int attempts = 0;
  while (!client.connected() && attempts < 5) {
    Serial.print("Koneksi MQTT...");
    String cid = "ESP32_Halte_" + String(random(0xffff), HEX);
    if (client.connect(cid.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println(" OK!");
    } else {
      Serial.printf(" Gagal rc=%d, coba lagi...\n", client.state());
      delay(3000);
      attempts++;
    }
  }
}

// ==========================================
// 6. SETUP
// ==========================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n=== TransUm ESP32 Sensor Halte ===");
  Serial.printf("Device : %s\n", DEVICE_ID);
  Serial.printf("Topic  : %s\n", mqtt_topic);

  pinMode(TRIG_PIN_1, OUTPUT);
  pinMode(ECHO_PIN_1, INPUT);
  pinMode(TRIG_PIN_2, OUTPUT);
  pinMode(ECHO_PIN_2, INPUT);

  setup_wifi();

  // NTP sync (tunggu sampai berhasil, maks 30 detik)
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  Serial.print("NTP sync");
  struct tm ti;
  int ntpTries = 0;
  while (!getLocalTime(&ti) && ntpTries < 60) {
    delay(500); Serial.print("."); ntpTries++;
  }
  Serial.println(ntpTries < 60 ? " OK! Waktu: " + getTimestamp() : " GAGAL (timestamp dari dashboard)");

  espClient.setInsecure();
  client.setServer(mqtt_server, mqtt_port);
  client.setBufferSize(512);
  client.setKeepAlive(60); // FIX: Memperpanjang batas waktu idle agar tidak diputus HiveMQ
  
  randomSeed(micros());    // FIX: Memastikan ID acak benar-benar berbeda setiap restart
  mqttReconnect();

  Serial.println("\n--- Sensor siap ---");
  Serial.printf("Threshold: %d cm | Debounce: %d reads | Cooldown: %lu ms\n",
                THRESHOLD_CM, CONFIRM_COUNT, EVENT_COOLDOWN_MS);
}

// ==========================================
// 7. LOOP UTAMA
// ==========================================
void loop() {
  // --- Jaga koneksi ---
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi putus, reconnect...");
    setup_wifi();
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
  }
  if (!client.connected()) mqttReconnect();
  client.loop();

  // --- Baca sensor secara bergantian (FIX UTAMA: anti crosstalk) ---
  int dist1 = getDistance(TRIG_PIN_1, ECHO_PIN_1);
  delay(SENSOR_GAP_MS);  // <<< KRITIS: tunggu gelombang sonar Sensor 1 hilang
  int dist2 = getDistance(TRIG_PIN_2, ECHO_PIN_2);

  // --- Update status stabil setiap sensor (FIX: debounce hysteresis) ---
  s1Blocked = updateSensorState(s1Blocked, dist1, s1BlockedCount, s1ClearCount);
  s2Blocked = updateSensorState(s2Blocked, dist2, s2BlockedCount, s2ClearCount);

  // --- Debug Serial (uncomment jika perlu) ---
  // Serial.printf("S1: %3d cm [%s]  S2: %3d cm [%s]  State: %d\n",
  //   dist1, s1Blocked ? "BLK" : "   ",
  //   dist2, s2Blocked ? "BLK" : "   ", fsmState);

  unsigned long now = millis();

  // --- FSM Penghitung Penumpang ---

  // FSM Timeout: jika terlalu lama di state menunggu, reset ke Idle
  if (fsmState != 0 && (now - fsmStateStartTime > FSM_TIMEOUT_MS)) {
    Serial.println("[TIMEOUT] Reset ke Idle.");
    fsmState = 0;
  }

  switch (fsmState) {

    case 0: // IDLE — tunggu sensor pertama terhalang
      // Abaikan jika masih dalam cooldown setelah event terakhir
      if (now - lastEventTime < EVENT_COOLDOWN_MS) break;

      if (s1Blocked && !s2Blocked) {
        fsmState = 1;
        fsmStateStartTime = now;
        Serial.println("[FSM] S1 terhalang — potensi MASUK");
      } else if (!s1Blocked && s2Blocked) {
        fsmState = 2;
        fsmStateStartTime = now;
        Serial.println("[FSM] S2 terhalang — potensi KELUAR");
      }
      break;

    case 1: // TUNGGU S2 — konfirmasi orang masuk
      if (s2Blocked) {
        count_masuk++;
        total_saat_ini++;
        lastEventTime = now;
        Serial.printf(">>> MASUK! total=%d masuk=%d keluar=%d\n",
                      total_saat_ini, count_masuk, count_keluar);
        sendPayload();
        fsmState = 3; // Ke state "tunggu area bersih"
      }
      break;

    case 2: // TUNGGU S1 — konfirmasi orang keluar
      if (s1Blocked) {
        count_keluar++;
        if (total_saat_ini > 0) total_saat_ini--;
        lastEventTime = now;
        Serial.printf("<<< KELUAR! total=%d masuk=%d keluar=%d\n",
                      total_saat_ini, count_masuk, count_keluar);
        sendPayload();
        fsmState = 3; // Ke state "tunggu area bersih"
      }
      break;

    case 3: // TUNGGU AREA BERSIH — cegah double count dari orang yang sama
      if (!s1Blocked && !s2Blocked) {
        fsmState = 0; // Kembali ke Idle
        Serial.println("[FSM] Area bersih — kembali Idle.");
      }
      break;
  }

  delay(20); // Loop delay minimal agar tidak boros CPU
}
