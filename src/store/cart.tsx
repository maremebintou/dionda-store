import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { lineKey, type CartLine } from '../domain/pricing';
import { services } from '../app/services';
import { NS } from '../services/local/storage';

interface CartState {
  lines: CartLine[];
  count: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (line: CartLine) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  promoCode: string;
  setPromoCode: (c: string) => void;
}

const Ctx = createContext<CartState | null>(null);
const keyFor = () => `${NS}:${services.shops.current().id}:cart`;

function load(): CartLine[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(keyFor()) ?? '[]');
    return Array.isArray(raw) ? (raw as CartLine[]).filter((l) => l && l.quantity > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children?: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);
  const [isOpen, setOpen] = useState(false);
  const [promoCode, setPromoCode] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(keyFor(), JSON.stringify(lines));
    } catch {
      /* stockage indisponible : panier en mémoire uniquement */
    }
  }, [lines]);
  useEffect(() => services.shops.subscribe(() => setLines(load())), []);

  const value = useMemo<CartState>(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      add: (line) =>
        setLines((prev) => {
          const k = lineKey(line);
          const found = prev.find((l) => lineKey(l) === k);
          return found ? prev.map((l) => (lineKey(l) === k ? { ...l, quantity: l.quantity + line.quantity } : l)) : [...prev, line];
        }),
      setQuantity: (k, q) => setLines((prev) => prev.map((l) => (lineKey(l) === k ? { ...l, quantity: Math.max(1, Math.floor(q)) } : l))),
      remove: (k) => setLines((prev) => prev.filter((l) => lineKey(l) !== k)),
      clear: () => setLines([]),
      promoCode,
      setPromoCode,
    }),
    [lines, isOpen, promoCode],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartState {
  const c = useContext(Ctx);
  if (!c) throw new Error('CartProvider manquant');
  return c;
}
