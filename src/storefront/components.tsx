import { useState, type ReactNode } from 'react';
import type { Bundle, Product, SourceRef } from '../types';
import { useCatalog } from '../store/catalog';
import { useCart } from '../store/cart';
import { formatFCFA } from '../domain/format';
import { minPrice } from '../domain/pricing';
import { Dialog } from '../ui/Dialog';
import { Tabs } from '../ui/Tabs';
import { Icon } from '../ui/Icon';
import { ProductVisual } from '../ui/ProductVisual';
import { VerificationBadge, useToast } from '../ui/common';
import { Link } from '../ui/router';
import { VITRINE } from '../app/mode';

const NR = <span className="muted">Non renseigné</span>;

function Field({ label, value }: { label: string; value?: ReactNode }) {
  const empty = value === undefined || value === null || value === '';
  return (
    <div className="kv">
      <dt>{label}</dt>
      <dd>{empty ? NR : value}</dd>
    </div>
  );
}

function Sources({ sources }: { sources: SourceRef[] }) {
  return (
    <section className="info-section">
      <h3>Sources documentaires</h3>
      {sources.length ? (
        <ul className="sources">
          {sources.map((s, i) => (
            <li key={i}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.label} <Icon name="external" size={13} />
                </a>
              ) : (
                s.label
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Aucune source documentaire n'est encore associée à cette fiche.</p>
      )}
    </section>
  );
}

function ListSection({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <section className="info-section">
      <h3>{title}</h3>
      {items.length ? (
        <ul className="bullets">
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">{empty}</p>
      )}
    </section>
  );
}

export function OriginContent({ product }: { product: Product }) {
  const { region, supplier } = useCatalog();
  const o = product.origin;
  const reg = region(o.regionId);
  const sup = supplier(o.supplierId);
  return (
    <div className="info">
      <VerificationBadge status={o.status} withHelp />
      <dl className="kvs">
        <Field label="Pays d'origine" value={o.country} />
        <Field label="Région de provenance" value={reg ? reg.name : undefined} />
        <Field label="Localité" value={o.locality} />
        <Field label="Producteur ou fournisseur" value={sup && sup.visibleOnStore ? sup.name : undefined} />
      </dl>
      {reg?.description && reg.visibleOnStore && (
        <section className="info-section">
          <h3>Le terroir</h3>
          <p>{reg.description}</p>
        </section>
      )}
      <section className="info-section">
        <h3>Histoire et tradition</h3>
        {o.story ? <p>{o.story}</p> : <p className="muted">L'histoire de ce produit n'a pas encore été documentée.</p>}
      </section>
      <section className="info-section">
        <h3>Méthode de production</h3>
        {o.productionMethod ? <p>{o.productionMethod}</p> : <p className="muted">Méthode de production non documentée à ce jour.</p>}
      </section>
      <Sources sources={o.sources} />
    </div>
  );
}

export function VirtuesContent({ product }: { product: Product }) {
  const v = product.virtues;
  return (
    <div className="info">
      <VerificationBadge status={v.status} withHelp />
      <section className="info-section">
        <h3>Valeurs nutritionnelles</h3>
        {v.nutrition.length ? (
          <table className="table table-compact">
            <caption className="sr-only">Valeurs nutritionnelles</caption>
            <thead>
              <tr>
                <th scope="col">Nutriment</th>
                <th scope="col">Quantité</th>
                <th scope="col">Pour</th>
              </tr>
            </thead>
            <tbody>
              {v.nutrition.map((n, i) => (
                <tr key={i}>
                  <td>{n.nutrient}</td>
                  <td>
                    {n.amount.toLocaleString('fr-FR')} {n.unit}
                  </td>
                  <td>{n.per}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Aucune valeur nutritionnelle n'est disponible pour ce produit à ce jour.</p>
        )}
      </section>
      <ListSection title="Bienfaits alimentaires documentés" items={v.benefits} empty="Aucun bienfait documenté n'est indiqué pour ce produit." />
      <ListSection title="Utilisations traditionnelles" items={v.traditionalUses} empty="Utilisations traditionnelles non renseignées." />
      <ListSection title="Conseils de préparation" items={v.preparationTips} empty="Conseils de préparation non renseignés." />
      <ListSection title="Précautions" items={v.precautions} empty="Aucune précaution particulière n'est renseignée. En cas de doute (allergie, grossesse, traitement), demandez conseil à un professionnel de santé." />
      <Sources sources={v.sources} />
      <p className="fineprint">Ces informations sont fournies à titre informatif et ne remplacent pas l'avis d'un professionnel de santé.</p>
    </div>
  );
}

export type InfoTab = 'origine' | 'vertus';

export function ProductInfoDialog({ product, tab, onClose, onTab }: { product: Product | null; tab: InfoTab; onClose: () => void; onTab: (t: InfoTab) => void }) {
  return (
    <Dialog open={Boolean(product)} onClose={onClose} title={product?.name ?? ''} subtitle="Origine et vertus du produit" size="lg">
      {product && (
        <Tabs
          label="Informations produit"
          active={tab}
          onChange={(t) => onTab(t as InfoTab)}
          tabs={[
            { id: 'origine', label: <><Icon name="pin" size={16} /> Origine</>, content: <OriginContent product={product} /> },
            { id: 'vertus', label: <><Icon name="leaf" size={16} /> Vertus</>, content: <VirtuesContent product={product} /> },
          ]}
        />
      )}
    </Dialog>
  );
}

/** Gestion de la fenêtre Origine/Vertus partagée par une liste de cartes. */
export function useInfoDialog() {
  const [state, setState] = useState<{ product: Product | null; tab: InfoTab }>({ product: null, tab: 'origine' });
  return {
    open: (product: Product, tab: InfoTab) => setState({ product, tab }),
    element: <ProductInfoDialog product={state.product} tab={state.tab} onClose={() => setState((s) => ({ ...s, product: null }))} onTab={(tab) => setState((s) => ({ ...s, tab }))} />,
  };
}

export function StockBadge({ qty }: { qty: number }) {
  if (qty <= 0) return <span className="stock stock-out">Rupture de stock</span>;
  if (qty <= 5) return <span className="stock stock-low">Plus que {qty} en stock</span>;
  return <span className="stock stock-ok">En stock</span>;
}

export function ProductCard({ product, onInfo }: { product: Product; onInfo: (p: Product, t: InfoTab) => void }) {
  const { category, available } = useCatalog();
  const cart = useCart();
  const toast = useToast();
  const formats = product.formats.filter((f) => f.active);
  const [formatId, setFormatId] = useState(formats[0]?.id ?? '');
  const format = formats.find((f) => f.id === formatId) ?? formats[0];
  const qty = format ? available(product.id, format.id) : 0;
  const cat = category(product.categoryId);
  const from = minPrice(product);

  return (
    <article className="pcard">
      <Link to={`/produit/${product.slug}`} className="pcard-media" aria-label={`Voir la fiche ${product.name}`}>
        <ProductVisual visual={product.visual} />
        {product.isExample && <span className="ribbon">Exemple</span>}
      </Link>
      <div className="pcard-body">
        <p className="eyebrow">{cat?.name}</p>
        <h3 className="pcard-title">
          <Link to={`/produit/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="pcard-desc">{product.shortDescription}</p>
        <div className="pcard-info">
          <button type="button" className="chip-btn" onClick={() => onInfo(product, 'origine')} aria-haspopup="dialog">
            <Icon name="pin" size={15} /> Origine
          </button>
          <button type="button" className="chip-btn" onClick={() => onInfo(product, 'vertus')} aria-haspopup="dialog">
            <Icon name="leaf" size={15} /> Vertus
          </button>
        </div>
        {VITRINE ? (
          <div className="pcard-buy">
            <span className="pcard-format">{formats.map((f) => f.label).join(' · ')}</span>
            <Link to={`/produit/${product.slug}`} className="btn btn-outline btn-sm">
              Voir le produit
            </Link>
          </div>
        ) : (
        <div className="pcard-buy">
          {formats.length > 1 ? (
            <label className="sr-only" htmlFor={`fmt-${product.id}`}>
              Format
            </label>
          ) : null}
          {formats.length > 1 ? (
            <select id={`fmt-${product.id}`} className="select select-sm" value={format?.id} onChange={(e: { target: { value: string } }) => setFormatId(e.target.value)}>
              {formats.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label} — {formatFCFA(f.price)}
                </option>
              ))}
            </select>
          ) : (
            <span className="pcard-format">{format?.label}</span>
          )}
          <div className="pcard-row">
            <div>
              <p className="price">{format ? formatFCFA(format.price) : from !== undefined ? formatFCFA(from) : '—'}</p>
              <StockBadge qty={qty} />
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!format || qty <= 0}
              onClick={() => {
                if (!format) return;
                cart.add({ kind: 'produit', productId: product.id, formatId: format.id, quantity: 1 });
                toast(`${product.name} (${format.label}) ajouté au panier`);
              }}
            >
              <Icon name="cart" size={16} /> Ajouter
            </button>
          </div>
        </div>
        )}
      </div>
    </article>
  );
}

export function BundleCard({ bundle }: { bundle: Bundle }) {
  const { allProducts, bundleAvailable } = useCatalog();
  const cart = useCart();
  const toast = useToast();
  const qty = bundleAvailable(bundle.id);
  const worth = bundle.items.reduce((s, it) => {
    const f = allProducts.find((p) => p.id === it.productId)?.formats.find((x) => x.id === it.formatId);
    return s + (f?.price ?? 0) * it.quantity;
  }, 0);
  return (
    <article className="bcard">
      <div className="bcard-media">
        <ProductVisual visual={bundle.visual} />
      </div>
      <div className="bcard-body">
        <p className="eyebrow">Coffret</p>
        <h3 className="pcard-title">{bundle.name}</h3>
        <p className="pcard-desc">{bundle.description}</p>
        <ul className="bundle-items">
          {bundle.items.map((it, i) => {
            const p = allProducts.find((x) => x.id === it.productId);
            const f = p?.formats.find((x) => x.id === it.formatId);
            return (
              <li key={i}>
                {it.quantity} × {p?.name ?? 'Produit retiré'} <span className="muted">({f?.label})</span>
              </li>
            );
          })}
        </ul>
        {VITRINE ? (
          <p className="pcard-format">Bientôt disponible</p>
        ) : (
        <div className="pcard-row">
          <div>
            <p className="price">
              {formatFCFA(bundle.price)} {worth > bundle.price && <s className="muted price-old">{formatFCFA(worth)}</s>}
            </p>
            <StockBadge qty={qty} />
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={qty <= 0}
            onClick={() => {
              cart.add({ kind: 'coffret', bundleId: bundle.id, quantity: 1 });
              toast(`${bundle.name} ajouté au panier`);
            }}
          >
            <Icon name="cart" size={16} /> Ajouter
          </button>
        </div>
        )}
      </div>
    </article>
  );
}
