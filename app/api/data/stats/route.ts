import { NextResponse } from 'next/server';
import { getHourlyStats, getRecordCount } from '@/lib/db';

/**
 * GET /api/data/stats?halte_id=HALTE_ITB_GANESHA
 * Aggregated hourly statistics for prediction.
 * Returns averages grouped by hour and day_of_week.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const halteId = searchParams.get('halte_id');

    const hourlyAverages = await getHourlyStats(halteId);
    const totalRecords = await getRecordCount();

    return NextResponse.json({
      halte_id: halteId ?? 'all',
      total_records: totalRecords,
      hourly_averages: hourlyAverages,
    });
  } catch (error) {
    console.error('[API /data/stats] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
