import type { CreateInput, ID, ListQuery, ShopScoped, UpdateInput } from '../../types';
import { ServiceError, type Repository } from '../contracts';
import { uid } from '../../domain/format';
import { NS, type KeyValueStore } from './storage';

type Listener = () => void;

/** Dépôt générique persistant dans le stockage local, partitionné par boutique. */
export class LocalRepository<T extends ShopScoped> implements Repository<T> {
  private listeners = new Set<Listener>();
  private cache = new Map<string, T[]>();

  constructor(
    private readonly store: KeyValueStore,
    private readonly collection: string,
    private readonly shopId: () => ID,
    private readonly searchFields: (keyof T)[] = [],
  ) {}

  private key() {
    return `${NS}:${this.shopId()}:${this.collection}`;
  }

  /** Lecture synchrone (usage interne aux services locaux et aux hooks). */
  all(): T[] {
    const k = this.key();
    let items = this.cache.get(k);
    if (!items) {
      try {
        items = JSON.parse(this.store.getItem(k) ?? '[]') as T[];
      } catch {
        items = [];
      }
      this.cache.set(k, items);
    }
    return items;
  }

  private save(items: T[]) {
    const k = this.key();
    this.cache.set(k, items);
    this.store.setItem(k, JSON.stringify(items));
    this.emit();
  }

  emit() {
    this.listeners.forEach((l) => l());
  }

  /** Vide le cache mémoire (changement de boutique, réinitialisation). */
  invalidate() {
    this.cache.clear();
    this.emit();
  }

  async list(query?: ListQuery): Promise<T[]> {
    let items = [...this.all()];
    const s = query?.search?.trim().toLowerCase();
    if (s && this.searchFields.length) {
      items = items.filter((it) => this.searchFields.some((f) => String(it[f] ?? '').toLowerCase().includes(s)));
    }
    if (query?.filters) {
      for (const [k, v] of Object.entries(query.filters)) {
        if (v === undefined || v === '') continue;
        items = items.filter((it) => (it as Record<string, unknown>)[k] === v);
      }
    }
    return items;
  }

  async get(id: ID) {
    return this.all().find((x) => x.id === id);
  }

  /** Insertion d'une entité complète (seed, imports). */
  insertRaw(entity: T): T {
    this.save([...this.all(), entity]);
    return entity;
  }

  async create(input: CreateInput<T>): Promise<T> {
    const now = new Date().toISOString();
    const entity = { ...(input as object), id: uid(this.collection.slice(0, 3) + '_'), shopId: this.shopId(), createdAt: now, updatedAt: now } as T;
    return this.insertRaw(entity);
  }

  async update(id: ID, patch: UpdateInput<T>): Promise<T> {
    const items = this.all();
    const idx = items.findIndex((x) => x.id === id);
    if (idx < 0) throw new ServiceError('Élément introuvable.', 'not_found');
    const updated = { ...items[idx], ...(patch as object), id, shopId: items[idx].shopId, updatedAt: new Date().toISOString() } as T;
    const next = [...items];
    next[idx] = updated;
    this.save(next);
    return updated;
  }

  async remove(id: ID): Promise<void> {
    this.save(this.all().filter((x) => x.id !== id));
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}
