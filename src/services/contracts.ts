/**
 * Interfaces de services de DIONDA STORE.
 *
 * Phase actuelle : implémentation locale (navigateur, localStorage) — voir ./local.
 * Phase SaaS : implémentation HTTP vers l'API NestJS — voir ./http.
 * L'interface utilisateur ne dépend QUE de ces contrats : changer d'implémentation
 * ne doit pas demander de modifier les écrans.
 */
import type {
  AuthSession,
  Bundle,
  Category,
  CreateInput,
  Customer,
  DeliveryZone,
  ID,
  ListQuery,
  Lot,
  Order,
  OrderStatus,
  DeliveryStatus,
  PaymentMethod,
  Product,
  Promotion,
  Region,
  Role,
  Shop,
  ShopSettings,
  StockMovement,
  Supplier,
  UpdateInput,
  ShopScoped,
} from '../types';
import type { CartLine } from '../domain/pricing';

export type Unsubscribe = () => void;

export interface Repository<T extends ShopScoped> {
  list(query?: ListQuery): Promise<T[]>;
  get(id: ID): Promise<T | undefined>;
  create(input: CreateInput<T>): Promise<T>;
  update(id: ID, patch: UpdateInput<T>): Promise<T>;
  remove(id: ID): Promise<void>;
  /** Notification de changement (côté SaaS : WebSocket / SSE ou re-fetch). */
  subscribe(listener: () => void): Unsubscribe;
}

export interface CheckoutInput {
  lines: CartLine[];
  customer: Pick<Customer, 'firstName' | 'lastName' | 'phone' | 'email' | 'address' | 'city'>;
  zoneId: ID;
  promoCode?: string;
  paymentMethod: PaymentMethod;
  note?: string;
}

export class ServiceError extends Error {
  constructor(message: string, public readonly code: 'validation' | 'stock' | 'not_found' | 'forbidden' | 'not_available') {
    super(message);
    this.name = 'ServiceError';
  }
}

export interface OrderService {
  /** Crée une commande de démonstration et réserve le stock (FEFO). */
  placeOrder(input: CheckoutInput, options?: { at?: string }): Promise<Order>;
  updateStatus(orderId: ID, status: OrderStatus, note?: string): Promise<Order>;
  updateDelivery(orderId: ID, patch: Partial<{ status: DeliveryStatus; courier: string; scheduledFor: string }>): Promise<Order>;
}

export interface InventoryService {
  recordMovement(input: CreateInput<StockMovement>): Promise<StockMovement>;
  /** Réception d'un lot : crée le lot et le mouvement d'entrée associé. */
  receiveLot(lot: CreateInput<Lot>, quantity: number, by: string): Promise<Lot>;
}

export interface SettingsService {
  get(): Promise<ShopSettings>;
  update(patch: Partial<ShopSettings>): Promise<ShopSettings>;
  subscribe(listener: () => void): Unsubscribe;
}

/**
 * Authentification. L'implémentation locale est SIMULÉE (isSimulated = true) :
 * elle ne protège rien. La vraie authentification (JWT/sessions, mots de passe
 * hachés, 2FA) sera assurée par l'API NestJS.
 */
export interface AuthService {
  readonly isSimulated: boolean;
  getSession(): AuthSession | null;
  signIn(email: string, role: Role): Promise<AuthSession>;
  signOut(): Promise<void>;
  subscribe(listener: () => void): Unsubscribe;
}

export interface ShopService {
  list(): Promise<Shop[]>;
  current(): Shop;
  create(name: string, options: { withDemoData: boolean }): Promise<Shop>;
  switchTo(shopId: ID): void;
  resetCurrent(): Promise<void>;
  subscribe(listener: () => void): Unsubscribe;
}

/** Stockage d'images (futur : S3 / Cloudinary via l'API). Non disponible en phase frontend. */
export interface MediaService {
  readonly available: boolean;
  upload(file: File): Promise<{ id: ID; url: string }>;
}

/** Paiement en ligne (futur : Wave, Orange Money, carte via prestataire). Non disponible. */
export interface PaymentService {
  readonly available: boolean;
  createPayment(orderId: ID): Promise<{ redirectUrl: string }>;
}

export interface Services {
  products: Repository<Product>;
  categories: Repository<Category>;
  regions: Repository<Region>;
  suppliers: Repository<Supplier>;
  lots: Repository<Lot>;
  movements: Repository<StockMovement>;
  customers: Repository<Customer>;
  orders: Repository<Order>;
  zones: Repository<DeliveryZone>;
  promotions: Repository<Promotion>;
  bundles: Repository<Bundle>;
  orderService: OrderService;
  inventory: InventoryService;
  settings: SettingsService;
  auth: AuthService;
  shops: ShopService;
  media: MediaService;
  payment: PaymentService;
}
