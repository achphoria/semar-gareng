import type { MenuItem } from '../lib/types';

/** Foto menu dari SEMAR; tanpa foto tampil huruf depan nama menu */
export default function Photo({ item }: { item: MenuItem }) {
  return item.image_url
    ? <img className="k-photo" src={item.image_url} alt="" loading="lazy" />
    : <span className="k-photo k-photo-empty">{item.name.slice(0, 1).toUpperCase()}</span>;
}
