import { createClient } from '@supabase/supabase-js';

// Project Supabase yang SAMA dengan SEMAR ERP: akun, menu, order, dan stok ikut sama
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isConfigured = !!url && !!anonKey;

export const supabase = createClient(url || 'https://belum-diisi.supabase.co', anonKey || 'belum-diisi', {
  // sesi disimpan terpisah dari SEMAR supaya logout di kiosk tidak mengganggu tab SEMAR di perangkat yang sama
  auth: { storageKey: 'gareng-auth' },
});

// Panggil fungsi database (RPC) SEMAR dan lempar error dengan pesan yang jelas
export async function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export async function must<T = unknown>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as T;
}

// Staf SEMAR login dengan username; di Supabase Auth disimpan sebagai email sintetis (sama dengan SEMAR)
export const toLoginEmail = (input: string) => {
  const v = input.trim().toLowerCase();
  return v.includes('@') ? v : `${v}@staff.santap.local`;
};
