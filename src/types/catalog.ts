import type { FCFA, ID, ISODate, ShopScoped, SourceRef, VerificationStatus } from './common';

export type CategoryKind = 'alimentaire' | 'artisanat' | 'autre';

export interface Category extends ShopScoped {
  slug: string;
  name: string;
  description: string;
  kind: CategoryKind;
  parentId?: ID;
  order: number;
  visible: boolean;
}

export type FormatUnit = 'g' | 'kg' | 'ml' | 'l' | 'piece';

export interface ProductFormat {
  id: ID;
  label: string; // ex. "Sachet 250 g"
  quantity: number;
  unit: FormatUnit;
  price: FCFA;
  compareAtPrice?: FCFA;
  sku: string;
  lowStockThreshold: number;
  active: boolean;
}

export interface ProductOrigin {
  country: string;
  regionId?: ID;
  locality: string;
  supplierId?: ID;
  story: string; // histoire et tradition
  productionMethod: string; // méthode de production, si documentée
  status: VerificationStatus;
  sources: SourceRef[];
}

export interface NutritionEntry {
  nutrient: string; // ex. "Protéines"
  amount: number;
  unit: string; // ex. "g", "mg", "kcal"
  per: string; // ex. "100 g"
}

export interface ProductVirtues {
  nutrition: NutritionEntry[];
  benefits: string[]; // bienfaits alimentaires documentés
  traditionalUses: string[];
  preparationTips: string[];
  precautions: string[];
  status: VerificationStatus;
  sources: SourceRef[];
}

export interface ProductTraceability {
  storageConditions: string;
  shelfLifeDays?: number;
  lotTracking: boolean;
  expiryTracking: boolean;
  notes: string;
}

export type PublicationStatus = 'brouillon' | 'publie' | 'archive';

export type VisualMotif = 'grain' | 'goutte' | 'feuille' | 'pot' | 'poisson' | 'fleur' | 'racine' | 'tissage' | 'coquillage' | 'coffret';

/** Visuel généré en attendant le stockage d'images (futur MediaService). */
export interface ProductVisual {
  hue: number;
  motif: VisualMotif;
  /**
   * Photo : nom de fichier dans le dossier photos/ (ex. "fonio.jpg") ou URL complète.
   * Si le fichier est absent, l'illustration générée est affichée à la place.
   */
  photo?: string;
  /** Photos supplémentaires, affichées en vignettes sur la fiche produit (même format que photo). */
  gallery?: string[];
}

export interface Product extends ShopScoped {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  categoryId: ID;
  formats: ProductFormat[];
  origin: ProductOrigin;
  virtues: ProductVirtues;
  traceability: ProductTraceability;
  tags: string[];
  featured: boolean;
  isExample: boolean; // produit d'exemple à remplacer
  status: PublicationStatus;
  visual: ProductVisual;
  imageIds: ID[];
  publishedAt?: ISODate;
}
