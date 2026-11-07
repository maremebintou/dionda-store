import type {
  AuthSession,
  Bundle,
  Category,
  CreateInput,
  Customer,
  DeliveryZone,
  ID,
  Lot,
  Order,
  OrderLine,
  OrderStatus,
  Product,
  Promotion,
  Region,
  Role,
  Shop,
  ShopScoped,
  ShopSettings,
  StockMovement,
  Supplier,
} from '../../types';
import { ServiceError, type CheckoutInput, type Services } from '../contracts';
import { LocalRepository } from './LocalRepository';
import { NS, type KeyValueStore } from './storage';
import { computeTotals } from '../../domain/pricing';
import { allocateFEFO } from '../../domain/stock';
import { uid } from '../../domain/format';
import {
  DEFAULT_SHOP_ID,
  DEMO_CUSTOMERS,
  SEED_BUNDLES,
  SEED_CATEGORIES,
  SEED_PRODUCTS,
  SEED_PROMOTIONS,
  SEED_REGIONS,
  SEED_SUPPLIERS,
  SEED_ZONES,
  defaultSettings,
} from '../../data/seed';

type Listener = () => void;

/** Photos par défaut des versions précédentes (remplacées automatiquement par les nouvelles). */
const PREVIOUS_SEED_PHOTOS: Record<string, string[]> = {
  'prd_arachide-en-poudre-de-kaolack': ['arachide.jpg'],
  'prd_pate-d-arachide': ['arachide.jpg'],
  'prd_cafe-touba': ['cafe-touba-verre.jpg'],
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée',
};

export interface LocalServices extends Services {
  repos: {
    products: LocalRepository<Product>;
    categories: LocalRepository<Category>;
    regions: LocalRepository<Region>;
    suppliers: LocalRepository<Supplier>;
    lots: LocalRepository<Lot>;
    movements: LocalRepository<StockMovement>;
    customers: LocalRepository<Customer>;
    orders: LocalRepository<Order>;
    zones: LocalRepository<DeliveryZone>;
    promotions: LocalRepository<Promotion>;
    bundles: LocalRepository<Bundle>;
  };
  placeOrderSync(input: CheckoutInput, at?: string): Order;
}

export function createLocalServices(store: KeyValueStore, now: () => Date = () => new Date()): LocalServices {
  const shopsKey = `${NS}:shops`;
  const currentKey = `${NS}:currentShop`;
  const sessionKey = `${NS}:session`;

  const readShops = (): Shop[] => {
    try {
      return JSON.parse(store.getItem(shopsKey) ?? '[]') as Shop[];
    } catch {
      return [];
    }
  };
  if (!readShops().length) {
    const t = now().toISOString();
    store.setItem(shopsKey, JSON.stringify([{ id: DEFAULT_SHOP_ID, slug: 'dionda-store', name: 'DIONDA STORE', ownerUserId: 'usr_demo', planId: 'plan_demo', status: 'essai', createdAt: t, updatedAt: t } satisfies Shop]));
  }
  let currentShopId = store.getItem(currentKey) ?? DEFAULT_SHOP_ID;
  if (!readShops().some((s) => s.id === currentShopId)) currentShopId = readShops()[0].id;
  const shopId = () => currentShopId;

  const r = <T extends ShopScoped>(name: string, fields: (keyof T)[] = []) => new LocalRepository<T>(store, name, shopId, fields);
  const repos = {
    products: r<Product>('products', ['name', 'slug', 'shortDescription']),
    categories: r<Category>('categories', ['name']),
    regions: r<Region>('regions', ['name', 'country']),
    suppliers: r<Supplier>('suppliers', ['name', 'locality']),
    lots: r<Lot>('lots', ['lotNumber']),
    movements: r<StockMovement>('movements', ['reason']),
    customers: r<Customer>('customers', ['firstName', 'lastName', 'phone', 'city']),
    orders: r<Order>('orders', ['number', 'customerName', 'customerPhone']),
    zones: r<DeliveryZone>('zones', ['name']),
    promotions: r<Promotion>('promotions', ['code', 'label']),
    bundles: r<Bundle>('bundles', ['name']),
  };
  const allRepos = Object.values(repos) as unknown as LocalRepository<ShopScoped>[];

  const shopListeners = new Set<Listener>();
  const settingsListeners = new Set<Listener>();
  const authListeners = new Set<Listener>();
  const settingsKey = () => `${NS}:${currentShopId}:settings`;

  function stamp<T extends object>(o: T, at: string) {
    return { ...o, shopId: currentShopId, createdAt: at, updatedAt: at };
  }

  // ---------------- Commandes ----------------
  function nextOrderNumber(): string {
    const k = `${NS}:${currentShopId}:orderSeq`;
    const n = Number(store.getItem(k) ?? '0') + 1;
    store.setItem(k, String(n));
    return `DS-${now().getFullYear()}-${String(n).padStart(5, '0')}`;
  }

  function placeOrderSync(input: CheckoutInput, at?: string): Order {
    const when = at ?? now().toISOString();
    const c = input.customer;
    const missing = (['firstName', 'lastName', 'phone', 'address', 'city'] as const).filter((k) => !String(c[k] ?? '').trim());
    if (missing.length) throw new ServiceError('Merci de compléter vos coordonnées (nom, prénom, téléphone, adresse, ville).', 'validation');
    if (!/^[+\d\s().-]{7,}$/.test(c.phone.trim())) throw new ServiceError('Numéro de téléphone invalide.', 'validation');
    if (!input.lines.length) throw new ServiceError('Votre panier est vide.', 'validation');
    const zone = repos.zones.all().find((z) => z.id === input.zoneId && z.active);
    if (!zone) throw new ServiceError('Merci de choisir une zone de livraison.', 'validation');

    const products = repos.products.all();
    const bundles = repos.bundles.all();
    const totals = computeTotals({ lines: input.lines, products, bundles, promotions: repos.promotions.all(), promoCode: input.promoCode, zone, now: new Date(when) });
    if (input.promoCode?.trim() && totals.promoError) throw new ServiceError(totals.promoError, 'validation');
    const unavailable = totals.lines.find((l) => !l.available);
    if (unavailable) throw new ServiceError(`« ${unavailable.name} » n'est plus disponible.`, 'validation');
    if (totals.lines.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1)) throw new ServiceError('Quantité invalide.', 'validation');

    // Allocation des lots (FEFO), ligne par ligne, en tenant compte des prélèvements précédents.
    const movements = [...repos.movements.all()];
    const lots = repos.lots.all();
    const lines: OrderLine[] = totals.lines.map((pl) => {
      const needs =
        pl.line.kind === 'produit'
          ? [{ productId: pl.line.productId, formatId: pl.line.formatId, quantity: pl.quantity }]
          : (bundles.find((b) => b.id === (pl.line as { bundleId: string }).bundleId)?.items ?? []).map((it) => ({ ...it, quantity: it.quantity * pl.quantity }));
      const allocations = needs.flatMap((need) => {
        const alloc = allocateFEFO(need.productId, need.formatId, need.quantity, lots, movements, new Date(when));
        if (!alloc) {
          const p = products.find((x) => x.id === need.productId);
          const f = p?.formats.find((x) => x.id === need.formatId);
          throw new ServiceError(`Stock insuffisant pour « ${p?.name ?? 'produit'} — ${f?.label ?? ''} ».`, 'stock');
        }
        return alloc.map((a) => {
          movements.push({ id: 'tmp', shopId: '', createdAt: '', updatedAt: '', productId: need.productId, formatId: need.formatId, lotId: a.lotId, type: 'sortie', quantity: -a.quantity, reason: '', at: when, by: '' });
          return { productId: need.productId, formatId: need.formatId, lotId: a.lotId, quantity: a.quantity };
        });
      });
      return {
        kind: pl.line.kind,
        refId: pl.line.kind === 'produit' ? pl.line.productId : pl.line.bundleId,
        formatId: pl.line.kind === 'produit' ? pl.line.formatId : undefined,
        name: pl.name,
        formatLabel: pl.formatLabel,
        unitPrice: pl.unitPrice,
        quantity: pl.quantity,
        lineTotal: pl.lineTotal,
        allocations,
      };
    });

    // Client : retrouvé par téléphone, sinon créé.
    const phoneKey = c.phone.replace(/\D/g, '');
    let customer = repos.customers.all().find((x) => x.phone.replace(/\D/g, '') === phoneKey);
    if (!customer) {
      customer = repos.customers.insertRaw(stamp({ id: uid('cus_'), firstName: c.firstName.trim(), lastName: c.lastName.trim(), phone: c.phone.trim(), email: c.email?.trim() ?? '', address: c.address.trim(), city: c.city.trim(), zoneId: zone.id, notes: '' }, when) as Customer);
    }

    const order: Order = stamp(
      {
        id: uid('ord_'),
        number: nextOrderNumber(),
        customerId: customer.id,
        customerName: `${c.firstName.trim()} ${c.lastName.trim()}`,
        customerPhone: c.phone.trim(),
        lines,
        subtotal: totals.subtotal,
        discount: totals.discount,
        deliveryFee: totals.deliveryFee,
        total: totals.total,
        promotionCode: totals.promotion?.code,
        delivery: { zoneId: zone.id, address: c.address.trim(), city: c.city.trim(), status: 'a_planifier' as const, courier: '' },
        paymentMethod: input.paymentMethod,
        paymentStatus: 'non_paye' as const,
        status: 'en_attente' as const,
        history: [{ at: when, status: 'en_attente' as const, note: 'Commande de démonstration créée depuis la boutique.' }],
        note: input.note?.trim() ?? '',
        isDemo: true as const,
      },
      when,
    );
    repos.orders.insertRaw(order);

    for (const line of lines) {
      for (const a of line.allocations) {
        repos.movements.insertRaw(stamp({ id: uid('mov_'), productId: a.productId, formatId: a.formatId, lotId: a.lotId, type: 'sortie' as const, quantity: -a.quantity, reason: `Commande ${order.number}`, orderId: order.id, at: when, by: 'Boutique' }, when) as StockMovement);
      }
    }
    if (totals.promotion) {
      const p = totals.promotion;
      void repos.promotions.update(p.id, { usageCount: p.usageCount + 1 });
    }
    return order;
  }

  function updateStatusSync(orderId: ID, status: OrderStatus, note = '', at?: string): Order {
    const order = repos.orders.all().find((o) => o.id === orderId);
    if (!order) throw new ServiceError('Commande introuvable.', 'not_found');
    if (order.status === 'annulee') throw new ServiceError('Une commande annulée ne peut plus changer de statut.', 'validation');
    if (order.status === status) return order;
    const when = at ?? now().toISOString();
    if (status === 'annulee') {
      for (const line of order.lines) {
        for (const a of line.allocations) {
          repos.movements.insertRaw(stamp({ id: uid('mov_'), productId: a.productId, formatId: a.formatId, lotId: a.lotId, type: 'retour' as const, quantity: a.quantity, reason: `Annulation ${order.number}`, orderId: order.id, at: when, by: 'Administration' }, when) as StockMovement);
        }
      }
    }
    const patch: Partial<Order> = {
      status,
      history: [...order.history, { at: when, status, note: note || `Statut : ${STATUS_LABEL[status]}` }],
    };
    if (status === 'livree') patch.delivery = { ...order.delivery, status: 'livree' };
    if (status === 'expediee' && order.delivery.status === 'a_planifier') patch.delivery = { ...order.delivery, status: 'en_cours' };
    if (status === 'annulee' && order.paymentStatus === 'paye_simule') patch.paymentStatus = 'rembourse_simule';
    if (status === 'livree' && order.paymentMethod === 'demo_paiement_livraison') patch.paymentStatus = 'paye_simule';
    // LocalRepository.update ne contient aucun await : l'écriture est effectuée immédiatement.
    void repos.orders.update(orderId, patch);
    return repos.orders.all().find((o) => o.id === orderId) as Order;
  }


  /** Lot de démonstration + entrée de stock initiale pour chaque format d'un produit de démo. */
  function seedStockFor(p: (typeof SEED_PRODUCTS)[number], iso: (days: number) => string, at: string) {
    for (const f of p.formats) {
      const n = `${p.slug}-${f.id.split('-f').pop()}`;
      if (repos.lots.all().some((l) => l.productId === p.id && l.formatId === f.id)) continue; // stock déjà présent : jamais en double
      const artisan = p.categoryId === 'cat_artisanat';
      const qty = artisan ? 6 : p.slug === 'guedj' && f.id.endsWith('f2') ? 4 : 40;
      const expiryDays = !p.traceability.expiryTracking ? undefined : p.slug === 'moringa-en-poudre' && f.id.endsWith('f1') ? 20 : 180;
      const supplierId = artisan ? 'sup_exemple_3' : p.origin.regionId === 'reg_ziguinchor' ? 'sup_exemple_2' : p.origin.regionId === 'reg_kedougou' ? 'sup_exemple_1' : undefined;
      const lotNo = `L-DEMO-${String(SEED_PRODUCTS.indexOf(p) + 1).padStart(2, '0')}${f.id.split('-f').pop()}`;
      const lot: Lot = stamp({ id: `lot_${n}`, productId: p.id, formatId: f.id, lotNumber: lotNo, supplierId, receivedAt: iso(-25), productionDate: undefined, expiryDate: expiryDays === undefined ? undefined : iso(expiryDays), storageConditions: p.traceability.storageConditions, notes: 'Lot de démonstration.' }, at) as Lot;
      repos.lots.insertRaw(lot);
      repos.movements.insertRaw(stamp({ id: `mov_seed_${n}`, productId: p.id, formatId: f.id, lotId: lot.id, type: 'entree' as const, quantity: qty, reason: 'Réception initiale (démonstration)', at: iso(-25), by: 'Démonstration' }, at) as StockMovement);
    }
  }

  /**
   * Met à niveau une boutique de démonstration créée par une version antérieure :
   * photos des produits, nouveaux produits du catalogue (avec leur stock initial).
   * Les modifications faites dans l'administration sont conservées.
   */
  function migrateDemoData() {
    if (!repos.categories.all().some((c) => c.id === 'cat_condiments')) return; // boutique sans données de démo
    const t0 = now();
    const iso = (days: number) => new Date(t0.getTime() + days * 86_400_000).toISOString();
    const at = t0.toISOString();
    const existing = repos.products.all();
    for (const seedP of SEED_PRODUCTS) {
      const cur = existing.find((x) => x.id === seedP.id);
      if (!cur) {
        repos.products.insertRaw(stamp({ ...seedP, publishedAt: at }, at) as Product);
        seedStockFor(seedP, iso, at);
        continue;
      }
      // La photo n'est remplacée que si elle vaut encore une valeur par défaut d'une version précédente
      // (jamais si l'administration a choisi une autre photo).
      const seedPhoto = seedP.visual.photo ?? '';
      const previousDefaults = ['', `${cur.slug}.jpg`, ...(PREVIOUS_SEED_PHOTOS[cur.id] ?? [])];
      const visual = { ...cur.visual };
      if ((cur.visual.photo === undefined || previousDefaults.includes(cur.visual.photo)) && cur.visual.photo !== seedPhoto && seedPhoto) visual.photo = seedPhoto;
      // Photos supplémentaires : ajoutées une seule fois (champ absent des versions précédentes), sans doublon avec la photo principale.
      if (cur.visual.gallery === undefined) visual.gallery = (seedP.visual.gallery ?? []).filter((g) => g !== visual.photo);
      if (visual.photo !== cur.visual.photo || visual.gallery !== cur.visual.gallery) void repos.products.update(cur.id, { visual });
    }
    // Accueil (1er novembre 2026) : nététou retiré de la sélection, miel ajouté — appliqué une seule fois.
    const patchKey = `${NS}:${currentShopId}:patch-accueil-2026-11-01`;
    if (!store.getItem(patchKey)) {
      for (const [id, featured] of [['prd_netetou-traditionnel-sachet', false], ['prd_netetou-de-kedougou', false], ['prd_miel-naturel', true]] as const) {
        if (repos.products.all().some((x) => x.id === id)) void repos.products.update(id, { featured });
      }
      store.setItem(patchKey, t0.toISOString());
    }
    // 7 novembre 2026 : « Nététou de Kédougou » retiré du catalogue (archivé, les commandes passées restent intactes).
    const netetouKey = `${NS}:${currentShopId}:patch-netetou-2026-11-07`;
    if (!store.getItem(netetouKey)) {
      if (repos.products.all().some((x) => x.id === 'prd_netetou-de-kedougou')) void repos.products.update('prd_netetou-de-kedougou', { status: 'archive' });
      store.setItem(netetouKey, t0.toISOString());
    }
    // 7 novembre 2026 : « Bissap » renommé « Bissap rouge » (seulement si l'administration n'a pas changé le nom).
    const bissapKey = `${NS}:${currentShopId}:patch-bissap-rouge-2026-11-07`;
    if (!store.getItem(bissapKey)) {
      const b = repos.products.all().find((x) => x.id === 'prd_bissap');
      if (b && b.name === 'Bissap') void repos.products.update('prd_bissap', { name: 'Bissap rouge', shortDescription: b.shortDescription === 'Calices séchés d’hibiscus.' ? 'Calices séchés d’hibiscus rouge.' : b.shortDescription });
      store.setItem(bissapKey, t0.toISOString());
    }
    for (const b of repos.bundles.all()) {
      if (b.visual.photo && /^coffret-.*\.jpg$/.test(b.visual.photo) && SEED_BUNDLES.some((x) => x.id === b.id)) void repos.bundles.update(b.id, { visual: { ...b.visual, photo: '' } });
    }
  }

  // ---------------- Seed ----------------
  function seedCurrentShop(withDemoData: boolean) {
    const seededKey = `${NS}:${currentShopId}:seeded`;
    if (store.getItem(seededKey)) return;
    const t0 = now();
    const iso = (days: number) => new Date(t0.getTime() + days * 86_400_000).toISOString();
    const at = iso(-30);
    if (withDemoData) {
      SEED_CATEGORIES.forEach((x) => repos.categories.insertRaw(stamp(x, at) as Category));
      SEED_REGIONS.forEach((x) => repos.regions.insertRaw(stamp(x, at) as Region));
      SEED_SUPPLIERS.forEach((x) => repos.suppliers.insertRaw(stamp(x, at) as Supplier));
      SEED_PRODUCTS.forEach((x) => repos.products.insertRaw(stamp({ ...x, publishedAt: at }, at) as Product));
      SEED_ZONES.forEach((x) => repos.zones.insertRaw(stamp(x, at) as DeliveryZone));
      SEED_PROMOTIONS.forEach((x) => repos.promotions.insertRaw(stamp(x, at) as Promotion));
      SEED_BUNDLES.forEach((x) => repos.bundles.insertRaw(stamp(x, at) as Bundle));

      // Un lot par format + cas particuliers (lot proche de la date limite, lot périmé, stock bas).
      SEED_PRODUCTS.forEach((p) => seedStockFor(p, iso, at));
      const expired: Lot = stamp({ id: 'lot_perime', productId: 'prd_bissap', formatId: 'bissap-f2', lotNumber: 'L-DEMO-PERIME', receivedAt: iso(-200), expiryDate: iso(-20), storageConditions: 'Au sec', notes: 'Lot périmé de démonstration : exclu de la vente, à retirer.' }, at) as Lot;
      repos.lots.insertRaw(expired);
      repos.movements.insertRaw(stamp({ id: 'mov_seed_perime', productId: 'prd_bissap', formatId: 'bissap-f2', lotId: expired.id, type: 'entree' as const, quantity: 5, reason: 'Réception ancienne (démonstration)', at: iso(-200), by: 'Démonstration' }, at) as StockMovement);

      // Commandes de démonstration réparties sur 14 jours.
      const plan: [number, number, string[], OrderStatus][] = [
        [-13, 0, ['prd_bissap:bissap-f1:3', 'prd_fonio:fonio-f1:1'], 'livree'],
        [-12, 1, ['prd_guedj:guedj-f1:1', 'prd_netetou-traditionnel-sachet:netetou-traditionnel-sachet-f2:2'], 'livree'],
        [-10, 2, ['bundle:bnd_saveurs:1', 'prd_miel-naturel:miel-naturel-f2:1'], 'livree'],
        [-9, 3, ['prd_huile-de-palme-de-ziguinchor:huile-de-palme-de-ziguinchor-f2:2'], 'livree'],
        [-7, 4, ['prd_pate-d-arachide:pate-d-arachide-f2:2', 'prd_brisure-de-mil:brisure-de-mil-f2:1'], 'annulee'],
        [-6, 0, ['prd_poudre-de-baobab:poudre-de-baobab-f2:2', 'prd_bissap:bissap-f2:2'], 'livree'],
        [-4, 1, ['bundle:bnd_matin:2'], 'expediee'],
        [-3, 3, ['prd_netetou-traditionnel-sachet:netetou-traditionnel-sachet-f2:2', 'prd_sesame-du-mali:sesame-du-mali-f1:1'], 'en_preparation'],
        [-2, 2, ['prd_moringa-en-poudre:moringa-en-poudre-f1:1', 'prd_fonio:fonio-f2:2'], 'confirmee'],
        [-1, 4, ['prd_pagne-tisse-exemple:pagne-tisse-exemple-f1:1'], 'en_attente'],
        [0, 0, ['prd_bissap:bissap-f1:2', 'prd_guedj:guedj-f2:1'], 'en_attente'],
      ];
      for (const [day, ci, items, status] of plan) {
        const c = DEMO_CUSTOMERS[ci];
        const when = new Date(t0.getTime() + day * 86_400_000 - (ci + 2) * 3_600_000).toISOString();
        const order = placeOrderSync(
          {
            customer: c,
            zoneId: c.zone,
            paymentMethod: ci % 2 ? 'demo_mobile_money' : 'demo_paiement_livraison',
            lines: items.map((s) => {
              const [a, b, q] = s.split(':');
              return a === 'bundle' ? { kind: 'coffret' as const, bundleId: b, quantity: Number(q) } : { kind: 'produit' as const, productId: a, formatId: b, quantity: Number(q) };
            }),
          },
          when,
        );
        const flow: OrderStatus[] = ['confirmee', 'en_preparation', 'expediee', 'livree'];
        if (status === 'annulee') updateStatusSync(order.id, 'annulee', 'Annulée à la demande du client (démo).', when);
        else for (const s of flow.slice(0, flow.indexOf(status as OrderStatus) + 1)) updateStatusSync(order.id, s, '', when);
      }
    }
    store.setItem(settingsKey(), JSON.stringify(defaultSettings(currentShopId, readShops().find((s) => s.id === currentShopId)?.name)));
    store.setItem(seededKey, now().toISOString());
  }

  seedCurrentShop(true);

  // Mise à jour des données déjà enregistrées dans ce navigateur (versions précédentes du prototype).
  migrateDemoData();

  const services: LocalServices = {
    ...repos,
    repos,
    placeOrderSync,
    orderService: {
      async placeOrder(input, options) {
        return placeOrderSync(input, options?.at);
      },
      async updateStatus(id, status, note) {
        updateStatusSync(id, status, note);
        return (await repos.orders.get(id)) as Order;
      },
      async updateDelivery(id, patch) {
        const o = await repos.orders.get(id);
        if (!o) throw new ServiceError('Commande introuvable.', 'not_found');
        return repos.orders.update(id, { delivery: { ...o.delivery, ...patch } });
      },
    },
    inventory: {
      async recordMovement(input: CreateInput<StockMovement>) {
        if (!Number.isFinite(input.quantity) || input.quantity === 0) throw new ServiceError('La quantité doit être différente de zéro.', 'validation');
        const signed = input.type === 'entree' || input.type === 'retour' ? Math.abs(input.quantity) : input.type === 'ajustement' ? input.quantity : -Math.abs(input.quantity);
        return repos.movements.create({ ...input, quantity: signed });
      },
      async receiveLot(lot, quantity, by) {
        if (!(quantity > 0)) throw new ServiceError('La quantité reçue doit être positive.', 'validation');
        if (!lot.lotNumber.trim()) throw new ServiceError('Le numéro de lot est obligatoire.', 'validation');
        const created = await repos.lots.create(lot);
        await repos.movements.create({ productId: lot.productId, formatId: lot.formatId, lotId: created.id, type: 'entree', quantity, reason: `Réception du lot ${lot.lotNumber}`, at: lot.receivedAt, by });
        return created;
      },
    },
    settings: {
      async get() {
        try {
          return { ...defaultSettings(currentShopId), ...(JSON.parse(store.getItem(settingsKey()) ?? '{}') as Partial<ShopSettings>) };
        } catch {
          return defaultSettings(currentShopId);
        }
      },
      async update(patch) {
        const next = { ...(await services.settings.get()), ...patch, shopId: currentShopId };
        store.setItem(settingsKey(), JSON.stringify(next));
        settingsListeners.forEach((l) => l());
        return next;
      },
      subscribe(l) {
        settingsListeners.add(l);
        return () => void settingsListeners.delete(l);
      },
    },
    auth: {
      isSimulated: true,
      getSession() {
        try {
          const s = JSON.parse(store.getItem(sessionKey) ?? 'null') as AuthSession | null;
          return s && s.shopId === currentShopId ? s : null;
        } catch {
          return null;
        }
      },
      async signIn(email: string, role: Role) {
        if (!/^\S+@\S+\.\S+$/.test(email.trim())) throw new ServiceError('Adresse e-mail invalide.', 'validation');
        const s: AuthSession = { user: { id: 'usr_demo', email: email.trim(), displayName: email.split('@')[0] }, shopId: currentShopId, role, isSimulated: true, startedAt: now().toISOString() };
        store.setItem(sessionKey, JSON.stringify(s));
        authListeners.forEach((l) => l());
        return s;
      },
      async signOut() {
        store.removeItem(sessionKey);
        authListeners.forEach((l) => l());
      },
      subscribe(l) {
        authListeners.add(l);
        return () => void authListeners.delete(l);
      },
    },
    shops: {
      async list() {
        return readShops();
      },
      current() {
        return readShops().find((s) => s.id === currentShopId) as Shop;
      },
      async create(name, { withDemoData }) {
        if (!name.trim()) throw new ServiceError('Le nom de la boutique est obligatoire.', 'validation');
        const t = now().toISOString();
        const shop: Shop = { id: uid('shop_'), slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: name.trim(), ownerUserId: 'usr_demo', planId: 'plan_demo', status: 'essai', createdAt: t, updatedAt: t };
        store.setItem(shopsKey, JSON.stringify([...readShops(), shop]));
        const prev = currentShopId;
        currentShopId = shop.id;
        allRepos.forEach((rp) => rp.invalidate());
        seedCurrentShop(withDemoData);
        currentShopId = prev;
        allRepos.forEach((rp) => rp.invalidate());
        shopListeners.forEach((l) => l());
        return shop;
      },
      switchTo(id) {
        if (!readShops().some((s) => s.id === id)) throw new ServiceError('Boutique introuvable.', 'not_found');
        currentShopId = id;
        store.setItem(currentKey, id);
        allRepos.forEach((rp) => rp.invalidate());
        shopListeners.forEach((l) => l());
        settingsListeners.forEach((l) => l());
        authListeners.forEach((l) => l());
      },
      async resetCurrent() {
        const prefix = `${NS}:${currentShopId}:`;
        store.keys().filter((k) => k.startsWith(prefix)).forEach((k) => store.removeItem(k));
        allRepos.forEach((rp) => rp.invalidate());
        seedCurrentShop(true);
        allRepos.forEach((rp) => rp.invalidate());
        shopListeners.forEach((l) => l());
        settingsListeners.forEach((l) => l());
      },
      subscribe(l) {
        shopListeners.add(l);
        return () => void shopListeners.delete(l);
      },
    },
    media: {
      available: false,
      async upload() {
        throw new ServiceError("Le stockage d'images sera disponible avec l'API (phase SaaS).", 'not_available');
      },
    },
    payment: {
      available: false,
      async createPayment() {
        throw new ServiceError('Le paiement en ligne sera disponible avec l’API (phase SaaS).', 'not_available');
      },
    },
  };
  return services;
}
