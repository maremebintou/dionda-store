/**
 * Déclarations minimales de React pour la vérification de types SANS @types/react
 * (le registre npm n'était pas accessible lors de la création du prototype).
 * À SUPPRIMER après `npm install -D @types/react @types/react-dom`
 * (et retirer "shims" de tsconfig.json).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'react' {
  export type ReactNode = any;
  export type Dispatch<A> = (value: A) => void;
  export type SetStateAction<S> = S | ((prev: S) => S);
  export function useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps: readonly unknown[]): T;
  export function useRef<T>(initial: T): { current: T };
  export function useId(): string;
  export interface Context<T> {
    Provider: (props: { value: T; children?: ReactNode }) => any;
    _t?: T;
  }
  export function createContext<T>(defaultValue: T): Context<T>;
  export function useContext<T>(ctx: Context<T>): T;
  export const Fragment: any;
  export const StrictMode: any;
  export type CSSProperties = Record<string, string | number | undefined>;
  export type FormEvent = { preventDefault(): void; currentTarget: any; target: any };
  export type KeyboardEvent = { key: string; shiftKey: boolean; preventDefault(): void; currentTarget: any; target: any };
  export type MouseEvent = { preventDefault(): void; stopPropagation(): void; currentTarget: any; target: any; button: number; metaKey: boolean; ctrlKey: boolean };
  const React: { StrictMode: any };
  export default React;
}
declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
declare module 'react-dom/client' {
  export function createRoot(el: Element): { render(node: any): void };
}
declare namespace JSX {
  type Element = any;
  interface IntrinsicElements {
    [name: string]: any;
  }
  interface ElementChildrenAttribute {
    children: unknown;
  }
  interface IntrinsicAttributes {
    key?: string | number;
  }
}
declare module '*.css';
