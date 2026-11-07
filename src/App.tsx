import { useLocation, match } from './ui/router';
import { CatalogProvider } from './store/catalog';
import { CartProvider } from './store/cart';
import { ToastProvider } from './ui/common';
import { useShopVersion } from './app/hooks';
import { StoreLayout } from './storefront/Layout';
import { BundlesPage, CatalogPage, HomePage, NotFound, ProducersPage, ProductPage, TerroirsPage } from './storefront/pages';
import { CheckoutPage, ConfirmationPage } from './storefront/Checkout';
import { AdminApp } from './admin/AdminApp';
import { VITRINE } from './app/mode';

function StoreRoutes({ path, query }: { path: string; query: URLSearchParams }) {
  let p: Record<string, string> | null;
  if (path === '/') return <HomePage />;
  if (path === '/boutique') return <CatalogPage query={query} />;
  if (path === '/coffrets') return <BundlesPage />;
  if (path === '/terroirs') return <TerroirsPage />;
  if (path === '/producteurs') return <ProducersPage />;
  if (VITRINE && (path === '/commande' || path.startsWith('/confirmation/'))) return <NotFound />;
  if (path === '/commande') return <CheckoutPage />;
  if ((p = match('/produit/:slug', path))) return <ProductPage key={p.slug} slug={p.slug} />;
  if ((p = match('/confirmation/:number', path))) return <ConfirmationPage number={p.number} />;
  return <NotFound />;
}

export function App() {
  const { path, query } = useLocation();
  const version = useShopVersion(); // remonte l'arbre lors d'un changement de boutique
  const isAdmin = !VITRINE && (path === '/admin' || path.startsWith('/admin/'));
  return (
    <ToastProvider>
      <CatalogProvider key={version}>
        <CartProvider>
          {isAdmin ? (
            <AdminApp path={path} query={query} />
          ) : (
            <StoreLayout>
              <StoreRoutes path={path.split('#')[0]} query={query} />
            </StoreLayout>
          )}
        </CartProvider>
      </CatalogProvider>
    </ToastProvider>
  );
}
