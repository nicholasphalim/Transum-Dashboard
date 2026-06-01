import { NextResponse } from 'next/server';
import { insertRecords, type RecordInsert } from '@/lib/db';

/**
 * POST /api/data/record
 * Batch-insert passenger records from MQTT or Simulator data.
 * Body: { records: MqttPayload[], source?: 'mqtt' | 'simulator' }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { records, source = 'mqtt' } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: records must be a non-empty array' },
        { status: 400 }
      );
    }

    // Transform MqttPayload[] into RecordInsert[]
    const inserts: RecordInsert[] = records.map((r: {
      device_id: string;
      timestamp: string;
      data: { masuk: number; keluar: number; total_saat_ini: number };
    }) => ({
      halte_id: r.device_id,
      timestamp: r.timestamp,
      masuk: r.data.masuk,
      keluar: r.data.keluar,
      total_saat_ini: r.data.total_saat_ini,
      source,
    }));

    const count = await insertRecords(inserts);

    return NextResponse.json({ success: true, inserted: count });
  } catch (error) {
    console.error('[API /data/record] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
