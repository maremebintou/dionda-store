import type { Lot, Product, StockLevel, StockMovement } from '../types';

export function stockKey(productId: string, formatId: string): string {
  return `${productId}:${formatId}`;
}

export function quantitiesByFormat(movements: StockMovement[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of movements) {
    const k = stockKey(m.productId, m.formatId);
    map.set(k, (map.get(k) ?? 0) + m.quantity);
  }
  return map;
}

export function quantitiesByLot(movements: StockMovement[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const m of movements) {
    if (!m.lotId) continue;
    map.set(m.lotId, (map.get(m.lotId) ?? 0) + m.quantity);
  }
  return map;
}

export function stockLevels(products: Product[], movements: StockMovement[]): StockLevel[] {
  const q = quantitiesByFormat(movements);
  return products.flatMap((p) =>
    p.formats.map((f) => {
      const quantity = q.get(stockKey(p.id, f.id)) ?? 0;
      const state: StockLevel['state'] = quantity <= 0 ? 'rupture' : quantity <= f.lowStockThreshold ? 'bas' : 'ok';
      return { productId: p.id, formatId: f.id, quantity, threshold: f.lowStockThreshold, state };
    }),
  );
}

export function daysUntil(iso: string | undefined, now = new Date()): number | undefined {
  if (!iso) return undefined;
  return Math.floor((new Date(iso).getTime() - now.getTime()) / 86_400_000);
}

export type ExpiryState = 'perime' | 'proche' | 'ok' | 'sans_date';

export function expiryState(lot: Lot, now = new Date(), warnDays = 30): ExpiryState {
  const d = daysUntil(lot.expiryDate, now);
  if (d === undefined) return 'sans_date';
  if (d < 0) return 'perime';
  if (d <= warnDays) return 'proche';
  return 'ok';
}

/**
 * Prélève une quantité sur les lots disponibles en suivant la règle FEFO
 * (premier périmé, premier sorti). Les lots périmés sont exclus.
 * Renvoie les allocations, ou undefined si le stock est insuffisant.
 */
export function allocateFEFO(
  productId: string,
  formatId: string,
  quantity: number,
  lots: Lot[],
  movements: StockMovement[],
  now = new Date(),
): { lotId?: string; quantity: number }[] | undefined {
  const byLot = quantitiesByLot(movements);
  const candidates = lots
    .filter((l) => l.productId === productId && l.formatId === formatId && expiryState(l, now) !== 'perime')
    .map((l) => ({ lot: l, available: byLot.get(l.id) ?? 0 }))
    .filter((c) => c.available > 0)
    .sort((a, b) => {
      const ea = a.lot.expiryDate ? new Date(a.lot.expiryDate).getTime() : Infinity;
      const eb = b.lot.expiryDate ? new Date(b.lot.expiryDate).getTime() : Infinity;
      return ea - eb || a.lot.receivedAt.localeCompare(b.lot.receivedAt);
    });

  const out: { lotId?: string; quantity: number }[] = [];
  let rest = quantity;
  for (const c of candidates) {
    if (rest <= 0) break;
    const take = Math.min(rest, c.available);
    out.push({ lotId: c.lot.id, quantity: take });
    rest -= take;
  }
  if (rest > 0) {
    // Stock hors lot (mouvements sans lotId, ex. ajustements)
    const total = quantitiesByFormat(movements).get(stockKey(productId, formatId)) ?? 0;
    // Solde de TOUS les lots de ce format (périmés compris) : seul le reste est hors lot.
    const inAllLots = lots
      .filter((l) => l.productId === productId && l.formatId === formatId)
      .reduce((s, l) => s + Math.max(0, byLot.get(l.id) ?? 0), 0);
    const outsideLots = Math.max(0, total - inAllLots);
    if (outsideLots >= rest) {
      out.push({ quantity: rest });
      rest = 0;
    }
  }
  return rest > 0 ? undefined : out;
}

/** Stock vendable : exclut les lots périmés. */
export function sellableQuantity(productId: string, formatId: string, lots: Lot[], movements: StockMovement[], now = new Date()): number {
  const byLot = quantitiesByLot(movements);
  const total = quantitiesByFormat(movements).get(stockKey(productId, formatId)) ?? 0;
  const expired = lots
    .filter((l) => l.productId === productId && l.formatId === formatId && expiryState(l, now) === 'perime')
    .reduce((s, l) => s + Math.max(0, byLot.get(l.id) ?? 0), 0);
  return Math.max(0, total - expired);
}
