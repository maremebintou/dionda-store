import { useState, type ReactNode } from 'react';
import { Link, navigate, useLocation } from '../ui/router';
import { Icon } from '../ui/Icon';
import { useCart } from '../store/cart';
import { useSettings } from '../app/hooks';
import { CartDrawer } from './Checkout';
import { VITRINE, VITRINE_MESSAGE } from '../app/mode';

export function Logo({ light = false }: { light?: boolean }) {
  const { signature } = useSettings();
  return (
    <span className={`logo ${light ? 'logo-light' : ''}`}>
      <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
        <circle cx="20" cy="20" r="18.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 7 L31 20 L20 33 L9 20 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 13 L25 20 L20 27 L15 20 Z" fill="currentColor" />
      </svg>
      <span className="logo-text">
        <span className="logo-name">DIONDA</span>
        <span className="logo-sub">STORE</span>
        {signature && <span className="logo-by">{signature}</span>}
      </span>
    </span>
  );
}

const NAV = [
  { to: '/', label: 'Accueil' },
  { to: '/boutique', label: 'Boutique' },
  { to: '/coffrets', label: 'Coffrets' },
  { to: '/terroirs', label: 'Terroirs' },
  { to: '/producteurs', label: 'Producteurs' },
];

export function StoreLayout({ children }: { children?: ReactNode }) {
  const cart = useCart();
  const settings = useSettings();
  const { path } = useLocation();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');

  return (
    <div className="store">
      <a href="#contenu" className="skip" onClick={(e: { preventDefault(): void }) => { e.preventDefault(); document.getElementById('contenu')?.focus(); }}>
        Aller au contenu
      </a>
      {VITRINE ? <div className="announce">{VITRINE_MESSAGE}</div> : settings.announcement && <div className="announce">{settings.announcement}</div>}
      <header className="site-header">
        <div className="container header-row">
          <button type="button" className="icon-btn only-mobile" aria-label="Menu" aria-expanded={menu} aria-controls="nav-principale" onClick={() => setMenu((m) => !m)}>
            <Icon name={menu ? 'close' : 'menu'} />
          </button>
          <Link to="/" aria-label="DIONDA STORE — accueil">
            <Logo />
          </Link>
          <nav id="nav-principale" className={`main-nav ${menu ? 'open' : ''}`} aria-label="Navigation principale">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="nav-link" aria-current={(n.to === '/' ? path === '/' : path.startsWith(n.to)) ? 'page' : undefined} onClick={() => setMenu(false)}>
                {n.label}
              </Link>
            ))}
          </nav>
          <form
            className="header-search"
            role="search"
            onSubmit={(e: { preventDefault(): void }) => {
              e.preventDefault();
              navigate(`/boutique?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <label htmlFor="recherche" className="sr-only">
              Rechercher un produit
            </label>
            <input id="recherche" type="search" placeholder="Fonio, bissap, nététou…" value={q} onChange={(e: { target: { value: string } }) => setQ(e.target.value)} />
            <button type="submit" className="icon-btn" aria-label="Lancer la recherche">
              <Icon name="search" size={18} />
            </button>
          </form>
          {!VITRINE && (
            <>
              <Link to="/admin" className="admin-entry" aria-label="Administration">
                <Icon name="settings" size={18} />
                <span>Administration</span>
              </Link>
              <button type="button" className="cart-btn" onClick={cart.open} aria-label={`Ouvrir le panier, ${cart.count} article${cart.count > 1 ? 's' : ''}`}>
                <Icon name="cart" />
                {cart.count > 0 && <span className="cart-count">{cart.count}</span>}
              </button>
            </>
          )}
        </div>
      </header>
      <main id="contenu" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="pattern-band" aria-hidden="true" />
        <div className="container footer-grid">
          <div>
            <Logo light />
            <p className="footer-slogan">{settings.slogan}</p>
          </div>
          <div>
            <h2 className="footer-title">Découvrir</h2>
            <ul>
              {NAV.slice(1).map((n) => (
                <li key={n.to}>
                  <Link to={n.to}>{n.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="footer-title">Notre engagement</h2>
            <p>Chaque fiche indique clairement si ses informations d'origine et de vertus sont vérifiées, déclarées par le fournisseur ou encore à vérifier.</p>
          </div>
          <div>
            <h2 className="footer-title">Contact</h2>
            {VITRINE && isPlaceholderContact(settings.contactEmail, settings.phone) ? (
              <p>Coordonnées bientôt disponibles.</p>
            ) : (
              <>
                <p>{settings.contactEmail}</p>
                <p>{settings.phone}</p>
              </>
            )}
            {!VITRINE && (
              <p>
                <Link to="/admin">Espace administration</Link>
              </p>
            )}
          </div>
        </div>
        <div className="container footer-legal">
          <p>
            © {new Date().getFullYear()} {settings.name} {settings.signature}{VITRINE && /compléter/i.test(settings.legalNotice) ? '' : ` · ${settings.legalNotice}`}
          </p>
          <p>{VITRINE ? 'Boutique en préparation — commande en ligne bientôt disponible.' : "Prototype de démonstration — prix en FCFA, aucune commande réelle n'est traitée."}</p>
        </div>
      </footer>
      {!VITRINE && <CartDrawer />}
    </div>
  );
}

/** Coordonnées de démonstration encore présentes (à ne pas afficher au public). */
function isPlaceholderContact(email: string, phone: string): boolean {
  return /exemple/i.test(email) || /00 000 00 00/.test(phone);
}
