import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// ── Lazy Supabase Client (only created when first used) ──
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diset di .env.local');
    return null;
  }
  _supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
  return _supabase;
}

// Exported for backward compatibility
export const supabase = {
  from: (table: string) => {
    const client = getSupabase();
    if (!client) {
      // Return a no-op proxy that won't crash
      console.warn(`[DB] Supabase not configured — skipping operation on "${table}"`);
      return {
        insert: async () => ({ error: { message: 'Supabase not configured' } }),
        select: () => ({
          eq: function(this: any) { return this; },
          gte: function(this: any) { return this; },
          order: function(this: any) { return this; },
          single: async function() { return { data: null, error: null }; },
          then: (resolve: any) => resolve({ data: [], error: null, count: 0 }),
        }),
        update: () => ({
          eq: async function() { return { error: null }; },
        }),
      } as any;
    }
    return client.from(table);
  },
};

// ── Types ──
export interface RecordInsert {
  halte_id: string;
  timestamp: string;
  masuk: number;
  keluar: number;
  total_saat_ini: number;
  source?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  reset_token: string | null;
  reset_token_expiry: number | null;
  created_at: string;
}

// ── Public API ──

/**
 * Batch-insert passenger records
 */
export async function insertRecords(records: RecordInsert[]): Promise<number> {
  const rows = records.map(record => {
    const dt = new Date(record.timestamp);
    return {
      halte_id: record.halte_id,
      timestamp: record.timestamp,
      masuk: record.masuk,
      keluar: record.keluar,
      total_saat_ini: record.total_saat_ini,
      hour: dt.getHours(),
      day_of_week: dt.getDay(),
      source: record.source ?? 'mqtt',
    };
  });

  const { error } = await supabase.from('passenger_records').insert(rows);
  if (error) {
    console.error('Error inserting records:', error);
    return 0;
  }
  return rows.length;
}

/**
 * Query historical records for a halte within a lookback window.
 */
export async function getHistory(halteId: string | null, hours: number = 24) {
  const lookbackDate = new Date();
  lookbackDate.setHours(lookbackDate.getHours() - hours);
  const lookbackISO = lookbackDate.toISOString();

  let query = supabase
    .from('passenger_records')
    .select('halte_id, timestamp, masuk, keluar, total_saat_ini, hour, day_of_week, source')
    .gte('timestamp', lookbackISO)
    .order('timestamp', { ascending: true });

  if (halteId && halteId !== 'all') {
    query = query.eq('halte_id', halteId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error getting history:', error);
    return [];
  }
  return data || [];
}

/**
 * Get hourly averages grouped by hour and day_of_week for prediction.
 */
export async function getHourlyStats(halteId: string | null) {
  // Supabase postgREST doesn't natively support GROUP BY without creating a View or RPC function.
  // We can fetch the raw data and aggregate in JS for now, or create an RPC later.
  // Since this is for a prototype/dashboard, let's just query the data and aggregate it in memory.
  
  let query = supabase.from('passenger_records').select('halte_id, hour, day_of_week, total_saat_ini, masuk, keluar');
  if (halteId && halteId !== 'all') {
    query = query.eq('halte_id', halteId);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error('Error getting stats:', error);
    return [];
  }

  // Aggregate in JS
  type AggState = {
    total_saat_ini_sum: number;
    masuk_sum: number;
    keluar_sum: number;
    count: number;
  };
  const grouped: Record<string, AggState> = {};

  for (const row of data) {
    const key = `${row.halte_id}_${row.day_of_week}_${row.hour}`;
    if (!grouped[key]) {
      grouped[key] = { total_saat_ini_sum: 0, masuk_sum: 0, keluar_sum: 0, count: 0 };
    }
    grouped[key].total_saat_ini_sum += row.total_saat_ini;
    grouped[key].masuk_sum += row.masuk;
    grouped[key].keluar_sum += row.keluar;
    grouped[key].count++;
  }

  const result = Object.entries(grouped).map(([key, state]) => {
    const [h_id, d_str, hr_str] = key.split('_');
    return {
      halte_id: h_id,
      day_of_week: parseInt(d_str),
      hour: parseInt(hr_str),
      avg_total: parseFloat((state.total_saat_ini_sum / state.count).toFixed(2)),
      avg_masuk: parseFloat((state.masuk_sum / state.count).toFixed(2)),
      avg_keluar: parseFloat((state.keluar_sum / state.count).toFixed(2)),
      sample_count: state.count,
    };
  });

  result.sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    return a.hour - b.hour;
  });

  return result;
}

/**
 * Get total record count (for monitoring).
 */
export async function getRecordCount(): Promise<number> {
  const { count, error } = await supabase
    .from('passenger_records')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error('Error getting record count:', error);
    return 0;
  }
  return count || 0;
}

// ── User Management API ──

export async function createUser(username: string, email: string, password_hash: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('users')
    .insert([{ username, email, password_hash }])
    .select('id')
    .single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }
  return data.id;
}

export async function getUserByUsername(username: string): Promise<User | undefined> {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();
  return data || undefined;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  return data || undefined;
}

export async function updateUserResetToken(userId: number, token: string | null, expiry: number | null) {
  const { error } = await supabase
    .from('users')
    .update({ reset_token: token, reset_token_expiry: expiry })
    .eq('id', userId);
    
  if (error) console.error('Error updating reset token:', error);
}

export async function getUserByResetToken(token: string): Promise<User | undefined> {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('reset_token', token)
    .single();
  return data || undefined;
}

export async function updateUserPassword(userId: number, password_hash: string) {
  const { error } = await supabase
    .from('users')
    .update({ password_hash, reset_token: null, reset_token_expiry: null })
    .eq('id', userId);
    
  if (error) console.error('Error updating password:', error);
}
