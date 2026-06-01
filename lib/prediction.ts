import { getHourlyStats, insertRecords, getRecordCount, type RecordInsert } from './db';
import { HALTE_LIST } from './halte-data';

export interface PredictionResult {
  halte_id: string;
  halte_name: string;
  current_total: number;
  predicted_total: number;
  predicted_masuk: number;
  predicted_keluar: number;
  confidence: 'high' | 'medium' | 'low' | 'no_data';
  sample_count: number;
  target_hour: number;
  target_day: number;
  method: string;
}

/**
 * Predict passenger count at each halte 1 hour from now.
 * Uses weighted historical averages from SQLite.
 */
export async function predictNextHour(
  currentStates: Record<string, { total_saat_ini: number; masuk: number; keluar: number }>,
  targetHalteId?: string | null,
): Promise<PredictionResult[]> {
  const now = new Date();
  const targetHour = (now.getHours() + 1) % 24;
  const targetDay = now.getDay(); // 0=Sun, 6=Sat

  const halteIds = targetHalteId && targetHalteId !== 'all'
    ? [targetHalteId]
    : HALTE_LIST.map(h => h.id);

  const results: PredictionResult[] = [];

  for (const halteId of halteIds) {
    const halte = HALTE_LIST.find(h => h.id === halteId);
    if (!halte) continue;

    const stats = (await getHourlyStats(halteId)) as Array<{
      halte_id: string;
      hour: number;
      day_of_week: number;
      avg_total: number;
      avg_masuk: number;
      avg_keluar: number;
      sample_count: number;
    }>;

    const currentState = currentStates[halteId] ?? { total_saat_ini: 0, masuk: 0, keluar: 0 };

    // Try to find exact match: same hour + same day of week
    const exactMatch = stats.find(s => s.hour === targetHour && s.day_of_week === targetDay);

    // Fallback: same hour, any day
    const hourMatches = stats.filter(s => s.hour === targetHour);
    const hourAvg = hourMatches.length > 0
      ? {
          avg_total: hourMatches.reduce((sum, s) => sum + s.avg_total, 0) / hourMatches.length,
          avg_masuk: hourMatches.reduce((sum, s) => sum + s.avg_masuk, 0) / hourMatches.length,
          avg_keluar: hourMatches.reduce((sum, s) => sum + s.avg_keluar, 0) / hourMatches.length,
          sample_count: hourMatches.reduce((sum, s) => sum + s.sample_count, 0),
        }
      : null;

    // Determine prediction and confidence
    let predicted_total: number;
    let predicted_masuk: number;
    let predicted_keluar: number;
    let confidence: PredictionResult['confidence'];
    let sample_count: number;
    let method: string;

    if (exactMatch && exactMatch.sample_count >= 10) {
      // High confidence: exact hour + day match with enough samples
      // Blend: 70% historical average, 30% current trend
      const trend = currentState.total_saat_ini / Math.max(1, exactMatch.avg_total);
      predicted_total = Math.round(exactMatch.avg_total * (0.7 + 0.3 * trend));
      predicted_masuk = Math.round(exactMatch.avg_masuk * (0.7 + 0.3 * trend));
      predicted_keluar = Math.round(exactMatch.avg_keluar * (0.7 + 0.3 * trend));
      confidence = 'high';
      sample_count = exactMatch.sample_count;
      method = 'Rata-rata historis (jam + hari sama) + tren saat ini';
    } else if (hourAvg && hourAvg.sample_count >= 5) {
      // Medium confidence: hour match across all days
      const trend = currentState.total_saat_ini / Math.max(1, hourAvg.avg_total);
      predicted_total = Math.round(hourAvg.avg_total * (0.6 + 0.4 * trend));
      predicted_masuk = Math.round(hourAvg.avg_masuk * (0.6 + 0.4 * trend));
      predicted_keluar = Math.round(hourAvg.avg_keluar * (0.6 + 0.4 * trend));
      confidence = 'medium';
      sample_count = hourAvg.sample_count;
      method = 'Rata-rata jam yang sama (semua hari) + tren saat ini';
    } else if (stats.length > 0) {
      // Low confidence: use overall average + strong current trend bias
      const overallAvg = {
        avg_total: stats.reduce((s, r) => s + r.avg_total, 0) / stats.length,
        avg_masuk: stats.reduce((s, r) => s + r.avg_masuk, 0) / stats.length,
        avg_keluar: stats.reduce((s, r) => s + r.avg_keluar, 0) / stats.length,
        sample_count: stats.reduce((s, r) => s + r.sample_count, 0),
      };
      predicted_total = Math.round(overallAvg.avg_total * 0.4 + currentState.total_saat_ini * 0.6);
      predicted_masuk = Math.round(overallAvg.avg_masuk * 0.4 + currentState.masuk * 0.6);
      predicted_keluar = Math.round(overallAvg.avg_keluar * 0.4 + currentState.keluar * 0.6);
      confidence = 'low';
      sample_count = overallAvg.sample_count;
      method = 'Rata-rata keseluruhan + bobot tren saat ini';
    } else {
      // No data: use current state as fallback
      predicted_total = currentState.total_saat_ini;
      predicted_masuk = currentState.masuk;
      predicted_keluar = currentState.keluar;
      confidence = 'no_data';
      sample_count = 0;
      method = 'Tidak ada data historis — menggunakan nilai saat ini';
    }

    // Clamp to non-negative
    predicted_total = Math.max(0, predicted_total);
    predicted_masuk = Math.max(0, predicted_masuk);
    predicted_keluar = Math.max(0, predicted_keluar);

    results.push({
      halte_id: halteId,
      halte_name: halte.name,
      current_total: currentState.total_saat_ini,
      predicted_total,
      predicted_masuk,
      predicted_keluar,
      confidence,
      sample_count,
      target_hour: targetHour,
      target_day: targetDay,
      method,
    });
  }

  return results;
}

/**
 * Seed the database with simulated historical data so predictions
 * work immediately in demo mode (without waiting days for real data).
 * Generates 7 days of data at 5-minute intervals for all halte.
 */
export async function seedHistoricalData(): Promise<number> {
  const count = await getRecordCount();
  if (count > 100) {
    // Already has data, skip seeding
    return 0;
  }

  const records: RecordInsert[] = [];
  const now = new Date();

  // Generate 7 days of historical data
  for (let dayOffset = 7; dayOffset >= 1; dayOffset--) {
    for (let hour = 5; hour <= 23; hour++) {
      // 12 data points per hour (every 5 min)
      for (let minute = 0; minute < 60; minute += 5) {
        const timestamp = new Date(now);
        timestamp.setDate(timestamp.getDate() - dayOffset);
        timestamp.setHours(hour, minute, 0, 0);

        for (const halte of HALTE_LIST) {
          // Create realistic patterns:
          // Rush hours (6-9, 16-19) have higher traffic
          // Weekdays have more traffic than weekends
          const isWeekday = timestamp.getDay() >= 1 && timestamp.getDay() <= 5;
          const isRushHour = (hour >= 6 && hour <= 9) || (hour >= 16 && hour <= 19);
          const isMidDay = hour >= 10 && hour <= 15;

          let baseTotal: number;
          if (isRushHour) {
            baseTotal = isWeekday ? 12 + Math.random() * 15 : 6 + Math.random() * 8;
          } else if (isMidDay) {
            baseTotal = isWeekday ? 5 + Math.random() * 8 : 3 + Math.random() * 5;
          } else {
            baseTotal = 1 + Math.random() * 4;
          }

          // Vary by halte position (bigger stops have more traffic)
          const positionFactor = halte.order <= 4 || halte.order >= 14 ? 1.3 : 0.8;
          baseTotal *= positionFactor;

          // Add some randomness
          baseTotal += (Math.random() - 0.5) * 3;
          baseTotal = Math.max(0, Math.round(baseTotal));

          const masuk = Math.round(baseTotal * (1.5 + Math.random()));
          const keluar = Math.round(masuk * (0.3 + Math.random() * 0.5));

          records.push({
            halte_id: halte.id,
            timestamp: timestamp.toISOString(),
            masuk,
            keluar,
            total_saat_ini: baseTotal,
            source: 'seed',
          });
        }
      }
    }
  }

  // Insert in batches of 1000
  let inserted = 0;
  for (let i = 0; i < records.length; i += 1000) {
    const batch = records.slice(i, i + 1000);
    inserted += await insertRecords(batch);
  }

  return inserted;
}
