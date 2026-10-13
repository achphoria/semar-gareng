import { useCallback, useEffect, useState } from 'react';
import { must, rpc, supabase } from '../lib/supabase';
import { errorMessage } from '../lib/format';
import type { KioskConfig, PaymentMethod, Profile } from '../lib/types';

/** Aktivasi perangkat oleh staf: pilih outlet, pastikan shift kasir terbuka & metode QRIS ada */
export default function SetupPage({ profile, onStart }: { profile: Profile; onStart: (c: KioskConfig) => void }) {
  const [outletId, setOutletId] = useState(profile.outlets[0]?.id ?? '');
  const [shiftOpen, setShiftOpen] = useState<boolean | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodId, setMethodId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const can = (perm: string) => profile.role_code === 'owner' || profile.permissions.includes(perm);
  const missingPerms = ['pos.order', 'pos.pay'].filter((p) => !can(p));

  // pembayaran kiosk dicatat di shift kasir milik akun yang login (aturan pos_pay_order di SEMAR)
  const checkShift = useCallback(async () => {
    if (!outletId) return;
    setShiftOpen(null);
    const rows = await must<{ id: string }[]>(supabase.from('pos_shifts').select('id')
      .eq('outlet_id', outletId).eq('user_id', profile.user_id).eq('status', 'open').limit(1));
    setShiftOpen(rows.length > 0);
  }, [outletId, profile.user_id]);
  useEffect(() => { checkShift().catch((e) => setError(errorMessage(e))); }, [checkShift]);

  useEffect(() => {
    must<PaymentMethod[]>(supabase.from('mst_payment_methods').select('id, code, name, type').eq('is_active', true).order('sort_order'))
      .then((rows) => {
        setMethods(rows);
        const qris = rows.find((m) => /qris/i.test(m.code) || /qris/i.test(m.name)) ?? rows.find((m) => m.type === 'ewallet');
        setMethodId(qris?.id ?? '');
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  const openShift = async () => {
    setBusy(true);
    setError('');
    try {
      await rpc('pos_open_shift', { p_outlet_id: outletId, p_opening_cash: 0 });
      await checkShift();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const outlet = profile.outlets.find((o) => o.id === outletId);
  const ready = !!outlet && shiftOpen === true && !!methodId && !missingPerms.length;

  return (
    <div className="screen">
      <div className="panel wide">
        <h1><b>GARENG</b> · Aktifkan kiosk</h1>
        <p className="k-muted">{profile.full_name} · {profile.role_name} · {profile.company_name}</p>
        {error && <div className="k-error static">{error}</div>}

        <label className="k-field">
          <span>1. Outlet tempat kiosk dipasang</span>
          <select value={outletId} onChange={(e) => setOutletId(e.target.value)}>
            {profile.outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </label>
        {!profile.outlets.length && <p className="k-warn">Akun ini belum punya akses ke outlet mana pun.</p>}

        <div className="k-field">
          <span>2. Shift kasir</span>
          {shiftOpen === null ? <p className="k-muted">Memeriksa...</p>
            : shiftOpen ? <p className="k-ok">✓ Shift kasir Anda di outlet ini sudah terbuka. Pembayaran kiosk masuk ke shift ini.</p>
            : (
              <div className="k-row">
                <p className="k-warn">Belum ada shift kasir terbuka atas nama Anda di outlet ini.</p>
                <button className="k-ghost" disabled={busy} onClick={openShift}>{busy ? 'Membuka...' : 'Buka shift (modal Rp0)'}</button>
              </div>
            )}
        </div>

        <label className="k-field">
          <span>3. Metode pembayaran untuk QRIS</span>
          <select value={methodId} onChange={(e) => setMethodId(e.target.value)}>
            <option value="">— pilih —</option>
            {methods.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
        {methods.length > 0 && !methodId && <p className="k-warn">Belum ada metode QRIS. Tambahkan di SEMAR → Pengaturan → Metode Pembayaran, atau pilih yang lain.</p>}

        {missingPerms.length > 0 && <p className="k-warn">Akun ini tidak punya izin: {missingPerms.join(', ')}. Pakai akun owner atau kasir.</p>}

        <button className="k-primary" disabled={!ready}
          onClick={() => outlet && onStart({ outletId: outlet.id, outletName: outlet.name, paymentMethodId: methodId })}>
          Mulai mode kiosk
        </button>
        <button className="k-ghost" onClick={() => supabase.auth.signOut()}>Keluar akun</button>
        <p className="k-muted small">Untuk keluar dari mode kiosk nanti: ketuk tulisan GARENG di pojok kiri atas 5 kali.</p>
      </div>
    </div>
  );
}
