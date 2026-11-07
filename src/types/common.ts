/**
 * Types transverses de DIONDA STORE.
 * Toutes les entités métier sont rattachées à une boutique (shopId) afin de
 * préparer le fonctionnement multi-boutiques (SaaS) côté API NestJS / PostgreSQL.
 */

export type ID = string;
/** Date ISO 8601, ex. "2026-11-01T10:00:00.000Z" (colonne timestamptz côté PostgreSQL). */
export type ISODate = string;
/** Montant entier en francs CFA (XOF). Pas de décimales. */
export type FCFA = number;

export interface Entity {
  id: ID;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Entité appartenant à une boutique (clé de partitionnement multi-tenant). */
export interface ShopScoped extends Entity {
  shopId: ID;
}

/**
 * Niveau de fiabilité d'une information éditoriale.
 * Une information n'est jamais présentée comme vérifiée si son statut n'est pas "verifie".
 */
export type VerificationStatus =
  | 'non_renseigne' // aucune information saisie
  | 'a_verifier' // saisie mais non contrôlée
  | 'declare_fournisseur' // déclarée par le producteur / fournisseur, non contrôlée
  | 'verifie'; // contrôlée par l'équipe avec sources

export interface SourceRef {
  label: string;
  url?: string;
  consultedAt?: ISODate;
}

/** Données de création : sans identifiant, horodatage ni boutique (fournis par le service). */
export type CreateInput<T extends Entity> = Omit<T, keyof Entity | 'shopId'>;
export type UpdateInput<T extends Entity> = Partial<CreateInput<T>>;
