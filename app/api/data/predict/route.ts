import { NextResponse } from 'next/server';
import { predictNextHour, seedHistoricalData } from '@/lib/prediction';

/**
 * POST /api/data/predict
 * Predict passenger counts 1 hour ahead.
 * Body: { currentStates: Record<halteId, { total_saat_ini, masuk, keluar }>, halte_id?: string }
 *
 * GET /api/data/predict?halte_id=HALTE_ITB_GANESHA
 * Same but without current state data (uses zeros).
 */
export async function POST(request: Request) {
  try {
    // Seed historical data on first call if database is empty
    await seedHistoricalData();

    const body = await request.json();
    const { currentStates = {}, halte_id } = body;

    const predictions = await predictNextHour(currentStates, halte_id);

    return NextResponse.json({
      predictions,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /data/predict] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await seedHistoricalData();

    const { searchParams } = new URL(request.url);
    const halteId = searchParams.get('halte_id');

    const predictions = await predictNextHour({}, halteId);

    return NextResponse.json({
      predictions,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /data/predict] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
