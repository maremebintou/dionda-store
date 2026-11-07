/** Stockage clé/valeur minimal : localStorage dans le navigateur, mémoire dans les tests. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  keys() {
    return [...this.map.keys()];
  }
}

/** localStorage peut être indisponible (navigation privée, iframe) : repli en mémoire. */
export function browserStore(): KeyValueStore {
  try {
    const ls = window.localStorage;
    const probe = '__dionda_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      getItem: (k) => ls.getItem(k),
      setItem: (k, v) => {
        try {
          ls.setItem(k, v);
        } catch (e) {
          console.warn('Stockage local plein ou indisponible', e);
        }
      },
      removeItem: (k) => ls.removeItem(k),
      keys: () => Object.keys(ls),
    };
  } catch {
    return new MemoryStore();
  }
}

export const NS = 'dionda:v1';
