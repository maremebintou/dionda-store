import { services } from '../../app/services';
import { useCollection } from '../../app/hooks';
import type { Category, Product, Region, Supplier, VerificationStatus } from '../../types';
import { EntityManager, Pill, type SectionDef } from '../crud';
import { CATEGORY_KIND_LABELS, PUBLICATION_LABELS, SUPPLIER_TYPE_LABELS, VERIFICATION_OPTIONS, options } from '../labels';
import { formatFCFA, slugify, uid, VERIFICATION_LABELS } from '../../domain/format';
import { stockLevels } from '../../domain/stock';
import { minPrice } from '../../domain/pricing';
import { ProductVisual } from '../../ui/ProductVisual';
import { Notice } from '../../ui/common';
import { Link } from '../../ui/router';
import { Icon } from '../../ui/Icon';

const VTONE: Record<VerificationStatus, 'neutral' | 'warn' | 'info' | 'ok'> = { non_renseigne: 'neutral', a_verifier: 'warn', declare_fournisseur: 'info', verifie: 'ok' };
export const VPill = ({ s }: { s: VerificationStatus }) => <Pill tone={VTONE[s]}>{VERIFICATION_LABELS[s]}</Pill>;

const MOTIF_OPTIONS = [
  ['grain', 'Graines'],
  ['goutte', 'Goutte (huile)'],
  ['feuille', 'Feuille (poudre)'],
  ['pot', 'Pot'],
  ['poisson', 'Poisson'],
  ['fleur', 'Fleur'],
  ['racine', 'Racines'],
  ['tissage', 'Tissage'],
  ['coquillage', 'Coquillage'],
  ['coffret', 'Coffret'],
].map(([value, label]) => ({ value, label }));

const verificationIntro = (
  <Notice tone="info">
    Ne passez une rubrique en « Vérifié » que si les informations ont été contrôlées et que les sources sont indiquées. Sinon, gardez « Information non vérifiée » ou « Déclaré par le fournisseur » : la boutique affichera ce statut au client.
  </Notice>
);

export function productSections(categories: Category[], regions: Region[], suppliers: Supplier[]): SectionDef[] {
  return [
    {
      id: 'general',
      label: 'Général',
      fields: [
        { name: 'name', label: 'Nom du produit', type: 'text', required: true },
        { name: 'slug', label: 'Identifiant URL', type: 'text', help: 'Généré à partir du nom si vide.' },
        { name: 'categoryId', label: 'Catégorie', type: 'select', required: true, options: categories.map((c) => ({ value: c.id, label: c.name })) },
        { name: 'status', label: 'Statut de publication', type: 'select', required: true, options: options(PUBLICATION_LABELS) },
        { name: 'visual.photo', label: 'Photo du produit', type: 'photo', help: 'Nom du fichier placé dans le dossier photos/ (ex. fonio.jpg), ou adresse https:// d’une image. Sans photo, l’illustration est affichée.' },
        { name: 'visual.gallery', label: 'Autres photos (fiche produit)', type: 'list', placeholder: 'Un nom de fichier par ligne (ex. fonio.jpg)', help: 'Affichées en vignettes sous la photo principale, sur la fiche du produit.' },
        { name: 'shortDescription', label: 'Accroche', type: 'text', wide: true, required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'tags', label: 'Mots-clés (recherche)', type: 'list', placeholder: 'Un mot-clé par ligne' },
        { name: 'featured', label: 'Mettre en avant sur l’accueil', type: 'checkbox' },
        { name: 'isExample', label: 'Produit d’exemple', type: 'checkbox', help: 'affiche un bandeau « Exemple » côté boutique' },
        { name: 'visual.motif', label: 'Motif de l’illustration (si pas de photo)', type: 'select', required: true, options: MOTIF_OPTIONS },
        { name: 'visual.hue', label: 'Teinte du visuel (0–360)', type: 'number', min: 0 },
      ],
    },
    {
      id: 'formats',
      label: 'Formats & prix',
      intro: <p className="muted small">Prix en FCFA, sans décimales. Le seuil d’alerte déclenche le signalement « stock bas ».</p>,
      fields: [{ name: 'formats', label: 'Formats proposés', type: 'formats' }],
    },
    {
      id: 'origine',
      label: 'Origine',
      intro: verificationIntro,
      fields: [
        { name: 'origin.status', label: 'Statut de vérification', type: 'select', required: true, options: VERIFICATION_OPTIONS },
        { name: 'origin.country', label: 'Pays d’origine', type: 'text' },
        { name: 'origin.regionId', label: 'Région de provenance', type: 'select', options: regions.map((r) => ({ value: r.id, label: `${r.name} (${r.country})` })) },
        { name: 'origin.locality', label: 'Localité', type: 'text' },
        { name: 'origin.supplierId', label: 'Producteur ou fournisseur', type: 'select', options: suppliers.map((s) => ({ value: s.id, label: s.name })), help: 'Affiché au client seulement si la fiche du fournisseur est visible.' },
        { name: 'origin.story', label: 'Histoire et tradition du produit', type: 'textarea' },
        { name: 'origin.productionMethod', label: 'Méthode de production (si documentée)', type: 'textarea' },
        { name: 'origin.sources', label: 'Sources documentaires', type: 'sources' },
      ],
    },
    {
      id: 'vertus',
      label: 'Vertus',
      intro: (
        <>
          {verificationIntro}
          <Notice tone="warn">N’indiquez des valeurs nutritionnelles ou des bienfaits que s’ils proviennent d’une analyse ou d’une source documentée. Évitez toute allégation de santé non autorisée.</Notice>
        </>
      ),
      fields: [
        { name: 'virtues.status', label: 'Statut de vérification', type: 'select', required: true, options: VERIFICATION_OPTIONS },
        { name: 'virtues.nutrition', label: 'Valeurs nutritionnelles', type: 'nutrition' },
        { name: 'virtues.benefits', label: 'Bienfaits alimentaires documentés', type: 'list' },
        { name: 'virtues.traditionalUses', label: 'Utilisations traditionnelles', type: 'list' },
        { name: 'virtues.preparationTips', label: 'Conseils de préparation', type: 'list' },
        { name: 'virtues.precautions', label: 'Précautions éventuelles (allergènes…)', type: 'list' },
        { name: 'virtues.sources', label: 'Sources documentaires', type: 'sources' },
      ],
    },
    {
      id: 'tracabilite',
      label: 'Traçabilité',
      intro: (
        <p className="muted small">
          Les lots, dates limites et mouvements se gèrent dans le module <Link to="/admin/stocks">Stocks & lots</Link>.
        </p>
      ),
      fields: [
        { name: 'traceability.storageConditions', label: 'Conditions de conservation', type: 'textarea' },
        { name: 'traceability.shelfLifeDays', label: 'Durée de conservation indicative (jours)', type: 'number', optional: true },
        { name: 'traceability.lotTracking', label: 'Suivi par lot', type: 'checkbox' },
        { name: 'traceability.expiryTracking', label: 'Suivi des dates de péremption', type: 'checkbox' },
        { name: 'traceability.notes', label: 'Notes de traçabilité', type: 'textarea' },
      ],
    },
  ];
}

export function emptyProduct(categoryId = ''): Omit<Product, 'id' | 'shopId' | 'createdAt' | 'updatedAt'> {
  return {
    slug: '',
    name: '',
    shortDescription: '',
    description: '',
    categoryId,
    formats: [{ id: uid('fmt_'), label: '', quantity: 0, unit: 'g', price: 0, sku: '', lowStockThreshold: 5, active: true }],
    origin: { country: '', locality: '', story: '', productionMethod: '', status: 'non_renseigne', sources: [] },
    virtues: { nutrition: [], benefits: [], traditionalUses: [], preparationTips: [], precautions: [], status: 'non_renseigne', sources: [] },
    traceability: { storageConditions: '', lotTracking: true, expiryTracking: true, notes: '' },
    tags: [],
    featured: false,
    isExample: false,
    status: 'brouillon',
    visual: { hue: 30, motif: 'grain', photo: '' },
    imageIds: [],
  };
}

export function ProductsModule({ query }: { query: URLSearchParams }) {
  const categories = useCollection(services.categories);
  const regions = useCollection(services.regions);
  const suppliers = useCollection(services.suppliers);
  const movements = useCollection(services.movements);
  const orders = useCollection(services.orders);
  const lots = useCollection(services.lots);
  const products = useCollection(services.products);
  const levels = stockLevels(products, movements);
  const stockOf = (p: Product) => levels.filter((l) => l.productId === p.id).reduce((s, l) => s + l.quantity, 0);

  return (
    <EntityManager<Product>
      title="Produits"
      singular="Produit"
      description="Catalogue, formats et prix, origine, vertus et traçabilité."
      repo={services.products}
      resource="catalogue"
      dialogSize="xl"
      openId={query.get('id') ?? undefined}
      openTab={query.get('tab') ?? undefined}
      createEmpty={() => emptyProduct(categories[0]?.id)}
      searchText={(p) => `${p.name} ${p.slug} ${p.formats.map((f) => f.sku).join(' ')}`}
      itemLabel={(p) => p.name || 'Nouveau produit'}
      sort={(a, b) => a.name.localeCompare(b.name, 'fr')}
      sections={productSections(categories, regions, suppliers)}
      filters={[
        { id: 'cat', label: 'Catégorie', options: categories.map((c) => ({ value: c.id, label: c.name })), test: (p, v) => p.categoryId === v },
        { id: 'status', label: 'Statut', options: options(PUBLICATION_LABELS), test: (p, v) => p.status === v },
        { id: 'verif', label: 'Origine', options: VERIFICATION_OPTIONS, test: (p, v) => p.origin.status === v },
      ]}
      beforeSave={(p) => ({
        ...p,
        name: p.name.trim(),
        slug: slugify(p.slug || p.name),
        visual: { ...p.visual, hue: Math.min(360, Math.max(0, Number(p.visual.hue) || 0)) },
        formats: p.formats.map((f, i) => ({ ...f, label: f.label.trim(), sku: f.sku.trim() || `${slugify(p.name).slice(0, 6).toUpperCase()}-${i + 1}` })),
        publishedAt: p.status === 'publie' ? p.publishedAt ?? new Date().toISOString() : p.publishedAt,
      })}
      validate={(p, all) => {
        const e: Record<string, string> = {};
        if (all.some((x) => x.slug === p.slug && x.id !== p.id)) e.slug = 'Cet identifiant est déjà utilisé par un autre produit.';
        if (!p.formats.length) e.formats = 'Au moins un format est requis.';
        else if (p.formats.some((f) => !f.label || !(f.price > 0))) e.formats = 'Chaque format doit avoir un libellé et un prix supérieur à 0.';
        else if (new Set(p.formats.map((f) => f.sku)).size !== p.formats.length) e.formats = 'Les références (SKU) doivent être uniques.';
        if (p.virtues.status === 'verifie' && !p.virtues.sources.some((s) => s.label.trim())) e['virtues.status'] = 'Une rubrique « Vérifié » doit citer au moins une source.';
        if (p.origin.status === 'verifie' && !p.origin.sources.some((s) => s.label.trim())) e['origin.status'] = 'Une rubrique « Vérifié » doit citer au moins une source.';
        return e;
      }}
      deleteBlocker={(p) =>
        orders.some((o) => o.lines.some((l) => l.refId === p.id || l.allocations.some((a) => a.productId === p.id))) || lots.some((l) => l.productId === p.id)
          ? 'Ce produit figure dans des commandes ou des lots : il ne peut pas être supprimé sans perdre la traçabilité. Passez-le plutôt au statut « Archivé ».'
          : undefined
      }
      columns={[
        { label: '', className: 'col-thumb', render: (p) => <ProductVisual visual={p.visual} className="thumb" /> },
        {
          label: 'Produit',
          render: (p) => (
            <>
              <strong>{p.name}</strong>
              <div className="muted small">{categories.find((c) => c.id === p.categoryId)?.name ?? 'Sans catégorie'}</div>
            </>
          ),
        },
        { label: 'Formats', render: (p) => <span className="small">{p.formats.map((f) => f.label).join(', ')}</span> },
        { label: 'Dès', render: (p) => (minPrice(p) !== undefined ? formatFCFA(minPrice(p) as number) : '—') },
        { label: 'Stock', render: (p) => <span className={stockOf(p) <= 0 ? 'error' : ''}>{stockOf(p)}</span> },
        { label: 'Origine', render: (p) => <VPill s={p.origin.status} /> },
        { label: 'Vertus', render: (p) => <VPill s={p.virtues.status} /> },
        { label: 'Statut', render: (p) => <Pill tone={p.status === 'publie' ? 'ok' : p.status === 'brouillon' ? 'neutral' : 'warn'}>{PUBLICATION_LABELS[p.status]}</Pill> },
      ]}
    />
  );
}

export function CategoriesModule() {
  const products = useCollection(services.products);
  return (
    <EntityManager<Category>
      title="Catégories"
      singular="Catégorie"
      description="Organisation du catalogue. La catégorie « Artisanat & textiles » est distincte des produits alimentaires."
      repo={services.categories}
      resource="catalogue"
      dialogSize="md"
      createEmpty={() => ({ slug: '', name: '', description: '', kind: 'alimentaire', order: 10, visible: true })}
      searchText={(c) => c.name}
      itemLabel={(c) => c.name || 'Nouvelle catégorie'}
      sort={(a, b) => a.order - b.order}
      beforeSave={(c) => ({ ...c, slug: slugify(c.slug || c.name) })}
      validate={(c, all) => (all.some((x) => x.slug === c.slug && x.id !== c.id) ? { slug: 'Identifiant déjà utilisé.' } : ({} as Record<string, string>))}
      deleteBlocker={(c) => {
        const n = products.filter((p) => p.categoryId === c.id).length;
        return n ? `${n} produit(s) appartiennent à cette catégorie. Déplacez-les ou masquez la catégorie.` : undefined;
      }}
      sections={[
        {
          id: 'g',
          label: 'Catégorie',
          fields: [
            { name: 'name', label: 'Nom', type: 'text', required: true },
            { name: 'slug', label: 'Identifiant URL', type: 'text', help: 'Généré à partir du nom si vide.' },
            { name: 'kind', label: 'Type', type: 'select', required: true, options: options(CATEGORY_KIND_LABELS) },
            { name: 'order', label: 'Ordre d’affichage', type: 'number' },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'visible', label: 'Visible dans la boutique', type: 'checkbox' },
          ],
        },
      ]}
      columns={[
        { label: 'Ordre', render: (c) => c.order },
        { label: 'Catégorie', render: (c) => <strong>{c.name}</strong> },
        { label: 'Type', render: (c) => <Pill tone={c.kind === 'artisanat' ? 'accent' : 'neutral'}>{CATEGORY_KIND_LABELS[c.kind]}</Pill> },
        { label: 'Produits', render: (c) => products.filter((p) => p.categoryId === c.id).length },
        { label: 'Visibilité', render: (c) => (c.visible ? <Pill tone="ok">Visible</Pill> : <Pill>Masquée</Pill>) },
      ]}
    />
  );
}

export function RegionsModule() {
  const products = useCollection(services.products);
  const suppliers = useCollection(services.suppliers);
  return (
    <EntityManager<Region>
      title="Origines & régions"
      singular="Région"
      description="Terroirs de provenance affichés sur les fiches produits et la page Terroirs."
      repo={services.regions}
      resource="origines"
      dialogSize="md"
      createEmpty={() => ({ name: '', country: 'Sénégal', description: '', visibleOnStore: true, status: 'non_renseigne', sources: [] })}
      searchText={(r) => `${r.name} ${r.country}`}
      itemLabel={(r) => r.name || 'Nouvelle région'}
      deleteBlocker={(r) => (products.some((p) => p.origin.regionId === r.id) || suppliers.some((s) => s.regionId === r.id) ? 'Cette région est utilisée par des produits ou des fournisseurs.' : undefined)}
      sections={[
        {
          id: 'g',
          label: 'Région',
          intro: verificationIntro,
          fields: [
            { name: 'name', label: 'Nom de la région / du terroir', type: 'text', required: true },
            { name: 'country', label: 'Pays', type: 'text', required: true },
            { name: 'status', label: 'Statut de vérification', type: 'select', required: true, options: VERIFICATION_OPTIONS },
            { name: 'description', label: 'Description', type: 'textarea' },
            { name: 'sources', label: 'Sources', type: 'sources' },
            { name: 'visibleOnStore', label: 'Visible dans la boutique', type: 'checkbox' },
          ],
        },
      ]}
      columns={[
        { label: 'Région', render: (r) => <strong>{r.name}</strong> },
        { label: 'Pays', render: (r) => r.country },
        { label: 'Produits', render: (r) => products.filter((p) => p.origin.regionId === r.id).length },
        { label: 'Fournisseurs', render: (r) => suppliers.filter((s) => s.regionId === r.id).length },
        { label: 'Vérification', render: (r) => <VPill s={r.status} /> },
      ]}
    />
  );
}

export function SuppliersModule() {
  const regions = useCollection(services.regions);
  const products = useCollection(services.products);
  const lots = useCollection(services.lots);
  return (
    <EntityManager<Supplier>
      title="Fournisseurs & producteurs"
      singular="Fournisseur"
      description="Producteurs, coopératives, transformateurs et artisans. Les coordonnées ne sont jamais affichées dans la boutique."
      repo={services.suppliers}
      resource="fournisseurs"
      createEmpty={() => ({ name: '', type: 'producteur', locality: '', contactName: '', phone: '', email: '', story: '', visibleOnStore: false, status: 'non_renseigne' })}
      searchText={(s) => `${s.name} ${s.locality} ${s.contactName}`}
      itemLabel={(s) => s.name || 'Nouveau fournisseur'}
      deleteBlocker={(s) => (products.some((p) => p.origin.supplierId === s.id) || lots.some((l) => l.supplierId === s.id) ? 'Ce fournisseur est lié à des produits ou à des lots (traçabilité).' : undefined)}
      filters={[{ id: 'type', label: 'Type', options: options(SUPPLIER_TYPE_LABELS), test: (s, v) => s.type === v }]}
      sections={[
        {
          id: 'g',
          label: 'Identité',
          fields: [
            { name: 'name', label: 'Nom', type: 'text', required: true },
            { name: 'type', label: 'Type', type: 'select', required: true, options: options(SUPPLIER_TYPE_LABELS) },
            { name: 'regionId', label: 'Région', type: 'select', options: regions.map((r) => ({ value: r.id, label: r.name })) },
            { name: 'locality', label: 'Localité', type: 'text' },
            { name: 'status', label: 'Statut de vérification', type: 'select', required: true, options: VERIFICATION_OPTIONS },
            { name: 'story', label: 'Présentation (visible si publiée)', type: 'textarea' },
            { name: 'visibleOnStore', label: 'Présenter dans la page Producteurs', type: 'checkbox' },
          ],
        },
        {
          id: 'c',
          label: 'Contact (interne)',
          intro: <Notice tone="info">Données personnelles à usage interne. Côté SaaS, elles seront protégées par l’authentification et les permissions serveur.</Notice>,
          fields: [
            { name: 'contactName', label: 'Personne de contact', type: 'text' },
            { name: 'phone', label: 'Téléphone', type: 'text' },
            { name: 'email', label: 'E-mail', type: 'email' },
          ],
        },
      ]}
      columns={[
        { label: 'Nom', render: (s) => <strong>{s.name}</strong> },
        { label: 'Type', render: (s) => SUPPLIER_TYPE_LABELS[s.type] },
        { label: 'Région', render: (s) => regions.find((r) => r.id === s.regionId)?.name ?? '—' },
        { label: 'Lots reçus', render: (s) => lots.filter((l) => l.supplierId === s.id).length },
        { label: 'Boutique', render: (s) => (s.visibleOnStore ? <Pill tone="ok">Présenté</Pill> : <Pill>Masqué</Pill>) },
        { label: 'Vérification', render: (s) => <VPill s={s.status} /> },
      ]}
    />
  );
}

/** Suivi de complétude des contenus Origine / Vertus. */
export function EditorialModule() {
  const products = useCollection(services.products);
  const rows = [...products].sort((a, b) => score(a) - score(b));
  function score(p: Product) {
    const o = [p.origin.country, p.origin.regionId, p.origin.locality, p.origin.supplierId, p.origin.story, p.origin.productionMethod].filter(Boolean).length;
    const v = [p.virtues.nutrition.length, p.virtues.benefits.length, p.virtues.traditionalUses.length, p.virtues.preparationTips.length, p.virtues.precautions.length].filter(Boolean).length;
    return Math.round(((o + v + (p.origin.sources.length ? 1 : 0) + (p.virtues.sources.length ? 1 : 0)) / 13) * 100);
  }
  const verified = products.filter((p) => p.origin.status === 'verifie' && p.virtues.status === 'verifie').length;
  return (
    <div>
      <h1 className="admin-title">Contenus éditoriaux & nutritionnels</h1>
      <p className="admin-lead">Complétude des rubriques « Origine » et « Vertus » de chaque fiche. Les moins complètes apparaissent en premier.</p>
      <div className="kpis kpis-3">
        <div className="kpi">
          <span className="kpi-label">Fiches entièrement vérifiées</span>
          <span className="kpi-value">
            {verified} / {products.length}
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Fiches avec valeurs nutritionnelles</span>
          <span className="kpi-value">{products.filter((p) => p.virtues.nutrition.length).length}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Fiches avec au moins une source</span>
          <span className="kpi-value">{products.filter((p) => p.origin.sources.length || p.virtues.sources.length).length}</span>
        </div>
      </div>
      <div className="table-wrap">
        <table className="table admin-table">
          <thead>
            <tr>
              <th scope="col">Produit</th>
              <th scope="col">Complétude</th>
              <th scope="col">Origine</th>
              <th scope="col">Vertus</th>
              <th scope="col">Nutrition</th>
              <th scope="col">Sources</th>
              <th scope="col">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const s = score(p);
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>
                    <div className="progress" role="img" aria-label={`Complétude ${s} %`}>
                      <span style={{ width: `${s}%` }} />
                    </div>
                    <span className="small muted">{s} %</span>
                  </td>
                  <td>
                    <VPill s={p.origin.status} />
                  </td>
                  <td>
                    <VPill s={p.virtues.status} />
                  </td>
                  <td>{p.virtues.nutrition.length || '—'}</td>
                  <td>{p.origin.sources.length + p.virtues.sources.length || '—'}</td>
                  <td className="col-actions">
                    <div className="row-actions">
                      <Link to={`/admin/produits?id=${p.id}&tab=origine`} className="btn btn-outline btn-sm">
                        <Icon name="pin" size={14} /> Origine
                      </Link>
                      <Link to={`/admin/produits?id=${p.id}&tab=vertus`} className="btn btn-outline btn-sm">
                        <Icon name="leaf" size={14} /> Vertus
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
