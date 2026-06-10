'use client';

import { useEffect, useRef } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { useHalteStore } from '@/store/halteStore';
import type { MqttPayload, BusMqttPayload, DualMqttConfig } from '@/types';

/**
 * Hook for connecting to the Halte MQTT broker.
 * Receives passenger waiting data from IoT sensors at bus stops.
 */
export function useMqttHalte() {
  const clientRef = useRef<MqttClient | null>(null);
  const { setHalteConnectionStatus, updateHalteState } = useHalteStore();

  const connect = async () => {
    const res = await fetch('/api/mqtt-config');
    if (!res.ok) return;
    const config: DualMqttConfig = await res.json();
    const halteConfig = config.halte;

    if (!halteConfig.brokerUrl) {
      console.warn('[MQTT Halte] No broker URL configured, skipping connection.');
      return;
    }

    setHalteConnectionStatus('connecting');

    const clientId = `${halteConfig.clientIdPrefix}${Math.random().toString(16).slice(2, 10)}`;

    const client = mqtt.connect(halteConfig.brokerUrl, {
      clientId,
      username: halteConfig.username,
      password: halteConfig.password,
      clean: true,
      reconnectPeriod: halteConfig.reconnectPeriod,
      connectTimeout: halteConfig.connectTimeout,
      protocolVersion: 4,
    });

    clientRef.current = client;

    client.on('connect', () => {
      console.log('[MQTT Halte] Connected to', halteConfig.brokerUrl);
      setHalteConnectionStatus('connected');
      client.subscribe(halteConfig.topic, { qos: 0 });
    });

    client.on('message', (_topic: string, payload: Buffer) => {
      try {
        const data = JSON.parse(payload.toString()) as MqttPayload;
        if (data.device_id && data.data) {
          // Fallback: jika ESP32 mengirim timestamp kosong, isi dengan waktu browser
          if (!data.timestamp) {
            data.timestamp = new Date().toISOString();
          }
          updateHalteState(data);
        }
      } catch {
        // Ignore non-JSON messages
      }
    });

    client.on('error', (err) => {
      console.error('[MQTT Halte] Error:', err.message);
      setHalteConnectionStatus('disconnected');
    });

    client.on('reconnect', () => setHalteConnectionStatus('connecting'));
    client.on('close', () => setHalteConnectionStatus('disconnected'));
  };

  const disconnect = () => {
    clientRef.current?.end(true);
    clientRef.current = null;
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return { connect, disconnect };
}

/**
 * Hook for connecting to the Bus MQTT broker.
 * Receives in-bus passenger data from onboard IoT devices.
 * Currently a placeholder — will connect when broker is configured.
 */
export function useMqttBus() {
  const clientRef = useRef<MqttClient | null>(null);
  const { setBusConnectionStatus, updateBusState } = useHalteStore();

  const connect = async () => {
    const res = await fetch('/api/mqtt-config');
    if (!res.ok) return;
    const config: DualMqttConfig = await res.json();
    const busConfig = config.bus;

    // Skip if no broker URL is configured (placeholder mode)
    if (!busConfig.brokerUrl) {
      console.log('[MQTT Bus] No broker configured — running in placeholder mode.');
      setBusConnectionStatus('disconnected');
      return;
    }

    setBusConnectionStatus('connecting');

    const clientId = `${busConfig.clientIdPrefix}${Math.random().toString(16).slice(2, 10)}`;

    const client = mqtt.connect(busConfig.brokerUrl, {
      clientId,
      username: busConfig.username,
      password: busConfig.password,
      clean: true,
      reconnectPeriod: busConfig.reconnectPeriod,
      connectTimeout: busConfig.connectTimeout,
      protocolVersion: 4,
    });

    clientRef.current = client;

    client.on('connect', () => {
      console.log('[MQTT Bus] Connected to', busConfig.brokerUrl);
      setBusConnectionStatus('connected');
      client.subscribe(busConfig.topic, { qos: 0 });
    });

    client.on('message', (_topic: string, payload: Buffer) => {
      try {
        const data = JSON.parse(payload.toString()) as BusMqttPayload;
        if (data.device_id && data.data) {
          updateBusState(data);
        }
      } catch {
        // Ignore non-JSON messages
      }
    });

    client.on('error', (err) => {
      console.error('[MQTT Bus] Error:', err.message);
      setBusConnectionStatus('disconnected');
    });

    client.on('reconnect', () => setBusConnectionStatus('connecting'));
    client.on('close', () => setBusConnectionStatus('disconnected'));
  };

  const disconnect = () => {
    clientRef.current?.end(true);
    clientRef.current = null;
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return { connect, disconnect };
}
