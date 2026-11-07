import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Fenêtre modale accessible basée sur <dialog> natif :
 * piège de focus, fermeture par Échap, arrière-plan inerte, retour du focus à l'élément d'origine.
 */
export function Dialog(props: { open: boolean; onClose: () => void; title: string; subtitle?: string; children?: ReactNode; size?: 'md' | 'lg' | 'xl'; side?: boolean; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (props.open && !d.open) {
      opener.current = document.activeElement as HTMLElement | null;
      d.showModal();
      document.body.classList.add('no-scroll');
    } else if (!props.open && d.open) {
      d.close();
    }
  }, [props.open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onClose = () => {
      document.body.classList.remove('no-scroll');
      opener.current?.focus?.();
      props.onClose();
    };
    d.addEventListener('close', onClose);
    return () => d.removeEventListener('close', onClose);
  }, [props.onClose]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog-${props.size ?? 'md'}${props.side ? ' dialog-side' : ''}`}
      aria-labelledby={titleId}
      onClick={(e: { target: unknown }) => {
        if (e.target === ref.current) ref.current?.close();
      }}
    >
      {props.open && (
        <div className="dialog-inner">
          <header className="dialog-head">
            <div>
              <h2 id={titleId} className="dialog-title">
                {props.title}
              </h2>
              {props.subtitle && <p className="dialog-sub">{props.subtitle}</p>}
            </div>
            <button type="button" className="icon-btn" onClick={() => ref.current?.close()} aria-label="Fermer">
              <Icon name="close" />
            </button>
          </header>
          <div className="dialog-body">{props.children}</div>
          {props.footer && <footer className="dialog-foot">{props.footer}</footer>}
        </div>
      )}
    </dialog>
  );
}
