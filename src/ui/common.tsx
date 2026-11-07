import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { VerificationStatus } from '../types';
import { VERIFICATION_HELP, VERIFICATION_LABELS } from '../domain/format';
import { Icon } from './Icon';

export function VerificationBadge({ status, withHelp = false }: { status: VerificationStatus; withHelp?: boolean }) {
  return (
    <span className={`vbadge vbadge-${status}`}>
      <Icon name={status === 'verifie' ? 'check' : status === 'non_renseigne' ? 'info' : 'alert'} size={14} />
      <span>{VERIFICATION_LABELS[status]}</span>
      {withHelp && <span className="vbadge-help">— {VERIFICATION_HELP[status]}</span>}
    </span>
  );
}

export function Notice({ tone = 'info', children, title }: { tone?: 'info' | 'warn' | 'danger' | 'ok'; children?: ReactNode; title?: string }) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'danger' ? 'alert' : 'note'}>
      <Icon name={tone === 'ok' ? 'check' : tone === 'info' ? 'info' : 'alert'} size={18} />
      <div>
        {title && <strong>{title} </strong>}
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <div className="empty-body">{children}</div>}
    </div>
  );
}

// ---------- Notifications (toasts) ----------
interface Toast {
  id: number;
  message: string;
  tone: 'ok' | 'danger' | 'info';
}
const ToastCtx = createContext<(message: string, tone?: Toast['tone']) => void>(() => undefined);

export function ToastProvider({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <Icon name={t.tone === 'danger' ? 'alert' : 'check'} size={18} />
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

export function QtyStepper({ value, onChange, max, label }: { value: number; onChange: (n: number) => void; max?: number; label: string }) {
  return (
    <div className="qty" role="group" aria-label={label}>
      <button type="button" className="qty-btn" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label="Diminuer la quantité">
        <Icon name="minus" size={16} />
      </button>
      <input
        className="qty-input"
        inputMode="numeric"
        aria-label="Quantité"
        value={value}
        onChange={(e: { target: { value: string } }) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
          onChange(Number.isFinite(n) && n > 0 ? (max ? Math.min(n, max) : n) : 1);
        }}
      />
      <button type="button" className="qty-btn" onClick={() => onChange(max ? Math.min(max, value + 1) : value + 1)} disabled={max !== undefined && value >= max} aria-label="Augmenter la quantité">
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}
