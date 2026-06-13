// ============================================================
// esp32-bus-counter.ino — Main Sketch
// ============================================================
// Sistem penghitung penumpang bus Transum Koridor 5
//
// Hardware:
//   - ESP32 Dev Module
//   - 2x HC-SR04 Ultrasonic Sensor (pintu masuk & keluar)
//   - MAX7219 LED Dot Matrix 4x (8x8) untuk display
//
// Fitur:
//   - Deteksi penumpang masuk/keluar via sensor ultrasonik
//   - Hitung jumlah penumpang real-time (0 – BUS_CAPACITY)
//   - Tampilkan di LED Matrix MAX7219
//   - Kirim data ke MQTT HiveMQ Cloud (terintegrasi dashboard)
//   - Sinkronisasi waktu via NTP untuk timestamp akurat
//   - Auto-reconnect WiFi & MQTT
//
// Libraries yang dibutuhkan (install via Library Manager):
//   - PubSubClient         (Nick O'Leary)
//   - MD_Parola            (MajicDesigns)
//   - MD_MAX72XX           (MajicDesigns)
//   - ArduinoJson          (Benoit Blanchon)
// ============================================================

#include <Arduino.h>
#include <WiFi.h>
#include "config.h"
#include "sensor.h"
#include "display.h"
#include "mqtt_client.h"

// ─── Brownout disable ────────────────────────────────────────
// BOD bisa trigger SEBELUM setup() dipanggil (saat Arduino
// framework init). Solusi: gunakan C++ global constructor yang
// dieksekusi di fase static-init, jauh sebelum setup().
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// Struct ini di-instantiate saat static init (sebelum setup())
// → WRITE_PERI_REG dipanggil paling awal, sebelum framework init.
struct BrownoutGuard {
  BrownoutGuard() {
    WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0); // disable BOD
  }
} _brownout_guard; // ← instantiate global = jalan otomatis sebelum setup()

// ─── State Penumpang ────────────────────────────────────────
static int penumpang_saat_ini = 0;  // jumlah penumpang di dalam bus
static int total_masuk        = 0;  // akumulasi penumpang masuk
static int total_keluar       = 0;  // akumulasi penumpang keluar

// ─── Timing ─────────────────────────────────────────────────
static unsigned long last_mqtt_publish_ms  = 0;
static unsigned long last_wifi_check_ms    = 0;
static unsigned long wifi_reconnect_delay  = 5000;

// ─── Flags ──────────────────────────────────────────────────
static bool data_changed     = false; // ada perubahan → perlu publish segera
static bool ntp_synced       = false;

// ─── Fungsi WiFi ────────────────────────────────────────────

void wifiConnect() {
  Serial.printf("\n[WiFi] Menghubungkan ke '%s'", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  displayMessage("WIFI");

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.printf("[WiFi] Terhubung! IP: %s\n", WiFi.localIP().toString().c_str());
    displayMessage("OK");
    delay(1000);
  } else {
    Serial.println("\n[WiFi] GAGAL! Periksa SSID dan password di config.h");
    displayMessage("ERR");
    delay(3000);
  }
}

void ntpSync() {
  Serial.println("[NTP] Sinkronisasi waktu...");
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET, NTP_SERVER);

  struct tm timeinfo;
  int tries = 0;
  while (!getLocalTime(&timeinfo) && tries < 10) {
    delay(1000);
    Serial.print(".");
    tries++;
  }

  if (tries < 10) {
    char ts[30];
    strftime(ts, sizeof(ts), "%Y-%m-%d %H:%M:%S", &timeinfo);
    Serial.printf("\n[NTP] Waktu lokal: %s\n", ts);
    ntp_synced = true;
  } else {
    Serial.println("\n[NTP] Gagal sync — timestamp akan menggunakan epoch time.");
  }
}

// ─── Penumpang Counter ─────────────────────────────────────

/**
 * Tambah penumpang masuk.
 * Dipanggil saat sensor masuk mendeteksi orang.
 */
void tambahPenumpang() {
  penumpang_saat_ini++;
  total_masuk++;

  // Clamp pada kapasitas bus
  if (penumpang_saat_ini > BUS_CAPACITY) {
    penumpang_saat_ini = BUS_CAPACITY;
  }

  Serial.printf("[Counter] Masuk  +1 → Penumpang: %d / %d (Total masuk: %d)\n",
    penumpang_saat_ini, BUS_CAPACITY, total_masuk);

  displayUpdate(penumpang_saat_ini);
  data_changed = true;
}

/**
 * Kurangi penumpang keluar.
 * Dipanggil saat sensor keluar mendeteksi orang.
 */
void kurangiPenumpang() {
  total_keluar++;
  penumpang_saat_ini--;

  // Jangan sampai negatif
  if (penumpang_saat_ini < 0) {
    penumpang_saat_ini = 0;
  }

  Serial.printf("[Counter] Keluar -1 → Penumpang: %d / %d (Total keluar: %d)\n",
    penumpang_saat_ini, BUS_CAPACITY, total_keluar);

  displayUpdate(penumpang_saat_ini);
  data_changed = true;
}

// ─── Setup ──────────────────────────────────────────────────

void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(1000);

  Serial.println("============================================");
  Serial.println("  Transum Bus Passenger Counter v1.0");
  Serial.printf("  Bus ID: %s\n", BUS_ID);
  Serial.println("============================================");

  // 1. Inisialisasi display terlebih dahulu (beri feedback visual)
  displayInit();
  displayMessage("BOOT");
  delay(1000);

  // 2. Inisialisasi sensor ultrasonik
  sensorInit();

  // 3. Koneksi WiFi
  wifiConnect();

  // 4. Sinkronisasi NTP (butuh WiFi)
  if (WiFi.status() == WL_CONNECTED) {
    ntpSync();
  }

  // 5. Inisialisasi MQTT client
  mqttInit();

  // 6. Tampilkan jumlah awal (0)
  displayUpdate(penumpang_saat_ini);

  Serial.println("[Setup] Selesai. Memulai loop...");
  Serial.println("============================================");
}

// ─── Loop ───────────────────────────────────────────────────

void loop() {
  unsigned long now = millis();

  // ── 1. Jaga koneksi WiFi ──────────────────────────────────
  if (now - last_wifi_check_ms >= 10000) {
    last_wifi_check_ms = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WiFi] Koneksi putus, mencoba reconnect...");
      displayMessage("WIFI");
      wifiConnect();
      if (WiFi.status() == WL_CONNECTED && !ntp_synced) {
        ntpSync();
      }
    }
  }

  // ── 2. Jaga koneksi MQTT ──────────────────────────────────
  if (WiFi.status() == WL_CONNECTED) {
    mqttLoop(); // juga memanggil mqtt_client.loop() di dalamnya
  }

  // ── 3. Baca sensor ultrasonik ─────────────────────────────
  //
  // Sensor masuk: tambah penumpang jika terdeteksi
  if (sensorMasukTerdeteksi()) {
    tambahPenumpang();
  }

  // Sensor keluar: kurangi penumpang jika terdeteksi
  if (sensorKeluarTerdeteksi()) {
    kurangiPenumpang();
  }

  // ── 4. Publish MQTT ───────────────────────────────────────
  //
  // Publish segera jika ada perubahan data DAN MQTT terhubung
  bool waktu_publish = (now - last_mqtt_publish_ms >= MQTT_PUBLISH_INTERVAL_MS);

  if (mqttIsConnected() && (data_changed || waktu_publish)) {
    bool ok = mqttPublish(total_masuk, total_keluar, penumpang_saat_ini);
    if (ok) {
      last_mqtt_publish_ms = now;
      data_changed = false;
    }
  }

  // ── 5. Update display animasi (jika ada scroll aktif) ─────
  displayLoop();

  // ── 6. Small delay untuk stability ───────────────────────
  // Jangan terlalu kecil agar sensor echo tidak tumpang tindih
  delay(50);
}
