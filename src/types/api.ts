/**
 * Contrats d'échange avec la future API NestJS.
 * Les DTO reprennent les types du domaine ; seules les métadonnées de pagination
 * et les erreurs sont spécifiques au transport HTTP.
 */
export interface ListQuery {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: string; // ex. "-createdAt"
  filters?: Record<string, string | number | boolean | undefined>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}

/** Ressources REST prévues : /api/shops/:shopId/<collection> */
export const COLLECTIONS = {
  products: 'products',
  categories: 'categories',
  regions: 'regions',
  suppliers: 'suppliers',
  lots: 'lots',
  movements: 'stock-movements',
  customers: 'customers',
  orders: 'orders',
  zones: 'delivery-zones',
  promotions: 'promotions',
  bundles: 'bundles',
} as const;

export type CollectionName = keyof typeof COLLECTIONS;
