import type { Bundle, DeliveryZone, FCFA, Product, Promotion } from '../types';

export type CartLine =
  | { kind: 'produit'; productId: string; formatId: string; quantity: number }
  | { kind: 'coffret'; bundleId: string; quantity: number };

export interface PricedLine {
  key: string;
  line: CartLine;
  name: string;
  formatLabel: string;
  unitPrice: FCFA;
  quantity: number;
  lineTotal: FCFA;
  available: boolean;
}

export interface CartTotals {
  lines: PricedLine[];
  subtotal: FCFA;
  discount: FCFA;
  deliveryFee: FCFA;
  total: FCFA;
  promotion?: Promotion;
  promoError?: string;
  itemCount: number;
}

export function lineKey(line: CartLine): string {
  return line.kind === 'produit' ? `p:${line.productId}:${line.formatId}` : `b:${line.bundleId}`;
}

export function priceLines(lines: CartLine[], products: Product[], bundles: Bundle[]): PricedLine[] {
  return lines.map((line) => {
    if (line.kind === 'produit') {
      const p = products.find((x) => x.id === line.productId);
      const f = p?.formats.find((x) => x.id === line.formatId);
      const unitPrice = f?.price ?? 0;
      return {
        key: lineKey(line),
        line,
        name: p?.name ?? 'Produit indisponible',
        formatLabel: f?.label ?? '',
        unitPrice,
        quantity: line.quantity,
        lineTotal: unitPrice * line.quantity,
        available: Boolean(p && f && f.active && p.status === 'publie'),
      };
    }
    const b = bundles.find((x) => x.id === line.bundleId);
    const unitPrice = b?.price ?? 0;
    return {
      key: lineKey(line),
      line,
      name: b?.name ?? 'Coffret indisponible',
      formatLabel: 'Coffret',
      unitPrice,
      quantity: line.quantity,
      lineTotal: unitPrice * line.quantity,
      available: Boolean(b && b.active),
    };
  });
}

/** Renvoie un message d'erreur si le code promo ne peut pas s'appliquer. */
export function checkPromotion(promo: Promotion | undefined, subtotal: FCFA, now = new Date()): string | undefined {
  if (!promo) return 'Code promo inconnu.';
  if (!promo.active) return "Ce code promo n'est plus actif.";
  if (promo.startsAt && new Date(promo.startsAt) > now) return "Ce code promo n'est pas encore valable.";
  if (promo.endsAt && new Date(promo.endsAt) < now) return 'Ce code promo a expiré.';
  if (promo.usageLimit !== undefined && promo.usageCount >= promo.usageLimit) return "Ce code promo a atteint sa limite d'utilisation.";
  if (promo.minSubtotal && subtotal < promo.minSubtotal) return `Ce code nécessite un minimum d'achat de ${promo.minSubtotal} FCFA.`;
  return undefined;
}

export function deliveryFeeFor(zone: DeliveryZone | undefined, subtotal: FCFA): FCFA {
  if (!zone) return 0;
  if (zone.freeAbove !== undefined && zone.freeAbove > 0 && subtotal >= zone.freeAbove) return 0;
  return zone.fee;
}

export function computeTotals(params: {
  lines: CartLine[];
  products: Product[];
  bundles: Bundle[];
  promotions: Promotion[];
  promoCode?: string;
  zone?: DeliveryZone;
  now?: Date;
}): CartTotals {
  const priced = priceLines(params.lines, params.products, params.bundles);
  const subtotal = priced.filter((l) => l.available).reduce((s, l) => s + l.lineTotal, 0);
  let deliveryFee = deliveryFeeFor(params.zone, subtotal);
  let discount = 0;
  let promotion: Promotion | undefined;
  let promoError: string | undefined;

  const code = params.promoCode?.trim().toUpperCase();
  if (code) {
    const promo = params.promotions.find((p) => p.code.toUpperCase() === code);
    promoError = checkPromotion(promo, subtotal, params.now);
    if (!promoError && promo) {
      promotion = promo;
      if (promo.type === 'pourcentage') discount = Math.round((subtotal * Math.min(promo.value, 100)) / 100);
      else if (promo.type === 'montant_fixe') discount = Math.min(promo.value, subtotal);
      else deliveryFee = 0;
    }
  }

  return {
    lines: priced,
    subtotal,
    discount,
    deliveryFee,
    total: Math.max(0, subtotal - discount) + deliveryFee,
    promotion,
    promoError,
    itemCount: priced.reduce((s, l) => s + l.quantity, 0),
  };
}

export function minPrice(product: Product): FCFA | undefined {
  const prices = product.formats.filter((f) => f.active).map((f) => f.price);
  return prices.length ? Math.min(...prices) : undefined;
}
