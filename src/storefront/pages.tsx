import { useMemo, useState } from 'react';
import { useCatalog } from '../store/catalog';
import { useCart } from '../store/cart';
import { useDocumentTitle, useSettings } from '../app/hooks';
import { Link, navigate } from '../ui/router';
import { Icon } from '../ui/Icon';
import { ProductVisual, resolvePhoto } from '../ui/ProductVisual';
import { Tabs } from '../ui/Tabs';
import { Empty, Notice, QtyStepper, useToast, VerificationBadge as VerificationBadgeLite } from '../ui/common';
import { SUPPLIER_TYPE_LABELS } from '../admin/labels';
import { formatFCFA } from '../domain/format';
import { minPrice } from '../domain/pricing';
import { BundleCard, OriginContent, ProductCard, StockBadge, VirtuesContent, useInfoDialog } from './components';
import type { Product } from '../types';
import { VITRINE } from '../app/mode';

export function HomePage() {
  const { products, categories, bundles, regions } = useCatalog();
  const settings = useSettings();
  const info = useInfoDialog();
  useDocumentTitle('');
  const featured = products.filter((p) => p.featured).slice(0, 8);
  // Bandeau : les 3 produits choisis dans Paramètres › Page d'accueil, sinon les premiers produits mis en avant.
  const chosen = [settings.homeHero?.first, settings.homeHero?.second, settings.homeHero?.third]
    .map((slug) => products.find((p) => p.slug === slug))
    .filter((p): p is Product => Boolean(p));
  const heroProducts = (chosen.length ? chosen : featured.filter((p, i, a) => !p.visual.photo || a.findIndex((x) => x.visual.photo === p.visual.photo) === i)).slice(0, 3);
  const regionsWithProducts = regions.filter((r) => r.visibleOnStore && products.some((p) => p.origin.regionId === r.id));

  return (
    <>
      <section className="hero">
        <div className="hero-pattern" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-text">
            <p className="eyebrow eyebrow-light">Terroirs du Sénégal et d'Afrique de l'Ouest</p>
            <h1 className="hero-title">{settings.slogan}</h1>
            <p className="hero-lead">Céréales, condiments, huiles, poudres et artisanat : des produits choisis, présentés avec transparence sur leur origine et leurs usages.</p>
            <div className="hero-cta">
              <Link to="/boutique" className="btn btn-gold btn-lg">
                Découvrir la boutique <Icon name="chevron" size={18} />
              </Link>
              <Link to="/terroirs" className="btn btn-ghost-light btn-lg">
                Nos terroirs
              </Link>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            {heroProducts.map((p, i) => (
              <div key={p.id} className={`hero-tile hero-tile-${i}`}>
                <ProductVisual visual={p.visual} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="values container">
        {[
          ['pin', 'Origine affichée', "Pays, région, localité et producteur, lorsqu'ils sont connus."],
          ['shield', 'Transparence', 'Chaque information porte son niveau de vérification.'],
          ['lot', 'Traçabilité', 'Lots, dates limites et conditions de conservation suivis.'],
          VITRINE ? ['truck', 'Bientôt', 'Commande en ligne et livraison arrivent bientôt.'] : ['truck', 'Livraison', 'Zones desservies et frais affichés avant la commande.'],
        ].map(([icon, t, d]) => (
          <div className="value" key={t}>
            <span className="value-icon">
              <Icon name={icon} size={22} />
            </span>
            <div>
              <h2 className="value-title">{t}</h2>
              <p>{d}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="section container">
        <div className="section-head">
          <h2 className="section-title">Nos catégories</h2>
          <Link to="/boutique" className="link-more">
            Tout voir <Icon name="chevron" size={16} />
          </Link>
        </div>
        <div className="cat-grid">
          {categories
            .filter((c) => c.visible)
            .map((c) => {
              const sample = products.find((p) => p.categoryId === c.id);
              const n = products.filter((p) => p.categoryId === c.id).length;
              return (
                <Link key={c.id} to={`/boutique?cat=${c.slug}`} className={`cat-card ${c.kind === 'artisanat' ? 'cat-card-art' : ''}`}>
                  {sample && <ProductVisual visual={sample.visual} className="cat-visual" />}
                  <span className="cat-name">{c.name}</span>
                  <span className="cat-count">{n ? `${n} produit${n > 1 ? 's' : ''}` : 'Bientôt disponible'}</span>
                </Link>
              );
            })}
        </div>
      </section>

      <section className="section section-sand">
        <div className="container">
          <div className="section-head">
            <h2 className="section-title">Sélection du moment</h2>
          </div>
          <div className="pgrid">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} onInfo={info.open} />
            ))}
          </div>
        </div>
      </section>

      {bundles.some((b) => b.active) && (
        <section className="section container">
          <div className="section-head">
            <h2 className="section-title">Coffrets</h2>
            <Link to="/coffrets" className="link-more">
              Tous les coffrets <Icon name="chevron" size={16} />
            </Link>
          </div>
          <div className="bgrid">
            {bundles
              .filter((b) => b.active)
              .slice(0, 2)
              .map((b) => (
                <BundleCard key={b.id} bundle={b} />
              ))}
          </div>
        </section>
      )}

      <section className="section section-indigo">
        <div className="container terroir-teaser">
          <div>
            <p className="eyebrow eyebrow-light">Terroirs</p>
            <h2 className="section-title section-title-light">D'où viennent nos produits</h2>
            <p className="lead-light">Kédougou, Ziguinchor, Kaolack, Mali… Chaque provenance est indiquée avec son niveau de vérification.</p>
            <Link to="/terroirs" className="btn btn-gold">
              Explorer les terroirs
            </Link>
          </div>
          <ul className="terroir-list">
            {regionsWithProducts.map((r) => (
              <li key={r.id}>
                <Link to={`/terroirs#${r.id}`}>
                  <Icon name="pin" size={18} /> <strong>{r.name}</strong> <span>{r.country}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      {info.element}
    </>
  );
}

type Sort = 'pertinence' | 'prix-asc' | 'prix-desc' | 'nom';

export function CatalogPage({ query }: { query: URLSearchParams }) {
  const { products, categories, regions, available } = useCatalog();
  const info = useInfoDialog();
  const catSlug = query.get('cat') ?? '';
  const q = query.get('q') ?? '';
  const [sort, setSort] = useState<Sort>('pertinence');
  const [regionId, setRegionId] = useState('');
  const [inStock, setInStock] = useState(false);
  const cat = categories.find((c) => c.slug === catSlug);
  useDocumentTitle(cat?.name ?? 'Boutique');

  const list = useMemo(() => {
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    let l = products.filter((p) => (!cat || p.categoryId === cat.id) && (!regionId || p.origin.regionId === regionId));
    if (q) l = l.filter((p) => norm(`${p.name} ${p.shortDescription} ${p.tags.join(' ')}`).includes(norm(q)));
    if (inStock) l = l.filter((p) => p.formats.some((f) => f.active && available(p.id, f.id) > 0));
    const price = (p: Product) => minPrice(p) ?? 0;
    if (sort === 'prix-asc') l = [...l].sort((a, b) => price(a) - price(b));
    if (sort === 'prix-desc') l = [...l].sort((a, b) => price(b) - price(a));
    if (sort === 'nom') l = [...l].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    return l;
  }, [products, cat, q, sort, regionId, inStock, available]);

  const setParam = (k: string, v: string) => {
    const p = new URLSearchParams(query);
    if (v) p.set(k, v);
    else p.delete(k);
    const s = p.toString();
    navigate(`/boutique${s ? `?${s}` : ''}`);
  };

  return (
    <div className="container page">
      <nav className="crumbs" aria-label="Fil d'Ariane">
        <Link to="/">Accueil</Link> <Icon name="chevron" size={14} /> {cat ? <><Link to="/boutique">Boutique</Link> <Icon name="chevron" size={14} /> <span>{cat.name}</span></> : <span>Boutique</span>}
      </nav>
      <header className="page-head">
        <h1 className="page-title">{cat?.name ?? 'Toute la boutique'}</h1>
        {cat && <p className="page-lead">{cat.description}</p>}
        {q && (
          <p className="page-lead">
            Résultats pour « {q} » — <button type="button" className="link-btn" onClick={() => setParam('q', '')}>effacer la recherche</button>
          </p>
        )}
      </header>
      <div className="catalog">
        <aside className="filters" aria-label="Filtres">
          <h2 className="filters-title">Catégories</h2>
          <ul className="filter-list">
            <li>
              <button type="button" className={`filter ${!cat ? 'active' : ''}`} aria-pressed={!cat} onClick={() => setParam('cat', '')}>
                Toutes les catégories
              </button>
            </li>
            {categories
              .filter((c) => c.visible)
              .map((c) => (
                <li key={c.id}>
                  <button type="button" className={`filter ${cat?.id === c.id ? 'active' : ''}`} aria-pressed={cat?.id === c.id} onClick={() => setParam('cat', c.slug)}>
                    {c.name}
                    <span className="filter-count">{products.filter((p) => p.categoryId === c.id).length}</span>
                  </button>
                </li>
              ))}
          </ul>
          <label className="field">
            <span className="label">Terroir</span>
            <select className="select" value={regionId} onChange={(e: { target: { value: string } }) => setRegionId(e.target.value)}>
              <option value="">Tous les terroirs</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          {!VITRINE && (
            <label className="check">
              <input type="checkbox" checked={inStock} onChange={(e: { target: { checked: boolean } }) => setInStock(e.target.checked)} /> En stock uniquement
            </label>
          )}
        </aside>
        <section aria-label="Produits">
          <div className="catalog-bar">
            <p aria-live="polite">{list.length} produit{list.length > 1 ? 's' : ''}</p>
            <label className="inline-field">
              <span>Trier par</span>
              <select className="select select-sm" value={sort} onChange={(e: { target: { value: string } }) => setSort(e.target.value as Sort)}>
                <option value="pertinence">Pertinence</option>
                {!VITRINE && <option value="prix-asc">Prix croissant</option>}
                {!VITRINE && <option value="prix-desc">Prix décroissant</option>}
                <option value="nom">Nom (A → Z)</option>
              </select>
            </label>
          </div>
          {list.length ? (
            <div className="pgrid">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} onInfo={info.open} />
              ))}
            </div>
          ) : (
            <Empty title="Aucun produit ne correspond à votre recherche.">
              <button type="button" className="btn btn-outline" onClick={() => navigate('/boutique')}>
                Voir toute la boutique
              </button>
            </Empty>
          )}
        </section>
      </div>
      {info.element}
    </div>
  );
}

export function BundlesPage() {
  const { bundles } = useCatalog();
  useDocumentTitle('Coffrets');
  const active = bundles.filter((b) => b.active);
  return (
    <div className="container page">
      <header className="page-head">
        <h1 className="page-title">Coffrets</h1>
        <p className="page-lead">Des assortiments de produits du terroir, à offrir ou à découvrir.</p>
      </header>
      {active.length ? (
        <div className="bgrid">
          {active.map((b) => (
            <BundleCard key={b.id} bundle={b} />
          ))}
        </div>
      ) : (
        <Empty title="Aucun coffret disponible pour le moment." />
      )}
    </div>
  );
}

export function ProductPage({ slug }: { slug: string }) {
  const { products, category, region, available, supplier } = useCatalog();
  const cart = useCart();
  const toast = useToast();
  const product = products.find((p) => p.slug === slug);
  const [formatId, setFormatId] = useState('');
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('description');
  const info = useInfoDialog();
  useDocumentTitle(product?.name ?? 'Produit introuvable');

  if (!product)
    return (
      <div className="container page">
        <Empty title="Ce produit est introuvable ou n'est plus disponible.">
          <Link to="/boutique" className="btn btn-outline">
            Retour à la boutique
          </Link>
        </Empty>
      </div>
    );

  const formats = product.formats.filter((f) => f.active);
  const format = formats.find((f) => f.id === formatId) ?? formats[0];
  const stock = format ? available(product.id, format.id) : 0;
  const inCart = cart.lines.filter((l) => l.kind === 'produit' && l.productId === product.id && l.formatId === format?.id).reduce((s, l) => s + l.quantity, 0);
  const max = Math.max(0, stock - inCart);
  const cat = category(product.categoryId);
  const reg = region(product.origin.regionId);
  const related = products.filter((p) => p.categoryId === product.categoryId && p.id !== product.id).slice(0, 4);
  const sup = supplier(product.origin.supplierId);

  return (
    <div className="container page">
      <nav className="crumbs" aria-label="Fil d'Ariane">
        <Link to="/">Accueil</Link> <Icon name="chevron" size={14} /> <Link to="/boutique">Boutique</Link> <Icon name="chevron" size={14} />
        {cat && (
          <>
            <Link to={`/boutique?cat=${cat.slug}`}>{cat.name}</Link> <Icon name="chevron" size={14} />
          </>
        )}
        <span aria-current="page">{product.name}</span>
      </nav>
      <div className="pdp">
        <div className="pdp-media">
          <ProductGallery product={product} />
          {!product.visual.photo && <p className="fineprint">Illustration générée — photo du produit à venir.</p>}
        </div>
        <div className="pdp-info">
          <p className="eyebrow">{cat?.name}</p>
          <h1 className="pdp-title">{product.name}</h1>
          {product.isExample && <Notice tone="warn">Produit d'exemple, à remplacer par une référence réelle.</Notice>}
          <p className="pdp-lead">{product.shortDescription}</p>
          <p className="pdp-origin">
            <Icon name="pin" size={16} /> {[product.origin.country, reg?.name, product.origin.locality].filter(Boolean).join(' · ') || 'Origine non renseignée'}
          </p>
          <div className="pdp-actions-info">
            <button type="button" className="chip-btn chip-btn-lg" onClick={() => info.open(product, 'origine')} aria-haspopup="dialog">
              <Icon name="pin" size={17} /> Origine
            </button>
            <button type="button" className="chip-btn chip-btn-lg" onClick={() => info.open(product, 'vertus')} aria-haspopup="dialog">
              <Icon name="leaf" size={17} /> Vertus
            </button>
          </div>
          <fieldset className="formats">
            <legend className="label">Choisir un format</legend>
            <div className="format-options">
              {formats.map((f) => {
                const s = available(product.id, f.id);
                return (
                  <label key={f.id} className={`format-opt ${format?.id === f.id ? 'selected' : ''} ${s <= 0 ? 'oos' : ''}`}>
                    <input
                      type="radio"
                      name="format"
                      value={f.id}
                      checked={format?.id === f.id}
                      onChange={() => {
                        setFormatId(f.id);
                        setQty(1);
                      }}
                    />
                    <span className="format-label">{f.label}</span>
                    {!VITRINE && <span className="format-price">{formatFCFA(f.price)}</span>}
                    {!VITRINE && s <= 0 && <span className="format-oos">Épuisé</span>}
                  </label>
                );
              })}
            </div>
          </fieldset>
          {VITRINE ? (
            <Notice tone="info">La commande en ligne arrive bientôt. En attendant, découvrez l’origine et les usages de nos produits.</Notice>
          ) : (
          <>
          <div className="pdp-buy">
            <p className="price price-lg">{format ? formatFCFA(format.price * qty) : '—'}</p>
            <StockBadge qty={stock} />
          </div>
          <div className="pdp-buy">
            <QtyStepper value={qty} onChange={setQty} max={Math.max(1, max)} label="Quantité" />
            <button
              type="button"
              className="btn btn-primary btn-lg grow"
              disabled={!format || max <= 0}
              onClick={() => {
                if (!format) return;
                cart.add({ kind: 'produit', productId: product.id, formatId: format.id, quantity: Math.min(qty, max) });
                toast(`${product.name} (${format.label}) × ${Math.min(qty, max)} ajouté au panier`);
                setQty(1);
              }}
            >
              <Icon name="cart" size={18} /> {max <= 0 && stock > 0 ? 'Quantité maximale dans le panier' : 'Ajouter au panier'}
            </button>
          </div>
          {inCart > 0 && (
            <p className="muted small">
              Déjà {inCart} dans votre panier. <button type="button" className="link-btn" onClick={cart.open}>Voir le panier</button>
            </p>
          )}
          </>
          )}
        </div>
      </div>

      <Tabs
        label="Détails du produit"
        className="pdp-tabs"
        active={tab}
        onChange={setTab}
        tabs={[
          {
            id: 'description',
            label: 'Description',
            content: (
              <div className="prose">
                {product.description ? <p>{product.description}</p> : <p className="muted">Description à venir.</p>}
                {sup && sup.visibleOnStore && (
                  <p>
                    Producteur / fournisseur : <Link to="/producteurs">{sup.name}</Link>
                  </p>
                )}
              </div>
            ),
          },
          { id: 'origine', label: 'Origine', content: <OriginContent product={product} /> },
          { id: 'vertus', label: 'Vertus', content: <VirtuesContent product={product} /> },
          {
            id: 'conservation',
            label: 'Conservation',
            content: (
              <div className="prose">
                <p>{product.traceability.storageConditions || 'Conditions de conservation non renseignées.'}</p>
                {product.traceability.shelfLifeDays ? <p>Durée de conservation indicative : {product.traceability.shelfLifeDays} jours.</p> : null}
                {product.traceability.lotTracking && <p className="muted">Ce produit est suivi par lot : le numéro de lot figure sur chaque commande.</p>}
              </div>
            ),
          },
        ]}
      />

      {related.length > 0 && (
        <section className="section">
          <h2 className="section-title">Dans la même catégorie</h2>
          <div className="pgrid">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} onInfo={info.open} />
            ))}
          </div>
        </section>
      )}
      {info.element}
    </div>
  );
}

export function TerroirsPage() {
  const { regions, products, suppliers } = useCatalog();
  const info = useInfoDialog();
  useDocumentTitle('Terroirs');
  const visible = regions.filter((r) => r.visibleOnStore);
  const unknown = products.filter((p) => !p.origin.regionId);
  return (
    <div className="container page">
      <header className="page-head">
        <h1 className="page-title">Nos terroirs</h1>
        <p className="page-lead">Les provenances indiquées sur nos fiches, avec leur niveau de vérification. Les terroirs seront enrichis au fil des partenariats.</p>
      </header>
      <div className="terroirs">
        {visible.map((r) => {
          const ps = products.filter((p) => p.origin.regionId === r.id);
          const sups = suppliers.filter((s) => s.regionId === r.id && s.visibleOnStore);
          return (
            <section key={r.id} id={r.id} className="terroir">
              <div className="terroir-head">
                <div>
                  <p className="eyebrow">{r.country}</p>
                  <h2 className="terroir-name">{r.name}</h2>
                </div>
                <VerificationBadgeLite status={r.status} />
              </div>
              <p>{r.description || <span className="muted">Description du terroir à venir.</span>}</p>
              {sups.length > 0 && <p className="small">Producteurs : {sups.map((s) => s.name).join(', ')}</p>}
              {ps.length ? (
                <div className="pgrid pgrid-sm">
                  {ps.map((p) => (
                    <ProductCard key={p.id} product={p} onInfo={info.open} />
                  ))}
                </div>
              ) : (
                <p className="muted">Aucun produit de ce terroir pour le moment.</p>
              )}
            </section>
          );
        })}
        {unknown.length > 0 && (
          <section className="terroir">
            <h2 className="terroir-name">Provenance à préciser</h2>
            <p className="muted">Pour ces produits, la région de provenance n'a pas encore été renseignée.</p>
            <ul className="tag-list">
              {unknown.map((p) => (
                <li key={p.id}>
                  <Link to={`/produit/${p.slug}`} className="tag">
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {info.element}
    </div>
  );
}

export function ProducersPage() {
  const { suppliers, region, products } = useCatalog();
  useDocumentTitle('Producteurs');
  const visible = suppliers.filter((s) => s.visibleOnStore);
  return (
    <div className="container page">
      <header className="page-head">
        <h1 className="page-title">Producteurs & artisans</h1>
        <p className="page-lead">Les femmes et les hommes derrière nos produits. Les fiches ci-dessous sont des exemples en attendant les partenariats réels.</p>
      </header>
      {visible.length ? (
        <div className="producers">
          {visible.map((s) => {
            const r = region(s.regionId);
            const ps = products.filter((p) => p.origin.supplierId === s.id);
            return (
              <article key={s.id} className="producer">
                <div className="producer-mark" aria-hidden="true">
                  {s.name.slice(0, 1)}
                </div>
                <div>
                  <p className="eyebrow">{SUPPLIER_TYPE_LABELS[s.type]}</p>
                  <h2 className="producer-name">{s.name}</h2>
                  <p className="small">
                    <Icon name="pin" size={14} /> {[s.locality, r?.name, r?.country].filter(Boolean).join(', ') || 'Localisation non renseignée'}
                  </p>
                  <p>{s.story || <span className="muted">Présentation à venir.</span>}</p>
                  <VerificationBadgeLite status={s.status} />
                  {ps.length > 0 && (
                    <ul className="tag-list">
                      {ps.map((p) => (
                        <li key={p.id}>
                          <Link to={`/produit/${p.slug}`} className="tag">
                            {p.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty title="Aucun producteur n'est encore présenté." />
      )}
    </div>
  );
}

export function NotFound() {
  useDocumentTitle('Page introuvable');
  return (
    <div className="container page">
      <Empty title="Cette page n'existe pas.">
        <Link to="/" className="btn btn-outline">
          Retour à l'accueil
        </Link>
      </Empty>
    </div>
  );
}

/** Photo principale + vignettes des photos supplémentaires (visual.gallery). */
function ProductGallery({ product }: { product: Product }) {
  const photos = [product.visual.photo, ...(product.visual.gallery ?? [])].map((p) => (p ?? '').trim()).filter((p, i, a) => p && a.indexOf(p) === i);
  const [index, setIndex] = useState(0);
  const current = photos[Math.min(index, photos.length - 1)] ?? product.visual.photo;
  return (
    <>
      <ProductVisual key={current} visual={{ ...product.visual, photo: current }} label={product.name} />
      {photos.length > 1 && (
        <div className="pdp-thumbs" role="group" aria-label="Photos du produit">
          {photos.map((p, i) => (
            <button key={p} type="button" className={`pdp-thumb ${p === current ? 'active' : ''}`} aria-pressed={p === current} aria-label={`Photo ${i + 1} sur ${photos.length}`} onClick={() => setIndex(i)}>
              <img src={resolvePhoto(p)} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
