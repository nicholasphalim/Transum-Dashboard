import { NextResponse } from 'next/server';
import { getHistory } from '@/lib/db';

/**
 * GET /api/data/history?halte_id=HALTE_ITB_GANESHA&hours=24
 * Query historical passenger records for time-series analysis.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const halteId = searchParams.get('halte_id');
    const hours = parseInt(searchParams.get('hours') ?? '24', 10);

    if (isNaN(hours) || hours < 1 || hours > 720) {
      return NextResponse.json(
        { error: 'Invalid hours parameter (must be 1-720)' },
        { status: 400 }
      );
    }

    const records = await getHistory(halteId, hours);

    return NextResponse.json({
      halte_id: halteId ?? 'all',
      hours,
      count: records.length,
      records,
    });
  } catch (error) {
    console.error('[API /data/history] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
