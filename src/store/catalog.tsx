import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { services } from '../app/services';
import { useCollection } from '../app/hooks';
import type { Bundle, Category, DeliveryZone, Lot, Product, Promotion, Region, StockMovement, Supplier } from '../types';
import { sellableQuantity } from '../domain/stock';

export interface CatalogData {
  allProducts: Product[];
  products: Product[]; // publiés
  categories: Category[];
  regions: Region[];
  suppliers: Supplier[];
  bundles: Bundle[];
  zones: DeliveryZone[];
  promotions: Promotion[];
  lots: Lot[];
  movements: StockMovement[];
  available: (productId: string, formatId: string) => number;
  bundleAvailable: (bundleId: string) => number;
  category: (id?: string) => Category | undefined;
  region: (id?: string) => Region | undefined;
  supplier: (id?: string) => Supplier | undefined;
}

const Ctx = createContext<CatalogData | null>(null);

export function CatalogProvider({ children }: { children?: ReactNode }) {
  const allProducts = useCollection(services.products);
  const categories = useCollection(services.categories);
  const regions = useCollection(services.regions);
  const suppliers = useCollection(services.suppliers);
  const bundles = useCollection(services.bundles);
  const zones = useCollection(services.zones);
  const promotions = useCollection(services.promotions);
  const lots = useCollection(services.lots);
  const movements = useCollection(services.movements);

  const value = useMemo<CatalogData>(() => {
    const visibleCats = new Set(categories.filter((c) => c.visible).map((c) => c.id));
    const products = allProducts.filter((p) => p.status === 'publie' && visibleCats.has(p.categoryId));
    const cache = new Map<string, number>();
    const available = (productId: string, formatId: string) => {
      const k = `${productId}:${formatId}`;
      if (!cache.has(k)) cache.set(k, sellableQuantity(productId, formatId, lots, movements));
      return cache.get(k) as number;
    };
    return {
      allProducts,
      products,
      categories: [...categories].sort((a, b) => a.order - b.order),
      regions,
      suppliers,
      bundles,
      zones,
      promotions,
      lots,
      movements,
      available,
      bundleAvailable: (id) => {
        const b = bundles.find((x) => x.id === id);
        if (!b || !b.items.length) return 0;
        return Math.min(...b.items.map((it) => Math.floor(available(it.productId, it.formatId) / it.quantity)));
      },
      category: (id) => categories.find((c) => c.id === id),
      region: (id) => regions.find((r) => r.id === id),
      supplier: (id) => suppliers.find((s) => s.id === id),
    };
  }, [allProducts, categories, regions, suppliers, bundles, zones, promotions, lots, movements]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog(): CatalogData {
  const c = useContext(Ctx);
  if (!c) throw new Error('CatalogProvider manquant');
  return c;
}
