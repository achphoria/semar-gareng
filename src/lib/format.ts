const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export const formatRupiah = (value: number | string | null | undefined) => rupiah.format(Number(value ?? 0));

// tanggal bisnis lokal (sama dengan SEMAR)
export const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
