import { useState, type ReactNode } from 'react';
import { services } from '../app/services';
import { useDocumentTitle, useSession, useSettings } from '../app/hooks';
import type { Resource, Role } from '../types';
import { ROLE_LABELS, can } from '../domain/permissions';
import { Link, redirect } from '../ui/router';
import { Icon } from '../ui/Icon';
import { Notice } from '../ui/common';
import { Logo } from '../storefront/Layout';
import { ServiceError } from '../services/contracts';
import { DashboardModule } from './modules/dashboard';
import { CategoriesModule, EditorialModule, ProductsModule, RegionsModule, SuppliersModule } from './modules/catalog';
import { InventoryModule } from './modules/inventory';
import { CustomersModule, DeliveryModule, OrdersModule } from './modules/sales';
import { MarketingModule } from './modules/marketing';
import { SettingsModule, ShopsModule, TeamModule } from './modules/settings';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  resource: Resource;
  render: (query: URLSearchParams) => ReactNode;
}
interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { label: 'Pilotage', items: [{ to: '/admin', label: 'Tableau de bord', icon: 'chart', resource: 'statistiques', render: () => <DashboardModule /> }] },
  {
    label: 'Catalogue',
    items: [
      { to: '/admin/produits', label: 'Produits', icon: 'box', resource: 'catalogue', render: (q) => <ProductsModule query={q} /> },
      { to: '/admin/categories', label: 'Catégories', icon: 'grid', resource: 'catalogue', render: () => <CategoriesModule /> },
      { to: '/admin/origines', label: 'Origines & régions', icon: 'map', resource: 'origines', render: () => <RegionsModule /> },
      { to: '/admin/fournisseurs', label: 'Fournisseurs & producteurs', icon: 'users', resource: 'fournisseurs', render: () => <SuppliersModule /> },
      { to: '/admin/contenus', label: 'Contenus & nutrition', icon: 'doc', resource: 'contenus', render: () => <EditorialModule /> },
    ],
  },
  {
    label: 'Opérations',
    items: [
      { to: '/admin/stocks', label: 'Stocks & lots', icon: 'lot', resource: 'stocks', render: () => <InventoryModule /> },
      { to: '/admin/commandes', label: 'Commandes', icon: 'cart', resource: 'commandes', render: () => <OrdersModule /> },
      { to: '/admin/clients', label: 'Clients', icon: 'user', resource: 'clients', render: () => <CustomersModule /> },
      { to: '/admin/livraisons', label: 'Livraisons & zones', icon: 'truck', resource: 'livraisons', render: () => <DeliveryModule /> },
      { to: '/admin/promotions', label: 'Promotions & coffrets', icon: 'tag', resource: 'promotions', render: () => <MarketingModule /> },
    ],
  },
  {
    label: 'Administration',
    items: [
      { to: '/admin/parametres', label: 'Paramètres', icon: 'settings', resource: 'parametres', render: () => <SettingsModule /> },
      { to: '/admin/equipe', label: 'Équipe & rôles', icon: 'shield', resource: 'equipe', render: () => <TeamModule /> },
      { to: '/admin/boutiques', label: 'Boutiques & abonnement', icon: 'store', resource: 'boutiques', render: () => <ShopsModule /> },
    ],
  },
];

function Login() {
  const [email, setEmail] = useState('admin@exemple.sn');
  const [role, setRole] = useState<Role>('proprietaire');
  const [err, setErr] = useState('');
  useDocumentTitle('Administration');
  return (
    <div className="login">
      <div className="login-card">
        <Logo />
        <h1 className="login-title">Espace administration</h1>
        <Notice tone="warn" title="Connexion simulée.">
          Aucun mot de passe n’est vérifié et les données restent dans ce navigateur : cet écran ne protège rien. L’authentification sécurisée sera assurée par l’API (phase SaaS).
        </Notice>
        <form
          onSubmit={async (e: { preventDefault(): void }) => {
            e.preventDefault();
            setErr('');
            try {
              await services.auth.signIn(email, role);
            } catch (x) {
              setErr(x instanceof ServiceError ? x.message : 'Connexion impossible.');
            }
          }}
        >
          <div className="field">
            <label className="label" htmlFor="login-email">
              E-mail
            </label>
            <input id="login-email" className="input" type="email" autoComplete="username" value={email} onChange={(e: { target: { value: string } }) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label className="label" htmlFor="login-role">
              Rôle à simuler
            </label>
            <select id="login-role" className="select" value={role} onChange={(e: { target: { value: string } }) => setRole(e.target.value as Role)}>
              {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {err && (
            <p className="error" role="alert">
              {err}
            </p>
          )}
          <button type="submit" className="btn btn-dark btn-lg btn-block">
            Entrer dans l’administration
          </button>
        </form>
        <p className="center small">
          <Link to="/">← Retour à la boutique</Link>
        </p>
      </div>
    </div>
  );
}

export function AdminApp({ path, query }: { path: string; query: URLSearchParams }) {
  const session = useSession();
  const settings = useSettings();
  const [menu, setMenu] = useState(false);
  const all = NAV.flatMap((g) => g.items);
  const current = all.find((i) => i.to === path) ?? (path === '/admin/' ? all[0] : undefined);
  useDocumentTitle(current ? `${current.label} — Administration` : 'Administration');
  if (!session) return <Login />;

  if ((path === '/admin' || path === '/admin/') && !can(session.role, 'statistiques', 'lire')) {
    const first = all.find((i) => can(session.role, i.resource, 'lire'));
    if (first) {
      setTimeout(() => redirect(first.to), 0);
      return null;
    }
  }
  const allowed = current && can(session.role, current.resource, 'lire');
  return (
    <div className="admin">
      <a href="#admin-main" className="skip" onClick={(e: { preventDefault(): void }) => { e.preventDefault(); document.getElementById('admin-main')?.focus(); }}>
        Aller au contenu
      </a>
      <aside className={`admin-side ${menu ? 'open' : ''}`} aria-label="Menu d’administration">
        <div className="admin-brand">
          <Logo light />
        </div>
        <p className="admin-shop">
          <Icon name="store" size={15} /> {settings.name}
        </p>
        <nav>
          {NAV.map((g) => {
            const items = g.items.filter((i) => can(session.role, i.resource, 'lire'));
            if (!items.length) return null;
            return (
              <div key={g.label} className="admin-group">
                <p className="admin-group-label">{g.label}</p>
                <ul>
                  {items.map((i) => (
                    <li key={i.to}>
                      <Link to={i.to} className="admin-link" aria-current={current?.to === i.to ? 'page' : undefined} onClick={() => setMenu(false)}>
                        <Icon name={i.icon} size={18} /> {i.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="admin-body">
        <div className="sim-banner" role="note">
          <Icon name="alert" size={16} /> Démonstration : authentification simulée, aucune protection réelle des données.
        </div>
        <header className="admin-top">
          <button type="button" className="icon-btn only-mobile-admin" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            <Icon name={menu ? 'close' : 'menu'} />
          </button>
          <Link to="/" className="btn btn-outline btn-sm">
            <Icon name="external" size={15} /> Voir la boutique
          </Link>
          <div className="admin-user">
            <span className="avatar" aria-hidden="true">
              {session.user.email.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{session.user.email}</strong>
              <span className="muted small"> · {ROLE_LABELS[session.role]}</span>
            </span>
            <button type="button" className="icon-btn" aria-label="Se déconnecter" onClick={() => services.auth.signOut()}>
              <Icon name="logout" size={18} />
            </button>
          </div>
        </header>
        <main id="admin-main" className="admin-main" tabIndex={-1}>
          {!current ? (
            <Notice tone="warn">Ce module n’existe pas.</Notice>
          ) : !allowed ? (
            <Notice tone="danger" title="Accès non autorisé pour votre rôle.">
              Ce module n’est pas accessible au rôle « {ROLE_LABELS[session.role]} ».
            </Notice>
          ) : (
            current.render(query)
          )}
        </main>
      </div>
    </div>
  );
}
