import { useEffect, useState } from 'react';
import type { Repository } from '../services/contracts';
import type { AuthSession, ShopScoped, ShopSettings } from '../types';
import { services } from './services';
import { defaultSettings } from '../data/seed';

/** Charge une collection et se réabonne aux changements (contrat Repository uniquement). */
export function useCollection<T extends ShopScoped>(repo: Repository<T>): T[] {
  const [items, setItems] = useState<T[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => {
      repo.list().then((x) => {
        if (alive) setItems(x);
      });
    };
    load();
    const un = repo.subscribe(load);
    return () => {
      alive = false;
      un();
    };
  }, [repo]);
  return items;
}

export function useSettings(): ShopSettings {
  const [s, setS] = useState<ShopSettings>(() => defaultSettings(services.shops.current().id));
  useEffect(() => {
    const load = () => {
      services.settings.get().then(setS);
    };
    load();
    return services.settings.subscribe(load);
  }, []);
  return s;
}

export function useSession(): AuthSession | null {
  const [s, setS] = useState<AuthSession | null>(() => services.auth.getSession());
  useEffect(() => services.auth.subscribe(() => setS(services.auth.getSession())), []);
  return s;
}

export function useShopVersion(): number {
  const [v, setV] = useState(0);
  useEffect(() => services.shops.subscribe(() => setV((n) => n + 1)), []);
  return v;
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · DIONDA STORE by BintouDionda` : "DIONDA STORE by BintouDionda — L'authenticité de nos terroirs";
  }, [title]);
}
