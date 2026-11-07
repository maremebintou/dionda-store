import { useMemo, useState } from 'react';
import { useCart } from '../store/cart';
import { useCatalog } from '../store/catalog';
import { computeTotals, type CartLine } from '../domain/pricing';
import { formatFCFA } from '../domain/format';
import { services } from '../app/services';
import { useCollection, useDocumentTitle } from '../app/hooks';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';
import { Link, navigate } from '../ui/router';
import { Empty, Notice, QtyStepper, useToast } from '../ui/common';
import { ProductVisual } from '../ui/ProductVisual';
import { ServiceError } from '../services/contracts';
import type { PaymentMethod } from '../types';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../admin/labels';

function useCartTotals(zoneId?: string, promoCode?: string) {
  const cart = useCart();
  const { products, bundles, promotions, zones } = useCatalog();
  return useMemo(
    () => computeTotals({ lines: cart.lines, products, bundles, promotions, promoCode, zone: zones.find((z) => z.id === zoneId) }),
    [cart.lines, products, bundles, promotions, zones, zoneId, promoCode],
  );
}

function maxFor(line: CartLine, cat: ReturnType<typeof useCatalog>) {
  return line.kind === 'produit' ? cat.available(line.productId, line.formatId) : cat.bundleAvailable(line.bundleId);
}

function LineVisual({ line }: { line: CartLine }) {
  const { allProducts, bundles } = useCatalog();
  const v = line.kind === 'produit' ? allProducts.find((p) => p.id === line.productId)?.visual : bundles.find((b) => b.id === line.bundleId)?.visual;
  return v ? <ProductVisual visual={v} className="line-visual" /> : <span className="line-visual" />;
}

export function CartDrawer() {
  const cart = useCart();
  const cat = useCatalog();
  const totals = useCartTotals();
  return (
    <Dialog open={cart.isOpen} onClose={cart.close} title="Votre panier" subtitle={totals.itemCount ? `${totals.itemCount} article${totals.itemCount > 1 ? 's' : ''}` : undefined} side
      footer={
        totals.lines.length ? (
          <div className="drawer-foot">
            <div className="sum-row sum-strong">
              <span>Sous-total</span>
              <span>{formatFCFA(totals.subtotal)}</span>
            </div>
            <p className="muted small">Frais de livraison et codes promo calculés à l'étape suivante.</p>
            <button
              type="button"
              className="btn btn-primary btn-lg btn-block"
              onClick={() => {
                cart.close();
                navigate('/commande');
              }}
            >
              Passer la commande
            </button>
          </div>
        ) : undefined
      }
    >
      {totals.lines.length ? (
        <ul className="cart-lines">
          {totals.lines.map((l) => {
            const max = maxFor(l.line, cat);
            return (
              <li key={l.key} className={`cart-line ${!l.available ? 'unavailable' : ''}`}>
                <LineVisual line={l.line} />
                <div className="cart-line-main">
                  <p className="cart-line-name">{l.name}</p>
                  <p className="muted small">
                    {l.formatLabel} · {formatFCFA(l.unitPrice)}
                  </p>
                  {!l.available && <p className="error small">Ce produit n'est plus disponible.</p>}
                  {l.available && l.quantity > max && <p className="error small">Stock disponible : {max}</p>}
                  <div className="cart-line-actions">
                    <QtyStepper value={l.quantity} onChange={(n) => cart.setQuantity(l.key, n)} max={Math.max(1, max)} label={`Quantité pour ${l.name}`} />
                    <button type="button" className="icon-btn" aria-label={`Retirer ${l.name} du panier`} onClick={() => cart.remove(l.key)}>
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </div>
                <p className="cart-line-total">{formatFCFA(l.lineTotal)}</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty title="Votre panier est vide.">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              cart.close();
              navigate('/boutique');
            }}
          >
            Découvrir la boutique
          </button>
        </Empty>
      )}
    </Dialog>
  );
}

export function CheckoutPage() {
  const cart = useCart();
  const cat = useCatalog();
  const toast = useToast();
  useDocumentTitle('Commande');
  const zones = cat.zones.filter((z) => z.active);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', address: '', city: '', note: '' });
  const [zoneId, setZoneId] = useState('');
  const [promoInput, setPromoInput] = useState(cart.promoCode);
  const [payment, setPayment] = useState<PaymentMethod>('demo_paiement_livraison');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const totals = useCartTotals(zoneId, cart.promoCode);
  const zone = zones.find((z) => z.id === zoneId);

  if (!cart.lines.length)
    return (
      <div className="container page">
        <Empty title="Votre panier est vide.">
          <Link to="/boutique" className="btn btn-outline">
            Découvrir la boutique
          </Link>
        </Empty>
      </div>
    );

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = 'Indiquez votre prénom.';
    if (!form.lastName.trim()) e.lastName = 'Indiquez votre nom.';
    if (!/^[+\d\s().-]{7,}$/.test(form.phone.trim())) e.phone = 'Indiquez un numéro de téléphone valide.';
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) e.email = 'Adresse e-mail invalide.';
    if (!form.address.trim()) e.address = 'Indiquez votre adresse de livraison.';
    if (!form.city.trim()) e.city = 'Indiquez votre ville ou quartier.';
    if (!zoneId) e.zone = 'Choisissez une zone de livraison.';
    setErrors(e);
    return e;
  };

  const submit = async (ev: { preventDefault(): void }) => {
    ev.preventDefault();
    setSubmitError('');
    const e = validate();
    if (Object.keys(e).length) {
      const first = Object.keys(e)[0];
      document.getElementById(`co-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const order = await services.orderService.placeOrder({ lines: cart.lines, customer: form, zoneId, promoCode: cart.promoCode || undefined, paymentMethod: payment, note: form.note });
      cart.clear();
      cart.setPromoCode('');
      toast(`Commande ${order.number} enregistrée`);
      navigate(`/confirmation/${order.number}`);
    } catch (err) {
      setSubmitError(err instanceof ServiceError ? err.message : "Une erreur inattendue s'est produite.");
    } finally {
      setBusy(false);
    }
  };

  const input = (k: keyof typeof form, label: string, opts: { type?: string; autoComplete?: string; optional?: boolean; wide?: boolean } = {}) => (
    <div className={`field ${opts.wide ? 'field-wide' : ''}`}>
      <label className="label" htmlFor={`co-${k}`}>
        {label} {opts.optional && <span className="muted">(facultatif)</span>}
      </label>
      <input id={`co-${k}`} className={`input ${errors[k] ? 'invalid' : ''}`} type={opts.type ?? 'text'} autoComplete={opts.autoComplete} value={form[k]} onChange={set(k)} aria-invalid={Boolean(errors[k])} aria-describedby={errors[k] ? `co-${k}-err` : undefined} />
      {errors[k] && (
        <p className="error small" id={`co-${k}-err`}>
          {errors[k]}
        </p>
      )}
    </div>
  );

  return (
    <div className="container page">
      <header className="page-head">
        <h1 className="page-title">Finaliser ma commande</h1>
      </header>
      <Notice tone="warn" title="Commande de démonstration.">
        Aucun paiement n'est demandé et aucune livraison n'est déclenchée. La commande est enregistrée uniquement dans ce navigateur.
      </Notice>
      <form className="checkout" onSubmit={submit} noValidate>
        <div className="checkout-main">
          <fieldset className="panel">
            <legend className="panel-title">1. Vos coordonnées</legend>
            <div className="form-grid">
              {input('firstName', 'Prénom', { autoComplete: 'given-name' })}
              {input('lastName', 'Nom', { autoComplete: 'family-name' })}
              {input('phone', 'Téléphone', { type: 'tel', autoComplete: 'tel' })}
              {input('email', 'E-mail', { type: 'email', autoComplete: 'email', optional: true })}
            </div>
          </fieldset>
          <fieldset className="panel">
            <legend className="panel-title">2. Livraison</legend>
            <div className="form-grid">
              {input('address', 'Adresse', { autoComplete: 'street-address', wide: true })}
              {input('city', 'Ville / quartier', { autoComplete: 'address-level2' })}
              <div className="field">
                <label className="label" htmlFor="co-zone">
                  Zone de livraison
                </label>
                <select id="co-zone" className={`select ${errors.zone ? 'invalid' : ''}`} value={zoneId} onChange={(e: { target: { value: string } }) => setZoneId(e.target.value)} aria-invalid={Boolean(errors.zone)}>
                  <option value="">Choisir…</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} — {formatFCFA(z.fee)} · {z.estimatedDelay}
                    </option>
                  ))}
                </select>
                {errors.zone && <p className="error small">{errors.zone}</p>}
                {zone && (
                  <p className="muted small">
                    {zone.cities.join(', ')}
                    {zone.freeAbove ? ` · offerte dès ${formatFCFA(zone.freeAbove)}` : ''}
                  </p>
                )}
              </div>
              <div className="field field-wide">
                <label className="label" htmlFor="co-note">
                  Instructions de livraison <span className="muted">(facultatif)</span>
                </label>
                <textarea id="co-note" className="input" rows={2} value={form.note} onChange={set('note')} />
              </div>
            </div>
          </fieldset>
          <fieldset className="panel">
            <legend className="panel-title">3. Paiement (simulation)</legend>
            <div className="pay-options">
              {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                <label key={m} className={`pay-opt ${payment === m ? 'selected' : ''}`}>
                  <input type="radio" name="payment" value={m} checked={payment === m} onChange={() => setPayment(m)} />
                  {PAYMENT_METHOD_LABELS[m]}
                </label>
              ))}
            </div>
            <p className="muted small">Le paiement en ligne (mobile money, carte) sera branché avec l'API. Aucune donnée bancaire n'est demandée ici.</p>
          </fieldset>
        </div>
        <aside className="checkout-side panel">
          <h2 className="panel-title">Récapitulatif</h2>
          <ul className="summary-lines">
            {totals.lines.map((l) => (
              <li key={l.key}>
                <span>
                  {l.quantity} × {l.name} <span className="muted">({l.formatLabel})</span>
                </span>
                <span>{formatFCFA(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="promo">
            <label className="label" htmlFor="co-promo">
              Code promo
            </label>
            <div className="promo-row">
              <input id="co-promo" className="input" value={promoInput} onChange={(e: { target: { value: string } }) => setPromoInput(e.target.value.toUpperCase())} placeholder="BIENVENUE10" />
              <button type="button" className="btn btn-outline" onClick={() => cart.setPromoCode(promoInput.trim())}>
                Appliquer
              </button>
            </div>
            {cart.promoCode && totals.promoError && <p className="error small" role="alert">{totals.promoError}</p>}
            {totals.promotion && (
              <p className="ok small">
                <Icon name="check" size={14} /> {totals.promotion.label} appliqué{' '}
                <button type="button" className="link-btn" onClick={() => { cart.setPromoCode(''); setPromoInput(''); }}>
                  retirer
                </button>
              </p>
            )}
          </div>
          <dl className="sums">
            <div className="sum-row">
              <dt>Sous-total</dt>
              <dd>{formatFCFA(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="sum-row ok">
                <dt>Remise</dt>
                <dd>− {formatFCFA(totals.discount)}</dd>
              </div>
            )}
            <div className="sum-row">
              <dt>Livraison</dt>
              <dd>{zone ? (totals.deliveryFee ? formatFCFA(totals.deliveryFee) : 'Offerte') : 'Choisir une zone'}</dd>
            </div>
            <div className="sum-row sum-strong">
              <dt>Total</dt>
              <dd>{formatFCFA(totals.total)}</dd>
            </div>
          </dl>
          {submitError && (
            <p className="error" role="alert">
              {submitError}
            </p>
          )}
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Valider la commande de démonstration'}
          </button>
        </aside>
      </form>
    </div>
  );
}

export function ConfirmationPage({ number }: { number: string }) {
  const orders = useCollection(services.orders);
  const { zones } = useCatalog();
  useDocumentTitle('Commande enregistrée');
  const order = orders.find((o) => o.number === number);
  if (!order)
    return (
      <div className="container page">
        <Empty title="Commande introuvable." />
      </div>
    );
  const zone = zones.find((z) => z.id === order.delivery.zoneId);
  return (
    <div className="container page narrow">
      <div className="confirm">
        <span className="confirm-icon">
          <Icon name="check" size={34} />
        </span>
        <h1 className="page-title">Merci {order.customerName.split(' ')[0]} !</h1>
        <p className="page-lead">
          Votre commande de démonstration <strong>{order.number}</strong> est enregistrée.
        </p>
        <Notice tone="info">Il s'agit d'une démonstration : aucun paiement n'a été effectué et aucune livraison ne sera réalisée.</Notice>
      </div>
      <div className="panel">
        <h2 className="panel-title">Détail</h2>
        <ul className="summary-lines">
          {order.lines.map((l, i) => (
            <li key={i}>
              <span>
                {l.quantity} × {l.name} <span className="muted">({l.formatLabel})</span>
              </span>
              <span>{formatFCFA(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="sums">
          {order.discount > 0 && (
            <div className="sum-row ok">
              <dt>Remise {order.promotionCode}</dt>
              <dd>− {formatFCFA(order.discount)}</dd>
            </div>
          )}
          <div className="sum-row">
            <dt>Livraison ({zone?.name})</dt>
            <dd>{order.deliveryFee ? formatFCFA(order.deliveryFee) : 'Offerte'}</dd>
          </div>
          <div className="sum-row sum-strong">
            <dt>Total</dt>
            <dd>{formatFCFA(order.total)}</dd>
          </div>
        </dl>
        <p className="small">
          Statut : <strong>{ORDER_STATUS_LABELS[order.status]}</strong> · {PAYMENT_METHOD_LABELS[order.paymentMethod]} · Délai indicatif : {zone?.estimatedDelay}
        </p>
      </div>
      <div className="center">
        <Link to="/boutique" className="btn btn-outline">
          Continuer mes achats
        </Link>
      </div>
    </div>
  );
}
