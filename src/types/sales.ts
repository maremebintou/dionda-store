import type { FCFA, ID, ISODate, ShopScoped } from './common';

export interface Customer extends ShopScoped {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  zoneId?: ID;
  notes: string;
}

export interface DeliveryZone extends ShopScoped {
  name: string;
  cities: string[];
  fee: FCFA;
  freeAbove?: FCFA;
  estimatedDelay: string; // ex. "24 à 48 h"
  active: boolean;
}

export type OrderStatus = 'en_attente' | 'confirmee' | 'en_preparation' | 'expediee' | 'livree' | 'annulee';
export type DeliveryStatus = 'a_planifier' | 'planifiee' | 'en_cours' | 'livree' | 'echec';
export type PaymentMethod = 'demo_paiement_livraison' | 'demo_mobile_money' | 'demo_carte';
export type PaymentStatus = 'non_paye' | 'paye_simule' | 'rembourse_simule';

export interface OrderLineAllocation {
  productId: ID;
  formatId: ID;
  lotId?: ID;
  quantity: number;
}

export interface OrderLine {
  kind: 'produit' | 'coffret';
  refId: ID; // productId ou bundleId
  formatId?: ID;
  name: string;
  formatLabel: string;
  unitPrice: FCFA;
  quantity: number;
  lineTotal: FCFA;
  allocations: OrderLineAllocation[]; // lots prélevés (traçabilité)
}

export interface OrderEvent {
  at: ISODate;
  status: OrderStatus;
  note: string;
}

export interface OrderDelivery {
  zoneId: ID;
  address: string;
  city: string;
  status: DeliveryStatus;
  courier: string;
  scheduledFor?: ISODate;
}

export interface Order extends ShopScoped {
  number: string;
  customerId: ID;
  customerName: string;
  customerPhone: string;
  lines: OrderLine[];
  subtotal: FCFA;
  discount: FCFA;
  deliveryFee: FCFA;
  total: FCFA;
  promotionCode?: string;
  delivery: OrderDelivery;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  history: OrderEvent[];
  note: string;
  /** Toujours vrai pendant la phase frontend : aucune commande réelle n'est transmise. */
  isDemo: true;
}
