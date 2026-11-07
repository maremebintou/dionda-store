/**
 * Données de démonstration de DIONDA STORE.
 *
 * Règles éditoriales appliquées :
 * - Les seules origines renseignées sont celles indiquées par le nom du produit
 *   (Kédougou, Ziguinchor, Kaolack, Mali) ; elles restent "à vérifier".
 * - Aucune valeur nutritionnelle, aucun bienfait santé, aucune certification n'est saisi.
 * - Les usages culinaires courants sont marqués "Information non vérifiée".
 * - Les prix, stocks, zones de livraison, clients et commandes sont fictifs.
 * - Les produits artisanaux et les producteurs sont des fiches d'exemple.
 */
import type { Bundle, Category, DeliveryZone, Product, ProductFormat, Promotion, Region, ShopSettings, Supplier, VerificationStatus, FormatUnit, VisualMotif } from '../types';

type Seed<T> = Omit<T, 'shopId' | 'createdAt' | 'updatedAt'>;

export const DEFAULT_SHOP_ID = 'shop_dionda';

export function defaultSettings(shopId: string, name = 'DIONDA STORE'): ShopSettings {
  return {
    shopId,
    name,
    slogan: "L'authenticité de nos terroirs, l'élégance du naturel",
    signature: 'by BintouDionda',
    contactEmail: 'contact@exemple.sn',
    phone: '+221 00 000 00 00',
    address: 'Adresse à renseigner',
    currency: 'XOF',
    locale: 'fr-SN',
    theme: { primary: '#1b5e33', accent: '#f28c28' },
    announcement: 'Boutique de démonstration : les commandes ne sont ni payées ni livrées.',
    legalNotice: 'Mentions légales à compléter avant toute mise en ligne.',
    freeShippingMessage: 'Livraison offerte à Dakar dès 30 000 FCFA (tarifs de démonstration).',
    homeHero: { first: 'miel-naturel', second: 'poudre-de-baobab', third: 'huile-de-palme-de-ziguinchor' },
  };
}

export const SEED_CATEGORIES: Seed<Category>[] = [
  { id: 'cat_cereales', slug: 'cereales-brisures', name: 'Céréales & brisures', description: 'Mil, maïs, fonio : les bases de la cuisine de nos terroirs.', kind: 'alimentaire', order: 1, visible: true },
  { id: 'cat_condiments', slug: 'condiments-traditionnels', name: 'Condiments traditionnels', description: 'Nététou, guedj : les saveurs fermentées qui font le goût des plats.', kind: 'alimentaire', order: 2, visible: true },
  { id: 'cat_oleagineux', slug: 'huiles-oleagineux', name: 'Huiles & oléagineux', description: 'Huile de palme, arachide, sésame.', kind: 'alimentaire', order: 3, visible: true },
  { id: 'cat_plantes', slug: 'plantes-poudres', name: 'Plantes, poudres & infusions', description: 'Bissap, baobab, moringa, vétiver.', kind: 'alimentaire', order: 4, visible: true },
  { id: 'cat_douceurs', slug: 'miel-douceurs', name: 'Miel & douceurs', description: 'Miel naturel et douceurs du terroir.', kind: 'alimentaire', order: 5, visible: true },
  { id: 'cat_specialites', slug: 'specialites-regionales', name: 'Spécialités régionales', description: 'Produits régionaux complémentaires, au fil des arrivages.', kind: 'alimentaire', order: 6, visible: true },
  { id: 'cat_artisanat', slug: 'artisanat-textiles', name: 'Artisanat & textiles', description: 'Objets artisanaux et textiles, une sélection distincte des produits alimentaires.', kind: 'artisanat', order: 7, visible: true },
];

export const SEED_REGIONS: Seed<Region>[] = [
  { id: 'reg_kedougou', name: 'Kédougou', country: 'Sénégal', description: 'Région du sud-est du Sénégal.', visibleOnStore: true, status: 'a_verifier', sources: [] },
  { id: 'reg_ziguinchor', name: 'Ziguinchor', country: 'Sénégal', description: 'Région de Basse-Casamance, au sud-ouest du Sénégal.', visibleOnStore: true, status: 'a_verifier', sources: [] },
  { id: 'reg_kaolack', name: 'Kaolack', country: 'Sénégal', description: 'Région du centre-ouest du Sénégal, dans le bassin arachidier.', visibleOnStore: true, status: 'a_verifier', sources: [] },
  { id: 'reg_mali', name: 'Mali — région à préciser', country: 'Mali', description: 'Région de provenance à préciser auprès du fournisseur.', visibleOnStore: true, status: 'non_renseigne', sources: [] },
];

export const SEED_SUPPLIERS: Seed<Supplier>[] = [
  { id: 'sup_exemple_1', name: 'Producteur partenaire (exemple)', type: 'producteur', regionId: 'reg_kedougou', locality: '', contactName: '', phone: '', email: '', story: 'Fiche d’exemple, à remplacer par un producteur réel une fois le partenariat établi.', visibleOnStore: true, status: 'non_renseigne' },
  { id: 'sup_exemple_2', name: 'Coopérative partenaire (exemple)', type: 'cooperative', regionId: 'reg_ziguinchor', locality: '', contactName: '', phone: '', email: '', story: 'Fiche d’exemple, à remplacer par une coopérative réelle.', visibleOnStore: true, status: 'non_renseigne' },
  { id: 'sup_exemple_3', name: 'Atelier artisanal (exemple)', type: 'artisan', locality: '', contactName: '', phone: '', email: '', story: 'Fiche d’exemple pour la catégorie Artisanat & textiles.', visibleOnStore: true, status: 'non_renseigne' },
];

const HUES: Record<string, number> = {
  cat_cereales: 38,
  cat_condiments: 18,
  cat_oleagineux: 28,
  cat_plantes: 110,
  cat_douceurs: 44,
  cat_specialites: 215,
  cat_artisanat: 345,
};

function fmt(slug: string, n: number, label: string, quantity: number, unit: FormatUnit, price: number, threshold = 5): ProductFormat {
  return { id: `${slug}-f${n}`, label, quantity, unit, price, sku: `DS-${slug.slice(0, 6).toUpperCase()}-${n}`, lowStockThreshold: threshold, active: true };
}

interface P {
  slug: string;
  name: string;
  cat: string;
  short: string;
  desc: string;
  formats: [string, number, FormatUnit, number][];
  motif: VisualMotif;
  hue?: number;
  country?: string;
  regionId?: string;
  originStatus?: VerificationStatus;
  uses?: string[];
  tips?: string[];
  precautions?: string[];
  storage?: string;
  expiry?: boolean;
  featured?: boolean;
  example?: boolean;
  tags?: string[];
  /** fichier dans photos/ ; absent = illustration générée */
  photo?: string;
  /** photos supplémentaires (fiche produit) */
  gallery?: string[];
}

const DRY = 'Conserver dans un endroit sec et frais, à l’abri de la lumière, dans un contenant bien fermé.';

const PRODUCTS: P[] = [
  { slug: 'netetou-traditionnel-sachet', photo: 'netetou.jpg', name: 'Nététou traditionnel en sachet', cat: 'cat_condiments', motif: 'grain', short: 'Condiment traditionnel de graines fermentées, conditionné en sachet.', desc: 'Le nététou est un condiment obtenu par fermentation des graines de néré. Il relève de nombreux plats de la cuisine sénégalaise et ouest-africaine.', formats: [['Sachet 100 g', 100, 'g', 500], ['Sachet 250 g', 250, 'g', 1100]], uses: ['Assaisonnement des sauces et des plats de riz'] },
  { slug: 'brisure-de-mil', photo: 'mil.jpg', name: 'Brisure de mil', cat: 'cat_cereales', motif: 'grain', short: 'Grains de mil concassés.', desc: 'Mil concassé, prêt à être cuisiné.', formats: [['Sachet 1 kg', 1, 'kg', 900], ['Sac 5 kg', 5, 'kg', 4200]], uses: ['Préparation de bouillies et de plats à base de mil'] },
  { slug: 'brisure-de-mais', photo: 'mais.jpg', name: 'Brisure de maïs', cat: 'cat_cereales', motif: 'grain', short: 'Grains de maïs concassés.', desc: 'Maïs concassé, prêt à être cuisiné.', formats: [['Sachet 1 kg', 1, 'kg', 700], ['Sac 5 kg', 5, 'kg', 3200]] },
  { slug: 'huile-de-palme-de-ziguinchor', photo: 'huile-de-palme.jpg', name: 'Huile de palme de Ziguinchor', cat: 'cat_oleagineux', motif: 'goutte', hue: 14, short: 'Huile de palme dont la provenance indiquée est Ziguinchor.', desc: 'Huile extraite des fruits du palmier à huile. Provenance indiquée : Ziguinchor, en Casamance (à confirmer auprès du fournisseur).', formats: [['Bouteille 50 cl', 50, 'ml', 1500], ['Bouteille 1 l', 1, 'l', 2800]], country: 'Sénégal', regionId: 'reg_ziguinchor', originStatus: 'a_verifier', uses: ['Cuisine de plats de Casamance, comme le soupou kandja'], featured: true, storage: 'Conserver à l’abri de la lumière et de la chaleur, bouteille bien fermée.' },
  { slug: 'fonio', photo: 'fonio-sachet.jpg', gallery: ['fonio.jpg'], name: 'Fonio', cat: 'cat_cereales', motif: 'grain', hue: 45, short: 'Petite céréale cultivée en Afrique de l’Ouest.', desc: 'Le fonio est une céréale à grains très fins, cultivée en Afrique de l’Ouest.', formats: [['Sachet 500 g', 500, 'g', 1200], ['Sachet 1 kg', 1, 'kg', 2200]], tips: ['Se cuit généralement à la vapeur, à la manière d’un couscous'], featured: true },
  { slug: 'miel-naturel', photo: 'miel-pur.jpg', name: 'Miel naturel', cat: 'cat_douceurs', motif: 'pot', short: 'Miel en pot.', desc: 'Miel conditionné en pot. Origine et type de miel à renseigner.', formats: [['Pot 250 g', 250, 'g', 2500], ['Pot 500 g', 500, 'g', 4500]], precautions: ['Ne pas donner de miel aux enfants de moins d’un an'], storage: 'Conserver à température ambiante, pot bien fermé. La cristallisation est un phénomène naturel.', featured: true },
  { slug: 'guedj', photo: 'guedj.jpg', name: 'Guedj', cat: 'cat_condiments', motif: 'poisson', hue: 30, short: 'Poisson séché et fermenté, utilisé pour relever les plats.', desc: 'Le guedj est un poisson séché et fermenté, utilisé comme exhausteur de goût dans la cuisine sénégalaise.', formats: [['Sachet 200 g', 200, 'g', 1500], ['Sachet 500 g', 500, 'g', 3500]], uses: ['Assaisonnement des sauces et du thiéboudiène'], precautions: ['Produit à base de poisson : à éviter en cas d’allergie au poisson'], featured: true },
  { slug: 'toufa', photo: 'touffa.jpg', name: 'Toufa', cat: 'cat_specialites', motif: 'coquillage', short: 'Fiche produit à compléter.', desc: '', formats: [['Sachet 250 g', 250, 'g', 1000]] },
  { slug: 'yokoss', photo: 'yokhoss.jpg', name: 'Yokoss', cat: 'cat_specialites', motif: 'coquillage', hue: 200, short: 'Fiche produit à compléter.', desc: '', formats: [['Sachet 250 g', 250, 'g', 1500]] },
  { slug: 'sesame-du-mali', photo: 'graines-de-sesame.jpg', name: 'Sésame du Mali', cat: 'cat_oleagineux', motif: 'grain', hue: 40, short: 'Graines de sésame dont la provenance indiquée est le Mali.', desc: 'Graines de sésame. Pays de provenance indiqué : Mali (région à préciser).', formats: [['Sachet 250 g', 250, 'g', 900], ['Sachet 500 g', 500, 'g', 1700]], country: 'Mali', regionId: 'reg_mali', originStatus: 'a_verifier', precautions: ['Contient du sésame, allergène majeur'] },
  { slug: 'arachide-en-poudre-de-kaolack', photo: 'poudre-darachide.jpg', name: 'Arachide en poudre de Kaolack', cat: 'cat_oleagineux', motif: 'grain', hue: 26, short: 'Arachide moulue, provenance indiquée : Kaolack.', desc: 'Arachide moulue en poudre. Provenance indiquée : Kaolack (à confirmer auprès du fournisseur).', formats: [['Sachet 500 g', 500, 'g', 1000], ['Sachet 1 kg', 1, 'kg', 1900]], country: 'Sénégal', regionId: 'reg_kaolack', originStatus: 'a_verifier', precautions: ['Contient de l’arachide, allergène majeur'] },
  { slug: 'pate-d-arachide', photo: 'pate-darachide.jpg', name: 'Pâte d’arachide', cat: 'cat_oleagineux', motif: 'pot', hue: 24, short: 'Pâte d’arachide en pot.', desc: 'Pâte obtenue à partir d’arachides broyées.', formats: [['Pot 500 g', 500, 'g', 1500], ['Pot 1 kg', 1, 'kg', 2800]], uses: ['Base du mafé, sauce à l’arachide'], precautions: ['Contient de l’arachide, allergène majeur'], featured: true },
  { slug: 'moringa-en-poudre', photo: 'moringa.jpg', name: 'Moringa en poudre', cat: 'cat_plantes', motif: 'feuille', short: 'Feuilles de moringa séchées et réduites en poudre.', desc: 'Poudre obtenue à partir de feuilles de moringa séchées.', formats: [['Sachet 100 g', 100, 'g', 1500], ['Sachet 250 g', 250, 'g', 3200]], uses: ['Ajout aux sauces et aux bouillies'] },
  { slug: 'poudre-de-baobab', photo: 'poudre-de-bouye.jpg', name: 'Poudre de baobab', cat: 'cat_plantes', motif: 'feuille', hue: 40, short: 'Pulpe du fruit du baobab (pain de singe) en poudre.', desc: 'Poudre issue de la pulpe du fruit du baobab, appelé pain de singe.', formats: [['Sachet 250 g', 250, 'g', 1200], ['Sachet 500 g', 500, 'g', 2200]], uses: ['Préparation du bouye, boisson au pain de singe'], featured: true },
  { slug: 'bissap', photo: 'bissap.jpg', name: 'Bissap rouge', cat: 'cat_plantes', motif: 'fleur', hue: 345, short: 'Calices séchés d’hibiscus rouge.', desc: 'Calices d’hibiscus séchés, utilisés pour préparer la boisson du même nom.', formats: [['Sachet 100 g', 100, 'g', 600], ['Sachet 250 g', 250, 'g', 1400]], uses: ['Préparation du jus de bissap, servi frais'], tips: ['Infuser les calices dans l’eau, filtrer, puis sucrer selon le goût'], featured: true },
  { slug: 'bissap-blanc', photo: 'bissap-blanc.jpg', name: 'Bissap blanc', cat: 'cat_plantes', motif: 'fleur', hue: 45, short: 'Calices séchés d’une variété claire d’hibiscus.', desc: 'Calices séchés d’une variété d’hibiscus de couleur claire, utilisés pour préparer le bissap blanc. Provenance à renseigner.', formats: [['Sachet 100 g', 100, 'g', 600], ['Sachet 250 g', 250, 'g', 1400]], uses: ['Préparation du jus de bissap blanc, servi frais'] },
  { slug: 'vetiver', photo: 'vetiver.jpg', name: 'Vétiver', cat: 'cat_plantes', motif: 'racine', hue: 70, short: 'Racines de vétiver.', desc: 'Racines de vétiver séchées.', formats: [['Botte 50 g', 50, 'g', 700]], uses: ['Utilisé traditionnellement pour parfumer l’eau de boisson'] },
  { slug: 'akpi', photo: 'akpi.jpg', name: 'Akpi (djansang)', cat: 'cat_condiments', motif: 'grain', hue: 28, short: 'Graines d’akpi, aussi appelé djansang.', desc: 'Graines de l’arbre Ricinodendron heudelotii, appelées akpi ou djansang, utilisées comme épice en Afrique de l’Ouest et centrale.', formats: [['Sachet 100 g', 100, 'g', 1500], ['Sachet 250 g', 250, 'g', 3000]], uses: ['Assaisonnement et liaison des sauces'] },
  { slug: 'graines-de-fenugrec', photo: 'graines-de-fenugrec.jpg', name: 'Graines de fenugrec', cat: 'cat_condiments', motif: 'grain', hue: 42, short: 'Graines de fenugrec.', desc: 'Graines de fenugrec, utilisées comme épice.', formats: [['Sachet 100 g', 100, 'g', 800], ['Sachet 250 g', 250, 'g', 1800]] },
  { slug: 'beurre-de-karite', photo: 'beurre-de-karite.jpg', name: 'Beurre de karité', cat: 'cat_oleagineux', motif: 'pot', hue: 40, short: 'Beurre extrait des noix de karité.', desc: 'Beurre obtenu à partir des noix de karité. Type de beurre (alimentaire ou cosmétique) et provenance à renseigner.', formats: [['Pot 250 g', 250, 'g', 2000], ['Pot 500 g', 500, 'g', 3500]], storage: 'Conserver à l’abri de la chaleur et de la lumière, pot bien fermé.' },
  { slug: 'beurre-de-cacao', photo: 'beurre-de-cacao.jpg', name: 'Beurre de cacao', cat: 'cat_oleagineux', motif: 'pot', hue: 34, short: 'Matière grasse extraite des fèves de cacao.', desc: 'Beurre de cacao. Type (alimentaire ou cosmétique) et provenance à renseigner.', formats: [['Sachet 250 g', 250, 'g', 3500]], storage: 'Conserver à l’abri de la chaleur et de la lumière.' },
  { slug: 'graines-de-chia', photo: 'graines-de-chia.jpg', name: 'Graines de chia', cat: 'cat_plantes', motif: 'grain', hue: 220, short: 'Petites graines de chia.', desc: 'Graines de la plante Salvia hispanica.', formats: [['Sachet 250 g', 250, 'g', 2000], ['Sachet 500 g', 500, 'g', 3500]] },
  { slug: 'cafe-touba', photo: 'cafe-touba.jpg', gallery: ['cafe-touba-verre.jpg'], name: 'Café Touba', cat: 'cat_plantes', motif: 'grain', hue: 20, short: 'Café Touba, spécialité sénégalaise.', desc: 'Café Touba. Composition et provenance à renseigner.', formats: [['Sachet 250 g', 250, 'g', 1500], ['Sachet 500 g', 500, 'g', 2800]], uses: ['Café traditionnellement parfumé au poivre de Guinée (djar)'] },
  { slug: 'nougat-arachide', photo: 'nougat.jpg', name: 'Nougat à l’arachide', cat: 'cat_douceurs', motif: 'grain', hue: 36, short: 'Confiserie à l’arachide.', desc: 'Nougat à l’arachide. Composition à renseigner.', formats: [['Sachet 200 g', 200, 'g', 1000]], precautions: ['Contient de l’arachide, allergène majeur'] },
  { slug: 'sel-iode', photo: 'sel-iode.jpg', name: 'Sel iodé', cat: 'cat_condiments', motif: 'grain', hue: 210, short: 'Sel de cuisine enrichi en iode.', desc: 'Sel de cuisine enrichi en iode. Provenance à renseigner.', formats: [['Sachet 500 g', 500, 'g', 300], ['Sachet 1 kg', 1, 'kg', 500]], storage: 'Conserver au sec, dans un contenant fermé.' },
  { slug: 'panier-tresse-exemple', name: 'Panier tressé (exemple)', cat: 'cat_artisanat', motif: 'tissage', hue: 32, short: 'Produit d’exemple pour la catégorie Artisanat & textiles.', desc: 'Fiche d’exemple à remplacer par un objet artisanal réel (artisan, matière, dimensions).', formats: [['Pièce', 1, 'piece', 8000, ]], example: true, expiry: false, storage: 'Conserver au sec.' },
  { slug: 'pagne-tisse-exemple', name: 'Pagne tissé (exemple)', cat: 'cat_artisanat', motif: 'tissage', hue: 225, short: 'Produit d’exemple pour la catégorie Artisanat & textiles.', desc: 'Fiche d’exemple à remplacer par un textile réel (atelier, technique, dimensions).', formats: [['Pièce', 1, 'piece', 15000]], example: true, expiry: false, storage: 'Conserver à l’abri de l’humidité et de la lumière directe.' },
];

export const SEED_PRODUCTS: Seed<Product>[] = PRODUCTS.map((p) => {
  const usesStatus: VerificationStatus = p.uses?.length || p.tips?.length || p.precautions?.length ? 'a_verifier' : 'non_renseigne';
  return {
    id: `prd_${p.slug}`,
    slug: p.slug,
    name: p.name,
    shortDescription: p.short,
    description: p.desc,
    categoryId: p.cat,
    formats: p.formats.map(([label, q, u, price], i) => fmt(p.slug, i + 1, label, q, u, price, p.cat === 'cat_artisanat' ? 1 : 5)),
    origin: {
      country: p.country ?? '',
      regionId: p.regionId,
      locality: '',
      supplierId: undefined,
      story: '',
      productionMethod: '',
      status: p.originStatus ?? 'non_renseigne',
      sources: [],
    },
    virtues: {
      nutrition: [],
      benefits: [],
      traditionalUses: p.uses ?? [],
      preparationTips: p.tips ?? [],
      precautions: p.precautions ?? [],
      status: usesStatus,
      sources: [],
    },
    traceability: {
      storageConditions: p.storage ?? DRY,
      shelfLifeDays: undefined,
      lotTracking: true,
      expiryTracking: p.expiry ?? true,
      notes: 'Conditions de conservation à confirmer avec le fournisseur.',
    },
    tags: [],
    featured: Boolean(p.featured),
    isExample: Boolean(p.example),
    status: 'publie',
    visual: { hue: p.hue ?? HUES[p.cat] ?? 30, motif: p.motif, photo: p.photo ?? '', gallery: p.gallery ?? [] },
    imageIds: [],
  };
});

export const SEED_ZONES: Seed<DeliveryZone>[] = [
  { id: 'zone_dakar', name: 'Dakar — centre', cities: ['Dakar', 'Plateau', 'Médina', 'Mermoz', 'Almadies'], fee: 1500, freeAbove: 30000, estimatedDelay: '24 h', active: true },
  { id: 'zone_banlieue', name: 'Dakar — banlieue', cities: ['Pikine', 'Guédiawaye', 'Rufisque', 'Keur Massar'], fee: 2500, freeAbove: 40000, estimatedDelay: '24 à 48 h', active: true },
  { id: 'zone_thies', name: 'Thiès & Petite-Côte', cities: ['Thiès', 'Mbour', 'Saly'], fee: 3500, estimatedDelay: '48 à 72 h', active: true },
  { id: 'zone_regions', name: 'Autres régions du Sénégal', cities: ['Saint-Louis', 'Kaolack', 'Ziguinchor', 'Tambacounda'], fee: 5000, estimatedDelay: '3 à 5 jours', active: true },
];

export const SEED_PROMOTIONS: Seed<Promotion>[] = [
  { id: 'promo_bienvenue', code: 'BIENVENUE10', label: '10 % de bienvenue', type: 'pourcentage', value: 10, minSubtotal: 10000, usageCount: 0, active: true },
  { id: 'promo_livraison', code: 'LIVRAISON', label: 'Livraison offerte', type: 'livraison_offerte', value: 0, minSubtotal: 20000, usageCount: 0, active: true },
  { id: 'promo_terroir', code: 'TERROIR2000', label: '2 000 FCFA de remise', type: 'montant_fixe', value: 2000, minSubtotal: 15000, usageLimit: 50, usageCount: 0, active: true },
];

export const SEED_BUNDLES: Seed<Bundle>[] = [
  {
    id: 'bnd_saveurs',
    slug: 'coffret-saveurs-du-terroir',
    name: 'Coffret Saveurs du terroir',
    description: 'Nététou, bissap, pâte d’arachide et poudre de baobab réunis dans un coffret.',
    items: [
      { productId: 'prd_netetou-traditionnel-sachet', formatId: 'netetou-traditionnel-sachet-f1', quantity: 1 },
      { productId: 'prd_bissap', formatId: 'bissap-f1', quantity: 1 },
      { productId: 'prd_pate-d-arachide', formatId: 'pate-d-arachide-f1', quantity: 1 },
      { productId: 'prd_poudre-de-baobab', formatId: 'poudre-de-baobab-f1', quantity: 1 },
    ],
    price: 3500,
    active: true,
    visual: { hue: 18, motif: 'coffret', photo: '' },
  },
  {
    id: 'bnd_matin',
    slug: 'coffret-petit-dejeuner',
    name: 'Coffret Petit-déjeuner',
    description: 'Fonio, miel naturel et poudre de baobab.',
    items: [
      { productId: 'prd_fonio', formatId: 'fonio-f1', quantity: 1 },
      { productId: 'prd_miel-naturel', formatId: 'miel-naturel-f1', quantity: 1 },
      { productId: 'prd_poudre-de-baobab', formatId: 'poudre-de-baobab-f1', quantity: 1 },
    ],
    price: 4500,
    active: true,
    visual: { hue: 42, motif: 'coffret', photo: '' },
  },
];

export const DEMO_CUSTOMERS = [
  { firstName: 'Awa', lastName: 'Diop', phone: '77 000 00 01', email: '', address: 'Adresse fictive', city: 'Dakar', zone: 'zone_dakar' },
  { firstName: 'Moussa', lastName: 'Fall', phone: '77 000 00 02', email: '', address: 'Adresse fictive', city: 'Pikine', zone: 'zone_banlieue' },
  { firstName: 'Fatou', lastName: 'Ndiaye', phone: '77 000 00 03', email: '', address: 'Adresse fictive', city: 'Thiès', zone: 'zone_thies' },
  { firstName: 'Ibrahima', lastName: 'Sarr', phone: '77 000 00 04', email: '', address: 'Adresse fictive', city: 'Dakar', zone: 'zone_dakar' },
  { firstName: 'Khady', lastName: 'Sow', phone: '77 000 00 05', email: '', address: 'Adresse fictive', city: 'Saint-Louis', zone: 'zone_regions' },
];
