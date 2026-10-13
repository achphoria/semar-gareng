// Bentuk data dari database SEMAR (lihat semar-erp/app/src/lib/types.ts)

export interface Outlet {
  id: string;
  code: string;
  name: string;
}

export interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  company_id: string;
  company_name: string;
  role_code: string;
  role_name: string;
  permissions: string[];
  outlets: Outlet[];
}

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  code: string;
  name: string;
  menu_category_id: string;
  base_price: number;
  description?: string | null;
  image_url?: string | null;
  parent_id?: string | null;
  variant_name?: string | null;
  has_variants?: boolean;
  variant_sort?: number;
}

export interface Modifier {
  id: string;
  name: string;
  extra_price: number;
  sort_order: number;
  is_default?: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  min_select: number;
  max_select: number;
  mst_modifiers: Modifier[];
}

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: string;
  grand_total: number;
}

export interface CartLine {
  key: string;
  item: MenuItem;
  quantity: number;
  modifiers: Modifier[];
}

export type Channel = 'dine_in' | 'takeaway';

/** perangkat kiosk yang sudah diaktifkan staf */
export interface KioskConfig {
  outletId: string;
  outletName: string;
  paymentMethodId: string;
}
