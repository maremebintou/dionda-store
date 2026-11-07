import type { ID, ISODate, ShopScoped } from './common';

/** Lot de production / réception, base de la traçabilité. */
export interface Lot extends ShopScoped {
  productId: ID;
  formatId: ID;
  lotNumber: string;
  supplierId?: ID;
  receivedAt: ISODate;
  productionDate?: ISODate;
  expiryDate?: ISODate; // date limite (DLC / DDM)
  storageConditions: string;
  notes: string;
}

export type MovementType = 'entree' | 'sortie' | 'ajustement' | 'retour' | 'perte';

export interface StockMovement extends ShopScoped {
  productId: ID;
  formatId: ID;
  lotId?: ID;
  type: MovementType;
  /** Quantité signée : positive = entrée en stock, négative = sortie. */
  quantity: number;
  reason: string;
  orderId?: ID;
  at: ISODate;
  by: string;
}

export interface StockLevel {
  productId: ID;
  formatId: ID;
  quantity: number;
  threshold: number;
  state: 'ok' | 'bas' | 'rupture';
}

export interface LotLevel {
  lotId: ID;
  quantity: number;
}
