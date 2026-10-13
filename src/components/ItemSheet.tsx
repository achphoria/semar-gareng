import { useMemo, useState } from 'react';
import Photo from './Photo';
import { formatRupiah } from '../lib/format';
import type { MenuItem, Modifier, ModifierGroup } from '../lib/types';

interface Props {
  item: MenuItem;
  variants: MenuItem[];
  groupsFor: (item: MenuItem) => ModifierGroup[];
  priceOf: (item: MenuItem) => number;
  soldOut: Set<string>;
  onAdd: (item: MenuItem, modifiers: Modifier[], quantity: number) => void;
  onClose: () => void;
}

/** Pilih variasi (mis. ukuran) lalu tambahan (mis. level gula), sama dengan aturan menu di SEMAR */
export default function ItemSheet({ item, variants, groupsFor, priceOf, soldOut, onAdd, onClose }: Props) {
  // pilihan bawaan dari SEMAR langsung tercentang
  const defaultsFor = (v: MenuItem) => {
    const d: Record<string, string[]> = {};
    for (const g of groupsFor(v)) d[g.id] = g.mst_modifiers.filter((m) => m.is_default).map((m) => m.id).slice(0, g.max_select || undefined);
    return d;
  };
  const [variant, setVariant] = useState<MenuItem | null>(item.has_variants ? null : item);
  const [picked, setPicked] = useState<Record<string, string[]>>(() => (item.has_variants ? {} : defaultsFor(item)));
  const [qty, setQty] = useState(1);

  const groups = useMemo(() => (variant ? groupsFor(variant) : []), [variant, groupsFor]);
  const chooseVariant = (v: MenuItem) => { setVariant(v); setPicked(defaultsFor(v)); };

  const toggle = (g: ModifierGroup, m: Modifier) => setPicked((prev) => {
    const cur = prev[g.id] ?? [];
    if (cur.includes(m.id)) return { ...prev, [g.id]: cur.filter((id) => id !== m.id) };
    if (g.max_select === 1) return { ...prev, [g.id]: [m.id] };
    if (g.max_select > 0 && cur.length >= g.max_select) return prev;
    return { ...prev, [g.id]: [...cur, m.id] };
  });

  const mods = groups.flatMap((g) => g.mst_modifiers.filter((m) => (picked[g.id] ?? []).includes(m.id)));
  const missing = groups.find((g) => (picked[g.id] ?? []).length < (g.min_select || 0));
  const unit = variant ? priceOf(variant) + mods.reduce((s, m) => s + Number(m.extra_price), 0) : 0;

  return (
    <div className="k-sheet-backdrop" onClick={onClose}>
      <div className="k-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="k-sheet-head">
          <Photo item={item} />
          <div>
            <b>{item.name}</b>
            {item.description && <small>{item.description}</small>}
          </div>
          <button className="k-icon" onClick={onClose} aria-label="Tutup">×</button>
        </div>

        <div className="k-sheet-body">
          {item.has_variants && (
            <section>
              <h3>Pilih {variants.length > 1 ? 'varian' : 'menu'}</h3>
              <div className="k-options">
                {variants.map((v) => (
                  <button key={v.id} disabled={soldOut.has(v.id)} className={variant?.id === v.id ? 'on' : ''} onClick={() => chooseVariant(v)}>
                    {v.variant_name ?? v.name}<small>{soldOut.has(v.id) ? 'Habis' : formatRupiah(priceOf(v))}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {groups.map((g) => (
            <section key={g.id}>
              <h3>{g.name} <small>{g.min_select > 0 ? `wajib${g.max_select > 1 ? `, maks ${g.max_select}` : ''}` : g.max_select === 1 ? 'pilih satu' : 'opsional'}</small></h3>
              <div className="k-options">
                {[...g.mst_modifiers].sort((a, b) => a.sort_order - b.sort_order).map((m) => (
                  <button key={m.id} className={(picked[g.id] ?? []).includes(m.id) ? 'on' : ''} onClick={() => toggle(g, m)}>
                    {m.name}{Number(m.extra_price) > 0 && <small>+{formatRupiah(m.extra_price)}</small>}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="k-sheet-foot">
          <div className="k-stepper">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Kurangi">−</button>
            <span>{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} aria-label="Tambah">+</button>
          </div>
          <button className="k-primary" disabled={!variant || !!missing} onClick={() => variant && onAdd(variant, mods, qty)}>
            {!variant ? 'Pilih varian dulu' : missing ? `Pilih ${missing.name}` : `Tambah · ${formatRupiah(unit * qty)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
