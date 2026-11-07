import type { Entity, FCFA, ID, ISODate } from './common';

/** Boutique (tenant). Côté SaaS : table "shops", chaque ressource porte shop_id. */
export interface Shop extends Entity {
  slug: string;
  name: string;
  ownerUserId: ID;
  planId: ID;
  status: 'active' | 'suspendue' | 'essai';
  customDomain?: string;
}

export interface ShopSettings {
  shopId: ID;
  name: string;
  slogan: string;
  /** Signature de la marque, affichée sous le logo (ex. « by BintouDionda »). */
  signature: string;
  contactEmail: string;
  phone: string;
  address: string;
  currency: 'XOF';
  locale: 'fr-SN';
  theme: { primary: string; accent: string };
  announcement: string;
  legalNotice: string;
  freeShippingMessage: string;
  /** Produits (identifiants URL) affichés dans le grand bandeau de la page d'accueil. */
  homeHero: { first: string; second: string; third: string };
}

export interface Plan {
  id: ID;
  name: string;
  monthlyPrice: FCFA;
  limits: { products: number; admins: number; shops: number };
  features: string[];
}

export interface Subscription extends Entity {
  shopId: ID;
  planId: ID;
  status: 'essai' | 'active' | 'impayee' | 'annulee';
  currentPeriodEnd: ISODate;
}

export type Role = 'proprietaire' | 'gestionnaire' | 'logistique' | 'editeur' | 'lecteur';

export type Resource =
  | 'catalogue'
  | 'origines'
  | 'fournisseurs'
  | 'stocks'
  | 'commandes'
  | 'clients'
  | 'livraisons'
  | 'promotions'
  | 'contenus'
  | 'statistiques'
  | 'parametres'
  | 'equipe'
  | 'boutiques';

export type Action = 'lire' | 'ecrire';
export type Permission = `${Resource}:${Action}`;

export interface AdminUser extends Entity {
  email: string;
  displayName: string;
  memberships: { shopId: ID; role: Role }[];
}

/**
 * Session d'administration.
 * isSimulated = true : aucune vérification d'identité n'est faite, les données
 * restent dans le navigateur. Ce n'est PAS une protection.
 */
export interface AuthSession {
  user: Pick<AdminUser, 'id' | 'email' | 'displayName'>;
  shopId: ID;
  role: Role;
  isSimulated: boolean;
  startedAt: ISODate;
}
