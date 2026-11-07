import type { FCFA, ID, ISODate, ShopScoped } from './common';
import type { ProductVisual } from './catalog';

export type PromotionType = 'pourcentage' | 'montant_fixe' | 'livraison_offerte';

export interface Promotion extends ShopScoped {
  code: string;
  label: string;
  type: PromotionType;
  value: number; // % ou FCFA selon le type
  minSubtotal?: FCFA;
  startsAt?: ISODate;
  endsAt?: ISODate;
  usageLimit?: number;
  usageCount: number;
  active: boolean;
}

export interface BundleItem {
  productId: ID;
  formatId: ID;
  quantity: number;
}

/** Coffret composé de plusieurs produits. */
export interface Bundle extends ShopScoped {
  name: string;
  slug: string;
  description: string;
  items: BundleItem[];
  price: FCFA;
  active: boolean;
  visual: ProductVisual;
}
