import { useEffect, useState } from 'react';
import { services } from '../../app/services';
import { useCollection, useSession, useSettings } from '../../app/hooks';
import type { Role, Shop, ShopSettings } from '../../types';
import { EntityForm, validateFields, type SectionDef } from '../crud';
import { RESOURCES, ROLE_LABELS, ROLE_PERMISSIONS, can } from '../../domain/permissions';
import { formatDate } from '../../domain/format';
import { Notice, useToast } from '../../ui/common';
import { Icon } from '../../ui/Icon';
import { Dialog } from '../../ui/Dialog';

const BASE_SECTIONS: SectionDef[] = [
  {
    id: 'id',
    label: 'Identité',
    fields: [
      { name: 'name', label: 'Nom de la boutique', type: 'text', required: true },
      { name: 'signature', label: 'Signature sous le logo', type: 'text', placeholder: 'by BintouDionda' },
      { name: 'slogan', label: 'Slogan', type: 'text', required: true, wide: true },
      { name: 'announcement', label: 'Bandeau d’annonce', type: 'text', wide: true },
      { name: 'freeShippingMessage', label: 'Message livraison', type: 'text', wide: true },
    ],
  },
  {
    id: 'contact',
    label: 'Contact',
    fields: [
      { name: 'contactEmail', label: 'E-mail de contact', type: 'email', required: true },
      { name: 'phone', label: 'Téléphone', type: 'text' },
      { name: 'address', label: 'Adresse', type: 'text', wide: true },
    ],
  },
  {
    id: 'apparence',
    label: 'Personnalisation',
    intro: <Notice tone="info">La personnalisation complète du thème par boutique fera partie de l’offre SaaS. Les couleurs sont enregistrées dès maintenant dans les paramètres.</Notice>,
    fields: [
      { name: 'theme.primary', label: 'Couleur principale', type: 'color' },
      { name: 'theme.accent', label: 'Couleur d’accent', type: 'color' },
    ],
  },
  {
    id: 'legal',
    label: 'Mentions',
    fields: [{ name: 'legalNotice', label: 'Mentions légales (pied de page)', type: 'textarea' }],
  },
];

function settingsSections(productOptions: { value: string; label: string }[]): SectionDef[] {
  return [
    BASE_SECTIONS[0],
    {
      id: 'accueil',
      label: 'Page d’accueil',
      intro: (
        <Notice tone="info">
          Choisissez les 3 produits du grand bandeau de l’accueil. La « Sélection du moment » affiche les produits cochés « Mettre en avant sur l’accueil » (module Produits).
        </Notice>
      ),
      fields: [
        { name: 'homeHero.first', label: 'Grande image (centre)', type: 'select', options: productOptions },
        { name: 'homeHero.second', label: 'Image de gauche', type: 'select', options: productOptions },
        { name: 'homeHero.third', label: 'Image de droite', type: 'select', options: productOptions },
      ],
    },
    ...BASE_SECTIONS.slice(1),
  ];
}

export function SettingsModule() {
  const settings = useSettings();
  const products = useCollection(services.products);
  const SETTINGS_SECTIONS = settingsSections(
    products.filter((p) => p.status === 'publie').sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((p) => ({ value: p.slug, label: `${p.name}${p.visual.photo ? '' : ' (sans photo)'}` })),
  );
  const session = useSession();
  const toast = useToast();
  const writable = Boolean(session && can(session.role, 'parametres', 'ecrire'));
  const [draft, setDraft] = useState<ShopSettings>(settings);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => setDraft(settings), [settings]);

  const collect = async () => ({
      exportedAt: new Date().toISOString(),
      shop: services.shops.current(),
      settings: await services.settings.get(),
      products: await services.products.list(),
      categories: await services.categories.list(),
      regions: await services.regions.list(),
      suppliers: await services.suppliers.list(),
      lots: await services.lots.list(),
      movements: await services.movements.list(),
      customers: await services.customers.list(),
      orders: await services.orders.list(),
      zones: await services.zones.list(),
      promotions: await services.promotions.list(),
      bundles: await services.bundles.list(),
  });
  const exportData = async () => {
    const data = await collect();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dionda-store-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="mgr-head">
        <div>
          <h1 className="admin-title">Paramètres de la boutique</h1>
          <p className="admin-lead">Devise : franc CFA (XOF, FCFA) · Langue : français (Sénégal).</p>
        </div>
        {writable && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              const e = validateFields(SETTINGS_SECTIONS, draft);
              setErrors(e);
              if (Object.keys(e).length) return;
              await services.settings.update(draft);
              toast('Paramètres enregistrés');
            }}
          >
            Enregistrer
          </button>
        )}
      </div>
      <div className="card">
        <EntityForm sections={SETTINGS_SECTIONS} draft={draft} setDraft={(d) => setDraft(d as ShopSettings)} errors={errors} readOnly={!writable} idPrefix="set" />
      </div>
      <div className="card">
        <h2 className="card-title">Données de démonstration</h2>
        <p className="small">Toutes les données sont stockées dans ce navigateur (localStorage), séparément pour chaque boutique. Elles seront migrées vers PostgreSQL via l’API.</p>
        <div className="row-actions">
          <button type="button" className="btn btn-outline" onClick={exportData}>
            <Icon name="doc" size={16} /> Exporter en JSON
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(JSON.stringify(await collect(), null, 2));
                toast('Données copiées dans le presse-papiers');
              } catch {
                toast('Copie refusée par le navigateur', 'danger');
              }
            }}
          >
            Copier le JSON
          </button>
          {writable && (
            <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}>
              Réinitialiser les données de démonstration
            </button>
          )}
        </div>
      </div>
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Réinitialiser la boutique ?"
        footer={
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setConfirmReset(false)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                await services.shops.resetCurrent();
                setConfirmReset(false);
                toast('Données de démonstration restaurées');
              }}
            >
              Réinitialiser
            </button>
          </div>
        }
      >
        <p>Produits, stocks, commandes, clients et paramètres de cette boutique seront remplacés par le jeu de démonstration initial.</p>
      </Dialog>
    </div>
  );
}

export function TeamModule() {
  const session = useSession();
  const toast = useToast();
  const roles = Object.keys(ROLE_LABELS) as Role[];
  return (
    <div>
      <h1 className="admin-title">Équipe, rôles & permissions</h1>
      <Notice tone="warn" title="Contrôle d’accès indicatif.">
        Dans ce prototype, les rôles masquent ou verrouillent des écrans, mais rien n’est protégé : toute personne ayant accès au navigateur peut lire et modifier les données. Les permissions devront être vérifiées côté serveur (API NestJS, gardes par rôle et par boutique).
      </Notice>
      <div className="card">
        <h2 className="card-title">Tester un rôle</h2>
        <p className="small">Connecté(e) en tant que {session?.user.email}. Changer de rôle permet de vérifier l’interface de chaque profil.</p>
        <div className="seg" role="group" aria-label="Rôle actif">
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              className={session?.role === r ? 'active' : ''}
              aria-pressed={session?.role === r}
              onClick={async () => {
                if (!session) return;
                await services.auth.signIn(session.user.email, r);
                toast(`Rôle actif : ${ROLE_LABELS[r]}`);
              }}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
      <div className="card">
        <h2 className="card-title">Matrice des permissions</h2>
        <div className="table-wrap">
          <table className="table table-compact perm-table">
            <thead>
              <tr>
                <th scope="col">Module</th>
                {roles.map((r) => (
                  <th key={r} scope="col">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RESOURCES.map((res) => (
                <tr key={res.id}>
                  <th scope="row">{res.label}</th>
                  {roles.map((r) => {
                    const w = ROLE_PERMISSIONS[r].includes(`${res.id}:ecrire`);
                    const l = ROLE_PERMISSIONS[r].includes(`${res.id}:lire`);
                    return <td key={r}>{w ? 'Lecture + écriture' : l ? 'Lecture' : <span className="muted">—</span>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fineprint">Plusieurs administrateurs par boutique, invitations par e-mail et journal d’audit seront gérés par l’API.</p>
      </div>
    </div>
  );
}

export function ShopsModule() {
  const toast = useToast();
  const [shops, setShops] = useState<Shop[]>([]);
  const [name, setName] = useState('');
  const [withDemo, setWithDemo] = useState(false);
  const [err, setErr] = useState('');
  const current = services.shops.current();
  useEffect(() => {
    const load = () => {
      services.shops.list().then(setShops);
    };
    load();
    return services.shops.subscribe(load);
  }, []);
  return (
    <div>
      <h1 className="admin-title">Boutiques & abonnement</h1>
      <p className="admin-lead">Préfiguration du mode SaaS : chaque boutique a ses propres produits, stocks, commandes et paramètres.</p>
      <Notice tone="info">L’abonnement, la facturation et les domaines personnalisés ne sont pas implémentés dans cette phase. Les types correspondants (Shop, Plan, Subscription) sont prêts côté code.</Notice>
      <div className="card">
        <h2 className="card-title">Boutiques</h2>
        <div className="table-wrap">
          <table className="table admin-table">
            <thead>
              <tr>
                <th scope="col">Boutique</th>
                <th scope="col">Créée le</th>
                <th scope="col">Formule</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shops.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong> {s.id === current.id && <span className="pill pill-ok">Active</span>}
                  </td>
                  <td>{formatDate(s.createdAt)}</td>
                  <td>Démonstration (essai)</td>
                  <td className="col-actions">
                    {s.id !== current.id && (
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={async () => {
                          const session = services.auth.getSession();
                          services.shops.switchTo(s.id);
                          // la session simulée est propre à chaque boutique : on la recrée pour la nouvelle
                          if (session) await services.auth.signIn(session.user.email, session.role);
                          toast(`Boutique active : ${s.name}`);
                        }}
                      >
                        Ouvrir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <form
        className="card"
        onSubmit={async (e: { preventDefault(): void }) => {
          e.preventDefault();
          setErr('');
          try {
            const shop = await services.shops.create(name, { withDemoData: withDemo });
            setName('');
            toast(`Boutique « ${shop.name} » créée`);
          } catch (x) {
            setErr(x instanceof Error ? x.message : 'Création impossible.');
          }
        }}
      >
        <h2 className="card-title">Créer une boutique</h2>
        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="new-shop">
              Nom de la boutique
            </label>
            <input id="new-shop" className="input" value={name} onChange={(e: { target: { value: string } }) => setName(e.target.value)} />
            {err && <p className="error small">{err}</p>}
          </div>
          <label className="check field">
            <input type="checkbox" checked={withDemo} onChange={(e: { target: { checked: boolean } }) => setWithDemo(e.target.checked)} /> Copier le catalogue de démonstration
          </label>
        </div>
        <button type="submit" className="btn btn-primary">
          Créer
        </button>
      </form>
    </div>
  );
}
