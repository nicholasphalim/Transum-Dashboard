// Endpoint ini aman karena hanya expose config ke client yang sudah login
// (dilindungi oleh middleware.ts)
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    halte: {
      brokerUrl: process.env.MQTT_HALTE_BROKER_URL ?? 'wss://9576a285a49641c9aa3331ebdb1eab9b.s1.eu.hivemq.cloud:8884/mqtt',
      username: process.env.MQTT_HALTE_USERNAME ?? 'wilfredo',
      password: process.env.MQTT_HALTE_PASSWORD ?? 'GH9DwybrUR!FmLc',
      topic: 'transumbdg/koridor5/halte/#',
      clientIdPrefix: 'transum_halte_',
      reconnectPeriod: 5000,
      connectTimeout: 8000,
    },
    bus: {
      brokerUrl: process.env.MQTT_BUS_BROKER_URL ?? '',
      username: process.env.MQTT_BUS_USERNAME ?? '',
      password: process.env.MQTT_BUS_PASSWORD ?? '',
      topic: 'transumbdg/koridor5/bus/#',
      clientIdPrefix: 'transum_bus_',
      reconnectPeriod: 5000,
      connectTimeout: 8000,
    },
  });
}
