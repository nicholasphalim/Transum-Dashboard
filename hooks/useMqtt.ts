'use client';

import { useEffect, useRef } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { useHalteStore } from '@/store/halteStore';
import type { MqttPayload } from '@/types';

export function useMqtt() {
  const clientRef = useRef<MqttClient | null>(null);
  const { setConnectionStatus, updateHalteState } = useHalteStore();

  const connect = async () => {
    // Ambil config dari API route (agar kredensial tidak expose ke client)
    const res = await fetch('/api/mqtt-config');
    if (!res.ok) return;
    const config = await res.json();

    setConnectionStatus('connecting');

    const clientId = `${config.clientIdPrefix}${Math.random().toString(16).slice(2, 10)}`;

    const client = mqtt.connect(config.brokerUrl, {
      clientId,
      username: config.username,
      password: config.password,
      clean: true,
      reconnectPeriod: config.reconnectPeriod,
      connectTimeout: config.connectTimeout,
      protocolVersion: 4,
    });

    clientRef.current = client;

    client.on('connect', () => {
      setConnectionStatus('connected');
      client.subscribe(config.topic, { qos: 0 });
    });

    client.on('message', (_topic: string, payload: Buffer) => {
      try {
        const data = JSON.parse(payload.toString()) as MqttPayload;
        if (data.device_id && data.data) {
          updateHalteState(data);
        }
      } catch {
        // Ignore non-JSON messages
      }
    });

    client.on('error', () => {
      setConnectionStatus('disconnected');
    });

    client.on('reconnect', () => setConnectionStatus('connecting'));
    client.on('close', () => setConnectionStatus('disconnected'));
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
