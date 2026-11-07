import type { ID, ShopScoped, SourceRef, VerificationStatus } from './common';

/** Région / terroir de provenance. */
export interface Region extends ShopScoped {
  name: string;
  country: string;
  description: string;
  visibleOnStore: boolean;
  status: VerificationStatus;
  sources: SourceRef[];
}

export type SupplierType = 'producteur' | 'cooperative' | 'transformateur' | 'fournisseur' | 'artisan';

export interface Supplier extends ShopScoped {
  name: string;
  type: SupplierType;
  regionId?: ID;
  locality: string;
  contactName: string;
  phone: string;
  email: string;
  story: string;
  visibleOnStore: boolean;
  status: VerificationStatus;
}
