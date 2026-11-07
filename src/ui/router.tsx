/** Routeur minimal basé sur le hash (#/boutique) : fonctionne en fichier local et sur GitHub Pages. */
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';

/**
 * La route courante est gardée en mémoire ET dans le hash : si l'environnement
 * d'hébergement ignore ou réécrit le hash (iframe, aperçu), la navigation fonctionne quand même.
 */
let memoryPath: string | null = null;
const EVENT = 'dionda:navigate';

function current(): string {
  const h = window.location.hash.replace(/^#/, '');
  if (h.startsWith('/')) return h;
  return memoryPath ?? '/';
}

export function useLocation(): { path: string; query: URLSearchParams } {
  const [loc, setLoc] = useState(current());
  useEffect(() => {
    const on = () => setLoc(current());
    const onHash = () => {
      const h = window.location.hash.replace(/^#/, '');
      if (h.startsWith('/')) memoryPath = h;
      on();
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener(EVENT, on);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener(EVENT, on);
    };
  }, []);
  const [path, qs = ''] = loc.split('?');
  return { path, query: new URLSearchParams(qs) };
}

export function navigate(to: string) {
  if (current() === to) return;
  memoryPath = to;
  try {
    window.location.hash = to;
  } catch {
    /* hash non modifiable : la route mémoire suffit */
  }
  window.dispatchEvent(new Event(EVENT));
  window.scrollTo({ top: 0 });
}

/** Remplace la route courante (redirections). */
export function redirect(to: string) {
  memoryPath = to;
  try {
    window.location.replace(`#${to}`);
  } catch {
    /* ignoré */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** "/produit/:slug" + "/produit/fonio" -> { slug: "fonio" } */
export function match(pattern: string, path: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean);
  const b = path.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

export function Link(props: { to: string; className?: string; children?: ReactNode; onClick?: () => void; 'aria-label'?: string; 'aria-current'?: 'page' | undefined }) {
  const { to, children, onClick, ...rest } = props;
  return (
    <a
      href={`#${to}`}
      {...rest}
      onClick={(e: MouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.button !== 0) return;
        e.preventDefault();
        onClick?.();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
