import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import Orb, { type OrbState } from '../components/Orb';
import ItemSheet from '../components/ItemSheet';
import Photo from '../components/Photo';
import { must, rpc, supabase } from '../lib/supabase';
import { errorMessage, formatRupiah, pick, todayISO } from '../lib/format';
import { isMuted, setMuted, speak, stopSpeaking } from '../lib/voice';
import type { CartLine, Channel, KioskConfig, MenuCategory, MenuItem, Modifier, ModifierGroup, Order, Profile } from '../lib/types';

type Phase = 'welcome' | 'menu' | 'review' | 'paying' | 'done';
interface Caption { text: string; suggest?: MenuItem }
interface OutletSettings { tax_rate: number; service_charge_rate: number; rounding_unit: number }
interface MenuPrice { menu_item_id: string; outlet_id: string | null; sales_channel: string; price: number }

const PAY_SECONDS = 180;        // batas waktu scan QRIS
const IDLE_SECONDS = 90;        // tanpa sentuhan -> kembali ke layar sambutan
const DONE_SECONDS = 15;        // layar nomor pesanan

const REACTIONS = ['Siap, {n} masuk keranjang!', '{n}, pilihan mantap kak!', 'Oke, {n} sudah aku catat.', 'Mantap, {n} ditambahkan!'];

export default function KioskPage({ config, onExit }: { profile: Profile; config: KioskConfig; onExit: () => void }) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [prices, setPrices] = useState<MenuPrice[]>([]);
  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [links, setLinks] = useState<{ menu_item_id: string; modifier_group_id: string }[]>([]);
  const [settings, setSettings] = useState<OutletSettings>({ tax_rate: 0, service_charge_rate: 0, rounding_unit: 1 });
  const [serverPrices, setServerPrices] = useState<Record<string, number>>({});
  const [soldOut, setSoldOut] = useState<Set<string>>(new Set());

  const [phase, setPhase] = useState<Phase>('welcome');
  const [channel, setChannel] = useState<Channel>('dine_in');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [categoryId, setCategoryId] = useState('all');
  const [sheetItem, setSheetItem] = useState<MenuItem | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [qr, setQr] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(PAY_SECONDS);

  const [caption, setCaption] = useState<Caption>({ text: 'Halo! Aku Gareng. Sentuh layar untuk mulai pesan.' });
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [muted, setMutedState] = useState(isMuted());

  // ------------------------------------------------------------ data menu (sama dengan POS SEMAR)
  useEffect(() => {
    (async () => {
      try {
        const [cats, menu, pr, grp, lnk, out] = await Promise.all([
          must<MenuCategory[]>(supabase.from('mst_menu_categories').select('id, name, sort_order').eq('is_active', true).order('sort_order')),
          must<MenuItem[]>(supabase.from('mst_menu_items').select('*').eq('is_active', true).order('name')),
          must<MenuPrice[]>(supabase.from('mst_menu_prices').select('menu_item_id, outlet_id, sales_channel, price')),
          must<ModifierGroup[]>(supabase.from('mst_modifier_groups').select('*, mst_modifiers(*)').order('name')),
          must<{ menu_item_id: string; modifier_group_id: string }[]>(supabase.from('mst_menu_item_modifier_groups').select('menu_item_id, modifier_group_id')),
          must<OutletSettings>(supabase.from('sys_outlets').select('tax_rate, service_charge_rate, rounding_unit').eq('id', config.outletId).single()),
        ]);
        setCategories(cats); setItems(menu); setPrices(pr); setGroups(grp); setLinks(lnk); setSettings(out);
      } catch (e) {
        setError(errorMessage(e));
      }
    })();
  }, [config.outletId]);

  // harga dari server (memperhitungkan jadwal harga), diperbarui tiap ganti kanal & tiap menit
  useEffect(() => {
    const load = () => rpc<Record<string, number>>('mst_get_current_menu_prices', { p_outlet_id: config.outletId, p_channel: channel })
      .then(setServerPrices).catch(() => setServerPrices({}));
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [config.outletId, channel]);

  // menu habis hari ini (realtime dari dapur / kasir SEMAR)
  const loadSoldOut = useCallback(async () => {
    const rows = await must<{ menu_item_id: string }[]>(supabase.from('mst_menu_sold_outs').select('menu_item_id')
      .eq('outlet_id', config.outletId).eq('business_date', todayISO()));
    setSoldOut(new Set(rows.map((r) => r.menu_item_id)));
  }, [config.outletId]);
  useEffect(() => {
    loadSoldOut().catch(() => undefined);
    const ch = supabase.channel('gareng-sold-out')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mst_menu_sold_outs' }, () => loadSoldOut().catch(() => undefined))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadSoldOut]);

  const priceOf = useCallback((item: MenuItem) => {
    if (serverPrices[item.id] !== undefined) return Number(serverPrices[item.id]);
    const specific = prices.find((p) => p.menu_item_id === item.id && p.outlet_id === config.outletId && p.sales_channel === channel);
    const general = prices.find((p) => p.menu_item_id === item.id && p.outlet_id === null && p.sales_channel === channel);
    return Number(specific?.price ?? general?.price ?? item.base_price);
  }, [serverPrices, prices, config.outletId, channel]);

  const variantsOf = useCallback((item: MenuItem) => items.filter((c) => c.parent_id === item.id)
    .sort((a, b) => (a.variant_sort ?? 0) - (b.variant_sort ?? 0)), [items]);
  const groupsFor = useCallback((item: MenuItem) => links.filter((l) => l.menu_item_id === item.id)
    .map((l) => groups.find((g) => g.id === l.modifier_group_id)).filter((g): g is ModifierGroup => !!g), [links, groups]);

  const menuItems = useMemo(() => items.filter((i) => !i.parent_id && (!i.has_variants || variantsOf(i).length > 0)), [items, variantsOf]);
  const visibleItems = menuItems.filter((i) => categoryId === 'all' || i.menu_category_id === categoryId);
  const usedCategories = categories.filter((c) => menuItems.some((i) => i.menu_category_id === c.id));

  const tilePrice = (item: MenuItem) => {
    if (!item.has_variants) return formatRupiah(priceOf(item));
    const ps = variantsOf(item).map(priceOf);
    return ps.length && Math.min(...ps) !== Math.max(...ps) ? `mulai ${formatRupiah(Math.min(...ps))}` : formatRupiah(ps[0] ?? 0);
  };

  // perkiraan total (total final dihitung server saat pesanan dibuat)
  const totals = useMemo(() => {
    const subtotal = cart.reduce((s, l) => s + l.quantity * (priceOf(l.item) + l.modifiers.reduce((m, x) => m + Number(x.extra_price), 0)), 0);
    const service = Math.round((subtotal * Number(settings.service_charge_rate)) / 100);
    const tax = Math.round(((subtotal + service) * Number(settings.tax_rate)) / 100);
    const unit = Number(settings.rounding_unit) || 1;
    return { subtotal, service, tax, total: Math.round((subtotal + service + tax) / unit) * unit };
  }, [cart, priceOf, settings]);
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const qtyOf = (itemId: string) => cart.filter((l) => l.item.id === itemId || l.item.parent_id === itemId).reduce((s, l) => s + l.quantity, 0);

  // ------------------------------------------------------------ suara & orb
  const say = useCallback((text: string, suggest?: MenuItem) => {
    setCaption({ text, suggest });
    speak(text.replace(/Rp\s?/g, ''), () => setSpeaking(true), () => setSpeaking(false));
  }, []);
  const orbState: OrbState = busy ? 'think' : speaking ? 'speak' : phase === 'done' ? 'success' : 'idle';

  // ------------------------------------------------------------ alur
  const resetAll = useCallback(() => {
    stopSpeaking();
    setSpeaking(false);
    setCart([]); setCustomerName(''); setOrder(null); setQr(''); setSheetItem(null); setCategoryId('all'); setError('');
    setPhase('welcome');
    setCaption({ text: 'Halo! Aku Gareng. Sentuh layar untuk mulai pesan.' });
  }, []);

  const start = (c: Channel) => {
    setChannel(c);
    setPhase('menu');
    say(c === 'dine_in' ? 'Makan di sini, siap! Mau pesan apa hari ini kak?' : 'Bawa pulang, siap! Mau pesan apa hari ini kak?');
  };

  const suggestionFor = (added: MenuItem): MenuItem | undefined => {
    const inCart = new Set([...cart.map((l) => l.item.parent_id ?? l.item.id), added.parent_id ?? added.id]);
    const cartCats = new Set([...cart.map((l) => l.item.menu_category_id), added.menu_category_id]);
    const avail = menuItems.filter((i) => !inCart.has(i.id) && !soldOut.has(i.id));
    const otherCat = avail.filter((i) => !cartCats.has(i.menu_category_id));
    const pool = otherCat.filter((i) => i.image_url).length ? otherCat.filter((i) => i.image_url) : otherCat.length ? otherCat : avail;
    return pool.length ? pick(pool) : undefined;
  };

  const addToCart = (item: MenuItem, modifiers: Modifier[], quantity: number) => {
    const key = `${item.id}|${modifiers.map((m) => m.id).sort().join(',')}`;
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l));
      return [...prev, { key, item, quantity, modifiers }];
    });
    setSheetItem(null);
    const parent = item.parent_id ? items.find((i) => i.id === item.parent_id) : null;
    const name = parent ? `${parent.name} ${item.variant_name ?? item.name}` : item.name;
    const reaction = pick(REACTIONS).replace('{n}', name);
    // upsell: tawarkan menu dari kategori yang belum ada di keranjang (Tahap 2 diganti saran dari AI)
    const s = cart.length < 4 ? suggestionFor(item) : undefined;
    say(s ? `${reaction} Mau sekalian ${s.name}?` : reaction, s);
  };

  const onMenuClick = (item: MenuItem) => {
    if (soldOut.has(item.id)) { say(`Maaf kak, ${item.name} lagi habis. Coba menu lain ya.`); return; }
    if (item.has_variants || groupsFor(item).length) setSheetItem(item);
    else addToCart(item, [], 1);
  };

  const changeQty = (key: string, delta: number) =>
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + delta } : l)).filter((l) => l.quantity > 0));

  const openReview = () => {
    setPhase('review');
    say(`Ini pesanan kakak, totalnya sekitar ${formatRupiah(totals.total)}. Sudah benar?`);
  };

  const placeOrder = async () => {
    if (!cart.length) return;
    setBusy(true); setError('');
    setCaption({ text: 'Sebentar ya kak, pesanannya aku catat dulu...' });
    try {
      // jalur yang sama dengan kasir SEMAR: stok, dapur, dan jurnal mengikuti otomatis
      const o = await rpc<Order>('pos_save_order', {
        p_payload: {
          order_id: null,
          outlet_id: config.outletId,
          table_id: null,
          sales_channel: channel,
          customer_name: customerName.trim() || 'Pelanggan Gareng',
          customer_id: null,
          guest_count: 1,
          note: 'Pesanan via Gareng AI Cashier',
          open_bill: false,      // bayar dulu, baru masuk dapur
          items: cart.map((l) => ({ menu_item_id: l.item.id, quantity: l.quantity, note: '', modifier_ids: l.modifiers.map((m) => m.id) })),
        },
      });
      setOrder(o);
      setQr(await QRCode.toDataURL(`DUMMY-QRIS|${o.order_number}|${o.grand_total}`, { margin: 1, width: 640, color: { dark: '#04070D', light: '#FFFFFF' } }));
      setSecondsLeft(PAY_SECONDS);
      setPhase('paying');
      say(`Totalnya ${formatRupiah(o.grand_total)}. Silakan scan QRIS di layar ya kak.`);
    } catch (e) {
      setError(errorMessage(e));
      say('Waduh, pesanannya belum bisa dicatat. Coba lagi atau panggil kakak kasir ya.');
    } finally {
      setBusy(false);
    }
  };

  // pembayaran dummy: dicatat sebagai pembayaran QRIS sungguhan di SEMAR
  const simulatePaid = async () => {
    if (!order) return;
    setBusy(true); setError('');
    try {
      await rpc('pos_pay_order', {
        p_order_id: order.id,
        p_payments: [{ payment_method_id: config.paymentMethodId, amount: order.grand_total, reference_number: `GARENG-DUMMY-${Date.now()}` }],
      });
      setPhase('done');
      setCart([]);
      say(`Pembayaran diterima! Nomor pesanan kakak ${order.order_number}. Ditunggu ya, sedang disiapkan.`);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = useCallback(async (reason: string) => {
    if (order) {
      // order belum dibayar di-void supaya tidak menggantung di daftar order SEMAR
      await rpc('pos_void_order', { p_order_id: order.id, p_reason: reason }).catch(() => undefined);
    }
    resetAll();
  }, [order, resetAll]);

  // hitung mundur QRIS
  useEffect(() => {
    if (phase !== 'paying') return;
    if (secondsLeft <= 0) { cancelOrder('Waktu pembayaran QRIS habis (Gareng)'); return; }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, secondsLeft, cancelOrder]);

  // layar nomor pesanan -> kembali ke sambutan
  useEffect(() => {
    if (phase !== 'done') return;
    const t = setTimeout(resetAll, DONE_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [phase, resetAll]);

  // tidak ada sentuhan -> kembali ke sambutan (pelanggan pergi)
  const lastTouch = useRef(Date.now());
  useEffect(() => {
    const touch = () => { lastTouch.current = Date.now(); };
    window.addEventListener('pointerdown', touch);
    const t = setInterval(() => {
      if ((phase === 'menu' || phase === 'review') && Date.now() - lastTouch.current > IDLE_SECONDS * 1000) resetAll();
    }, 5000);
    return () => { window.removeEventListener('pointerdown', touch); clearInterval(t); };
  }, [phase, resetAll]);

  // keluar mode kiosk: ketuk logo 5x cepat (khusus staf)
  const taps = useRef<number[]>([]);
  const onBrandTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      if (window.confirm('Keluar dari mode kiosk? (khusus staf)')) { stopSpeaking(); onExit(); }
    }
  };

  const toggleMute = () => { setMuted(!muted); setMutedState(!muted); };

  // ------------------------------------------------------------ tampilan
  const header = (
    <header className="k-header">
      <button className="k-brand" onClick={onBrandTap}><b>GARENG</b> · {config.outletName}</button>
      <button className="k-icon" onClick={toggleMute} aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}>{muted ? '🔇' : '🔊'}</button>
    </header>
  );

  const errorBox = error && (
    <div className="k-error" role="alert">
      <span>{error}</span>
      <button onClick={() => setError('')} aria-label="Tutup">×</button>
    </div>
  );

  if (phase === 'welcome') {
    return (
      <div className="kiosk">
        {header}
        <div className="k-welcome">
          <Orb state={orbState} className="k-orb-hero" />
          <p className="k-hello">Halo! Aku <b>Gareng</b></p>
          <p className="k-sub">Mau makan di sini atau bawa pulang?</p>
          <div className="k-channels">
            <button className="k-channel" onClick={() => start('dine_in')}><span>🍽️</span>Makan di sini</button>
            <button className="k-channel" onClick={() => start('takeaway')}><span>🛍️</span>Bawa pulang</button>
          </div>
        </div>
        {errorBox}
      </div>
    );
  }

  if (phase === 'paying' && order) {
    const mm = Math.floor(secondsLeft / 60), ss = String(secondsLeft % 60).padStart(2, '0');
    return (
      <div className="kiosk">
        {header}
        <div className="k-pay">
          <div className="k-gareng-row">
            <Orb state={orbState} className="k-orb-mini" />
            <p className="k-bubble">{caption.text}</p>
          </div>
          <p className="k-pay-total">{formatRupiah(order.grand_total)}</p>
          <p className="k-muted">Order {order.order_number}</p>
          <div className="k-qr">
            {qr && <img src={qr} alt="QRIS pembayaran (dummy)" />}
            <span className="k-dummy">QRIS DUMMY</span>
          </div>
          <p className="k-muted">Scan dengan aplikasi bank / e-wallet · sisa waktu {mm}:{ss}</p>
          <button className="k-primary" disabled={busy} onClick={simulatePaid}>{busy ? 'Memproses...' : 'Simulasikan bayar berhasil'}</button>
          <button className="k-ghost" disabled={busy} onClick={() => cancelOrder('Dibatalkan pelanggan di Gareng')}>Batalkan pesanan</button>
        </div>
        {errorBox}
      </div>
    );
  }

  if (phase === 'done' && order) {
    return (
      <div className="kiosk" onClick={resetAll}>
        {header}
        <div className="k-welcome">
          <Orb state={orbState} className="k-orb-hero" />
          <p className="k-sub">Pembayaran diterima</p>
          <p className="k-order-no">{order.order_number}</p>
          <p className="k-hello">Terima kasih{customerName.trim() ? `, ${customerName.trim()}` : ''}!</p>
          <p className="k-muted">Pesanan sedang disiapkan. Simpan nomor ini ya.</p>
        </div>
      </div>
    );
  }

  // menu & review
  return (
    <div className="kiosk">
      {header}
      <div className="k-gareng-row">
        <Orb state={orbState} className="k-orb-mini" />
        <div className="k-bubble">
          <p>{caption.text}</p>
          {caption.suggest && phase === 'menu' && (
            <button className="k-suggest" onClick={() => onMenuClick(caption.suggest!)}>
              <Photo item={caption.suggest} />
              <span><b>{caption.suggest.name}</b><small>{tilePrice(caption.suggest)}</small></span>
              <em>+ Tambah</em>
            </button>
          )}
        </div>
      </div>

      {phase === 'menu' ? (
        <>
          <nav className="k-cats">
            <button className={categoryId === 'all' ? 'on' : ''} onClick={() => setCategoryId('all')}>Semua</button>
            {usedCategories.map((c) => (
              <button key={c.id} className={categoryId === c.id ? 'on' : ''} onClick={() => setCategoryId(c.id)}>{c.name}</button>
            ))}
          </nav>
          <main className="k-grid">
            {visibleItems.map((item) => {
              const out = soldOut.has(item.id), q = qtyOf(item.id);
              return (
                <button key={item.id} className={`k-card${out ? ' out' : ''}`} onClick={() => onMenuClick(item)}>
                  <Photo item={item} />
                  {q > 0 && <span className="k-qty">{q}</span>}
                  {out && <span className="k-out">Habis</span>}
                  <span className="k-card-name">{item.name}</span>
                  <span className="k-card-price">{tilePrice(item)}</span>
                </button>
              );
            })}
            {!visibleItems.length && <p className="k-muted">Menu belum ada. Tambahkan menu di SEMAR → Menu.</p>}
          </main>
          <footer className="k-cartbar">
            <button className="k-ghost" onClick={resetAll}>Ulang</button>
            <button className="k-primary" disabled={!cartCount} onClick={openReview}>
              {cartCount ? `Lihat pesanan (${cartCount}) · ${formatRupiah(totals.total)}` : 'Pilih menu dulu'}
            </button>
          </footer>
        </>
      ) : (
        <>
          <main className="k-review">
            <p className="k-muted">{channel === 'dine_in' ? 'Makan di sini' : 'Bawa pulang'}</p>
            {cart.map((l) => {
              const unit = priceOf(l.item) + l.modifiers.reduce((m, x) => m + Number(x.extra_price), 0);
              const parent = l.item.parent_id ? items.find((i) => i.id === l.item.parent_id) : null;
              return (
                <div key={l.key} className="k-line">
                  <Photo item={parent ?? l.item} />
                  <div className="k-line-info">
                    <b>{parent ? `${parent.name} · ${l.item.variant_name ?? l.item.name}` : l.item.name}</b>
                    {!!l.modifiers.length && <small>{l.modifiers.map((m) => m.name).join(', ')}</small>}
                    <small>{formatRupiah(unit * l.quantity)}</small>
                  </div>
                  <div className="k-stepper">
                    <button onClick={() => changeQty(l.key, -1)} aria-label="Kurangi">−</button>
                    <span>{l.quantity}</span>
                    <button onClick={() => changeQty(l.key, 1)} aria-label="Tambah">+</button>
                  </div>
                </div>
              );
            })}
            <div className="k-sum">
              <span>Subtotal</span><span>{formatRupiah(totals.subtotal)}</span>
              {totals.service > 0 && <><span>Service</span><span>{formatRupiah(totals.service)}</span></>}
              {totals.tax > 0 && <><span>Pajak</span><span>{formatRupiah(totals.tax)}</span></>}
              <b>Total</b><b>{formatRupiah(totals.total)}</b>
            </div>
            <label className="k-field">
              <span>Nama untuk dipanggil (opsional)</span>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} maxLength={30} placeholder="contoh: Budi" />
            </label>
          </main>
          <footer className="k-cartbar">
            <button className="k-ghost" onClick={() => { setPhase('menu'); say('Oke, mau tambah apa lagi kak?'); }}>Tambah menu</button>
            <button className="k-primary" disabled={busy || !cartCount} onClick={placeOrder}>{busy ? 'Mencatat...' : 'Bayar dengan QRIS'}</button>
          </footer>
        </>
      )}

      {sheetItem && (
        <ItemSheet item={sheetItem} variants={variantsOf(sheetItem)} groupsFor={groupsFor} priceOf={priceOf}
          soldOut={soldOut} onAdd={addToCart} onClose={() => setSheetItem(null)} />
      )}
      {errorBox}
    </div>
  );
}
