/**
 * Implémentation HTTP prévue pour l'API NestJS (phase SaaS).
 * NON UTILISÉE dans la phase frontend : elle n'a jamais été testée contre un serveur.
 *
 * Conventions attendues côté API :
 *   GET    /api/shops/:shopId/:collection?search=&page=&pageSize=&sort=
 *   GET    /api/shops/:shopId/:collection/:id
 *   POST   /api/shops/:shopId/:collection
 *   PATCH  /api/shops/:shopId/:collection/:id
 *   DELETE /api/shops/:shopId/:collection/:id
 * Authentification : jeton d'accès court (Authorization: Bearer) + rafraîchissement
 * par cookie httpOnly ; l'isolation par boutique est contrôlée côté serveur.
 */
import type { ApiErrorBody, CollectionName, CreateInput, ID, ListQuery, Paginated, ShopScoped, UpdateInput } from '../../types';
import { COLLECTIONS } from '../../types';
import { ServiceError, type Repository } from '../contracts';

export interface HttpConfig {
  baseUrl: string; // ex. https://api.dionda.sn
  getShopId: () => ID;
  getAccessToken: () => string | null;
}

export class HttpClient {
  constructor(private readonly config: HttpConfig) {}

  async request<R>(method: string, path: string, body?: unknown): Promise<R> {
    const token = this.config.getAccessToken();
    const res = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ statusCode: res.status, message: res.statusText }))) as ApiErrorBody;
      const msg = Array.isArray(err.message) ? err.message.join(' ') : err.message;
      const code = res.status === 403 || res.status === 401 ? 'forbidden' : res.status === 404 ? 'not_found' : res.status === 409 ? 'stock' : 'validation';
      throw new ServiceError(msg, code);
    }
    return res.status === 204 ? (undefined as R) : ((await res.json()) as R);
  }

  shopPath(collection: CollectionName, id?: ID) {
    return `/api/shops/${encodeURIComponent(this.config.getShopId())}/${COLLECTIONS[collection]}${id ? `/${encodeURIComponent(id)}` : ''}`;
  }
}

export class HttpRepository<T extends ShopScoped> implements Repository<T> {
  private listeners = new Set<() => void>();
  constructor(private readonly http: HttpClient, private readonly collection: CollectionName) {}

  async list(query: ListQuery = {}): Promise<T[]> {
    const params = new URLSearchParams();
    if (query.search) params.set('search', query.search);
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    if (query.sort) params.set('sort', query.sort);
    for (const [k, v] of Object.entries(query.filters ?? {})) if (v !== undefined) params.set(k, String(v));
    const page = await this.http.request<Paginated<T>>('GET', `${this.http.shopPath(this.collection)}?${params}`);
    return page.items;
  }
  get(id: ID) {
    return this.http.request<T>('GET', this.http.shopPath(this.collection, id));
  }
  async create(input: CreateInput<T>) {
    const r = await this.http.request<T>('POST', this.http.shopPath(this.collection), input);
    this.emit();
    return r;
  }
  async update(id: ID, patch: UpdateInput<T>) {
    const r = await this.http.request<T>('PATCH', this.http.shopPath(this.collection, id), patch);
    this.emit();
    return r;
  }
  async remove(id: ID) {
    await this.http.request<void>('DELETE', this.http.shopPath(this.collection, id));
    this.emit();
  }
  subscribe(l: () => void) {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  }
  private emit() {
    this.listeners.forEach((l) => l());
  }
}
