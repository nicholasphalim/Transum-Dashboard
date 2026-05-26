// Endpoint ini aman karena hanya expose config ke client yang sudah login
// (dilindungi oleh middleware.ts)
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    brokerUrl: process.env.MQTT_BROKER_URL ?? 'wss://broker.hivemq.com:8884/mqtt',
    username: process.env.MQTT_USERNAME ?? '',
    password: process.env.MQTT_PASSWORD ?? '',
    topic: 'transumbdg/koridor5/halte/#',
    clientIdPrefix: 'transum_dashboard_',
    reconnectPeriod: 5000,
    connectTimeout: 8000,
  });
}
