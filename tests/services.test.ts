import { describe, expect, test } from 'bun:test';
import { createLocalServices } from '../src/services/local';
import { MemoryStore } from '../src/services/local/storage';
import { computeTotals, checkPromotion } from '../src/domain/pricing';
import { allocateFEFO, stockLevels, sellableQuantity, expiryState } from '../src/domain/stock';
import { can } from '../src/domain/permissions';
import { formatFCFA } from '../src/domain/format';
import type { Promotion, Lot, StockMovement } from '../src/types';

const fresh = () => createLocalServices(new MemoryStore());
const customer = { firstName: 'Test', lastName: 'Client', phone: '77 111 22 33', email: '', address: 'Rue test', city: 'Dakar' };

describe('format', () => {
  test('FCFA sans décimales', () => {
    expect(formatFCFA(12500).replace(/\s/g, ' ')).toBe('12 500 FCFA');
  });
});

describe('catalogue de démonstration', () => {
  test('contient les 16 produits demandés + 2 exemples artisanaux', () => {
    const s = fresh();
    const names = s.repos.products.all().map((p) => p.name);
    for (const n of ['Nététou traditionnel en sachet', 'Brisure de mil', 'Brisure de maïs', 'Huile de palme de Ziguinchor', 'Fonio', 'Miel naturel', 'Guedj', 'Toufa', 'Yokoss', 'Sésame du Mali', 'Arachide en poudre de Kaolack', 'Pâte d’arachide', 'Moringa en poudre', 'Poudre de baobab', 'Bissap rouge', 'Bissap blanc', 'Vétiver']) {
      expect(names).toContain(n);
    }
    expect(s.repos.products.all().filter((p) => p.categoryId === 'cat_artisanat').length).toBe(2);
  });
  test("aucune information n'est marquée vérifiée et aucune donnée nutritionnelle n'est inventée", () => {
    const s = fresh();
    for (const p of s.repos.products.all()) {
      expect(p.origin.status).not.toBe('verifie');
      expect(p.virtues.status).not.toBe('verifie');
      expect(p.virtues.nutrition.length).toBe(0);
      expect(p.virtues.benefits.length).toBe(0);
    }
  });
  test('les commandes de démo génèrent des statistiques', () => {
    const s = fresh();
    expect(s.repos.orders.all().length).toBe(11);
    expect(s.repos.orders.all().filter((o) => o.status === 'annulee').length).toBe(1);
  });
});

describe('prix et promotions', () => {
  const s = fresh();
  const products = s.repos.products.all();
  const bundles = s.repos.bundles.all();
  const promotions = s.repos.promotions.all();
  const zone = s.repos.zones.all().find((z) => z.id === 'zone_dakar');
  const bissap = { kind: 'produit' as const, productId: 'prd_bissap', formatId: 'bissap-f1', quantity: 2 }; // 2 × 600

  test('sous-total et livraison', () => {
    const t = computeTotals({ lines: [bissap], products, bundles, promotions, zone });
    expect(t.subtotal).toBe(1200);
    expect(t.deliveryFee).toBe(1500);
    expect(t.total).toBe(2700);
  });
  test('livraison offerte au-delà du seuil de la zone', () => {
    const t = computeTotals({ lines: [{ ...bissap, quantity: 50 }], products, bundles, promotions, zone });
    expect(t.subtotal).toBe(30000);
    expect(t.deliveryFee).toBe(0);
  });
  test('code pourcentage avec minimum', () => {
    const low = computeTotals({ lines: [bissap], products, bundles, promotions, zone, promoCode: 'bienvenue10' });
    expect(low.promoError).toBeDefined();
    const ok = computeTotals({ lines: [{ ...bissap, quantity: 20 }], products, bundles, promotions, zone, promoCode: 'BIENVENUE10' });
    expect(ok.discount).toBe(1200);
    expect(ok.total).toBe(12000 - 1200 + 1500);
  });
  test('coffret', () => {
    const t = computeTotals({ lines: [{ kind: 'coffret', bundleId: 'bnd_saveurs', quantity: 2 }], products, bundles, promotions });
    expect(t.subtotal).toBe(7000);
  });
  test('promotion expirée ou épuisée', () => {
    const base = promotions[0];
    expect(checkPromotion({ ...base, endsAt: '2000-01-01T00:00:00Z' } as Promotion, 99999)).toContain('expiré');
    expect(checkPromotion({ ...base, usageLimit: 1, usageCount: 1 } as Promotion, 99999)).toContain('limite');
  });
});

describe('stocks et lots (FEFO)', () => {
  const mk = (id: string, expiry: string | undefined, received = '2026-01-01'): Lot => ({ id, shopId: 's', createdAt: '', updatedAt: '', productId: 'p', formatId: 'f', lotNumber: id, receivedAt: received, expiryDate: expiry, storageConditions: '', notes: '' });
  const mv = (lotId: string | undefined, q: number): StockMovement => ({ id: Math.random().toString(), shopId: 's', createdAt: '', updatedAt: '', productId: 'p', formatId: 'f', lotId, type: 'entree', quantity: q, reason: '', at: '', by: '' });
  const now = new Date('2026-06-01T00:00:00Z');
  const lots = [mk('A', '2026-12-01'), mk('B', '2026-07-01'), mk('X', '2026-05-01')];
  const movements = [mv('A', 10), mv('B', 3), mv('X', 8)];

  test('prélève le lot qui périme le plus tôt et ignore les lots périmés', () => {
    expect(allocateFEFO('p', 'f', 5, lots, movements, now)).toEqual([
      { lotId: 'B', quantity: 3 },
      { lotId: 'A', quantity: 2 },
    ]);
    expect(allocateFEFO('p', 'f', 14, lots, movements, now)).toBeUndefined();
    expect(sellableQuantity('p', 'f', lots, movements, now)).toBe(13);
    expect(expiryState(lots[2], now)).toBe('perime');
    expect(expiryState(lots[1], now)).toBe('proche');
  });
});

describe('commandes', () => {
  test('commande : stock décrémenté, client créé, promo comptée', async () => {
    const s = fresh();
    const levelBefore = stockLevels(s.repos.products.all(), s.repos.movements.all()).find((l) => l.formatId === 'fonio-f1')!.quantity;
    const order = await s.orderService.placeOrder({ customer, zoneId: 'zone_dakar', paymentMethod: 'demo_paiement_livraison', promoCode: 'BIENVENUE10', lines: [{ kind: 'produit', productId: 'prd_fonio', formatId: 'fonio-f1', quantity: 10 }] });
    expect(order.isDemo).toBe(true);
    expect(order.subtotal).toBe(12000);
    expect(order.discount).toBe(1200);
    expect(order.lines[0].allocations[0].lotId).toBeDefined();
    const levelAfter = stockLevels(s.repos.products.all(), s.repos.movements.all()).find((l) => l.formatId === 'fonio-f1')!.quantity;
    expect(levelBefore - levelAfter).toBe(10);
    expect(s.repos.customers.all().some((c) => c.phone === customer.phone)).toBe(true);
    expect(s.repos.promotions.all().find((p) => p.code === 'BIENVENUE10')!.usageCount).toBe(1);

    await s.orderService.updateStatus(order.id, 'annulee');
    const restored = stockLevels(s.repos.products.all(), s.repos.movements.all()).find((l) => l.formatId === 'fonio-f1')!.quantity;
    expect(restored).toBe(levelBefore);
    await expect(s.orderService.updateStatus(order.id, 'confirmee')).rejects.toThrow();
  });
  test('refuse un stock insuffisant et des coordonnées incomplètes', async () => {
    const s = fresh();
    await expect(s.orderService.placeOrder({ customer, zoneId: 'zone_dakar', paymentMethod: 'demo_carte', lines: [{ kind: 'produit', productId: 'prd_guedj', formatId: 'guedj-f2', quantity: 999 }] })).rejects.toThrow('Stock insuffisant');
    await expect(s.orderService.placeOrder({ customer: { ...customer, phone: '' }, zoneId: 'zone_dakar', paymentMethod: 'demo_carte', lines: [{ kind: 'produit', productId: 'prd_fonio', formatId: 'fonio-f1', quantity: 1 }] })).rejects.toThrow();
  });
  test('le lot périmé de bissap 250 g est exclu de la vente', () => {
    const s = fresh();
    const q = sellableQuantity('prd_bissap', 'bissap-f2', s.repos.lots.all(), s.repos.movements.all());
    const total = stockLevels(s.repos.products.all(), s.repos.movements.all()).find((l) => l.formatId === 'bissap-f2')!.quantity;
    expect(total - q).toBe(5);
  });
});

describe('photos et mise à jour des données', () => {
  test('chaque image fournie est associée, les produits sans image gardent l’illustration', () => {
    const s = fresh();
    const photo = (slug: string) => s.repos.products.all().find((p) => p.slug === slug)!.visual.photo;
    expect(photo('netetou-traditionnel-sachet')).toBe('netetou.jpg');
    expect(photo('poudre-de-baobab')).toBe('poudre-de-bouye.jpg');
    expect(photo('pate-d-arachide')).toBe('pate-darachide.jpg');
    expect(photo('toufa')).toBe('touffa.jpg');
    expect(photo('yokoss')).toBe('yokhoss.jpg');
    expect(photo('guedj')).toBe('guedj.jpg');
    expect(photo('akpi')).toBe('akpi.jpg');
    expect(photo('bissap')).toBe('bissap.jpg');
    expect(photo('bissap-blanc')).toBe('bissap-blanc.jpg');
    expect(photo('vetiver')).toBe('vetiver.jpg');
    expect(photo('panier-tresse-exemple')).toBe('');
    expect(s.repos.products.all().filter((p) => p.visual.photo).length).toBe(25);
    expect(photo('fonio')).toBe('fonio-sachet.jpg');
    expect(s.repos.products.all().find((p) => p.slug === 'fonio')!.visual.gallery).toEqual(['fonio.jpg']);
    expect(photo('cafe-touba')).toBe('cafe-touba.jpg');
  });
  test('un navigateur avec d’anciennes données reçoit photos et nouveaux produits, sans perdre ses commandes', async () => {
    const store = new MemoryStore();
    const s1 = createLocalServices(store);
    const orders = s1.repos.orders.all().length;
    await s1.products.remove('prd_akpi');
    await s1.products.update('prd_mil'.replace('mil', 'brisure-de-mil'), { visual: { hue: 38, motif: 'grain', photo: 'brisure-de-mil.jpg' } });
    await s1.products.update('prd_fonio', { visual: { hue: 45, motif: 'grain', photo: 'ma-photo.png' } });
    const s2 = createLocalServices(store);
    expect(s2.repos.products.all().some((p) => p.id === 'prd_akpi')).toBe(true);
    expect(s2.repos.products.all().find((p) => p.id === 'prd_brisure-de-mil')!.visual.photo).toBe('mil.jpg');
    expect(s2.repos.products.all().find((p) => p.id === 'prd_fonio')!.visual.photo).toBe('ma-photo.png'); // choix de l'admin conservé
    expect(stockLevels(s2.repos.products.all(), s2.repos.movements.all()).find((l) => l.formatId === 'akpi-f1')!.quantity).toBe(40);
    expect(s2.repos.orders.all().length).toBe(orders);
  });
});

describe('page d’accueil', () => {
  test('sélection : sans nététou, avec miel ; bandeau : miel, baobab, huile de palme', async () => {
    const s = fresh();
    const featured = s.repos.products.all().filter((p) => p.featured).map((p) => p.slug);
    expect(featured).not.toContain('netetou-traditionnel-sachet');
    expect(featured).toContain('miel-naturel');
    const hero = (await s.settings.get()).homeHero;
    expect([hero.first, hero.second, hero.third]).toEqual(['miel-naturel', 'poudre-de-baobab', 'huile-de-palme-de-ziguinchor']);
  });
  test('anciennes données : la mise à jour de la sélection s’applique une seule fois', async () => {
    const store = new MemoryStore();
    const s1 = createLocalServices(store);
    // simule un navigateur de la version précédente
    await s1.products.update('prd_netetou-traditionnel-sachet', { featured: true });
    await s1.products.update('prd_pate-d-arachide', { visual: { hue: 24, motif: 'pot', photo: 'arachide.jpg' } });
    store.removeItem('dionda:v1:shop_dionda:patch-accueil-2026-11-01');
    const s2 = createLocalServices(store);
    expect(s2.repos.products.all().find((p) => p.id === 'prd_netetou-traditionnel-sachet')!.featured).toBe(false);
    expect(s2.repos.products.all().find((p) => p.id === 'prd_pate-d-arachide')!.visual.photo).toBe('pate-darachide.jpg');
    // un choix fait ensuite dans l'administration est respecté
    await s2.products.update('prd_netetou-traditionnel-sachet', { featured: true });
    const s3 = createLocalServices(store);
    expect(s3.repos.products.all().find((p) => p.id === 'prd_netetou-traditionnel-sachet')!.featured).toBe(true);
  });
});

describe('retrait du Nététou de Kédougou', () => {
  test('absent du nouveau catalogue ; archivé (non supprimé) dans les anciennes données', async () => {
    expect(fresh().repos.products.all().some((p) => p.id === 'prd_netetou-de-kedougou')).toBe(false);
    const store = new MemoryStore();
    const s1 = createLocalServices(store);
    // simule un navigateur de la version précédente, où le produit existait
    const base = s1.repos.products.all().find((p) => p.id === 'prd_netetou-traditionnel-sachet')!;
    s1.repos.products.insertRaw({ ...base, id: 'prd_netetou-de-kedougou', slug: 'netetou-de-kedougou', name: 'Nététou de Kédougou', status: 'publie' });
    store.removeItem('dionda:v1:shop_dionda:patch-netetou-2026-11-07');
    const s2 = createLocalServices(store);
    expect(s2.repos.products.all().find((p) => p.id === 'prd_netetou-de-kedougou')!.status).toBe('archive');
    expect(s2.repos.products.all().find((p) => p.id === 'prd_netetou-traditionnel-sachet')!.status).toBe('publie');
  });
});

describe('Bissap rouge', () => {
  test('anciennes données : « Bissap » devient « Bissap rouge », un nom choisi par l’administration est respecté', async () => {
    const store = new MemoryStore();
    const s1 = createLocalServices(store);
    await s1.products.update('prd_bissap', { name: 'Bissap', shortDescription: 'Calices séchés d’hibiscus.' });
    store.removeItem('dionda:v1:shop_dionda:patch-bissap-rouge-2026-11-07');
    const s2 = createLocalServices(store);
    const b = s2.repos.products.all().find((p) => p.id === 'prd_bissap')!;
    expect(b.name).toBe('Bissap rouge');
    expect(b.shortDescription).toBe('Calices séchés d’hibiscus rouge.');
    await s2.products.update('prd_bissap', { name: 'Mon bissap' });
    store.removeItem('dionda:v1:shop_dionda:patch-bissap-rouge-2026-11-07');
    expect(createLocalServices(store).repos.products.all().find((p) => p.id === 'prd_bissap')!.name).toBe('Mon bissap');
  });
});

describe('photos supplémentaires', () => {
  test('anciennes données : la nouvelle photo du sachet devient principale, l’ancienne passe en 2e photo', async () => {
    const store = new MemoryStore();
    const s1 = createLocalServices(store);
    // simule un navigateur de la version précédente (pas de champ gallery)
    for (const [id, photo] of [['prd_fonio', 'fonio.jpg'], ['prd_cafe-touba', 'cafe-touba-verre.jpg']] as const) {
      const p = s1.repos.products.all().find((x) => x.id === id)!;
      s1.repos.products.insertRaw({ ...p, visual: { hue: p.visual.hue, motif: p.visual.motif, photo } });
    }
    const s2 = createLocalServices(store);
    const v = (id: string) => s2.repos.products.all().find((x) => x.id === id)!.visual;
    expect(v('prd_fonio').photo).toBe('fonio-sachet.jpg');
    expect(v('prd_fonio').gallery).toEqual(['fonio.jpg']);
    expect(v('prd_cafe-touba').photo).toBe('cafe-touba.jpg');
    expect(v('prd_cafe-touba').gallery).toEqual(['cafe-touba-verre.jpg']);
    // un choix fait ensuite dans l'administration est respecté
    await s2.products.update('prd_fonio', { visual: { ...v('prd_fonio'), gallery: [] } });
    expect(createLocalServices(store).repos.products.all().find((x) => x.id === 'prd_fonio')!.visual.gallery).toEqual([]);
  });
});

describe('multi-boutiques', () => {
  test('les données sont isolées par boutique', async () => {
    const s = fresh();
    const shop = await s.shops.create('Boutique Test', { withDemoData: false });
    s.shops.switchTo(shop.id);
    expect(s.repos.products.all().length).toBe(0);
    await s.categories.create({ slug: 'x', name: 'X', description: '', kind: 'autre', order: 1, visible: true });
    expect(s.repos.categories.all().length).toBe(1);
    s.shops.switchTo('shop_dionda');
    expect(s.repos.categories.all().length).toBe(7);
    expect(s.repos.products.all().length).toBe(27);
  });
});

describe('permissions (interface uniquement)', () => {
  test('matrice des rôles', () => {
    expect(can('proprietaire', 'parametres', 'ecrire')).toBe(true);
    expect(can('editeur', 'commandes', 'lire')).toBe(false);
    expect(can('logistique', 'stocks', 'ecrire')).toBe(true);
    expect(can('lecteur', 'catalogue', 'ecrire')).toBe(false);
  });
  test("l'authentification locale se déclare simulée", async () => {
    const s = fresh();
    expect(s.auth.isSimulated).toBe(true);
    const session = await s.auth.signIn('admin@exemple.sn', 'gestionnaire');
    expect(session.isSimulated).toBe(true);
  });
});
