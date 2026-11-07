import type { CategoryKind, DeliveryStatus, MovementType, OrderStatus, PaymentMethod, PaymentStatus, PromotionType, PublicationStatus, SupplierType, VerificationStatus, FormatUnit } from '../types';
import { VERIFICATION_LABELS } from '../domain/format';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  en_attente: 'En attente',
  confirmee: 'Confirmée',
  en_preparation: 'En préparation',
  expediee: 'Expédiée',
  livree: 'Livrée',
  annulee: 'Annulée',
};
export const ORDER_FLOW: OrderStatus[] = ['en_attente', 'confirmee', 'en_preparation', 'expediee', 'livree'];

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  a_planifier: 'À planifier',
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  livree: 'Livrée',
  echec: 'Échec de livraison',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  demo_paiement_livraison: 'Paiement à la livraison (démo)',
  demo_mobile_money: 'Mobile money (simulation)',
  demo_carte: 'Carte bancaire (simulation)',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  non_paye: 'Non payé',
  paye_simule: 'Payé (simulé)',
  rembourse_simule: 'Remboursé (simulé)',
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  entree: 'Entrée',
  sortie: 'Sortie',
  ajustement: 'Ajustement',
  retour: 'Retour',
  perte: 'Perte / casse',
};

export const PROMO_TYPE_LABELS: Record<PromotionType, string> = {
  pourcentage: 'Pourcentage',
  montant_fixe: 'Montant fixe (FCFA)',
  livraison_offerte: 'Livraison offerte',
};

export const PUBLICATION_LABELS: Record<PublicationStatus, string> = { brouillon: 'Brouillon', publie: 'Publié', archive: 'Archivé' };
export const CATEGORY_KIND_LABELS: Record<CategoryKind, string> = { alimentaire: 'Alimentaire', artisanat: 'Artisanat & textiles', autre: 'Autre' };
export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  producteur: 'Producteur',
  cooperative: 'Coopérative',
  transformateur: 'Transformateur',
  fournisseur: 'Fournisseur',
  artisan: 'Artisan',
};
export const UNIT_LABELS: Record<FormatUnit, string> = { g: 'g', kg: 'kg', ml: 'ml', l: 'l', piece: 'pièce' };

export const options = <K extends string>(labels: Record<K, string>) => (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));
export const VERIFICATION_OPTIONS = options<VerificationStatus>(VERIFICATION_LABELS);
