import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface TabDef {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

/** Onglets accessibles (motif WAI-ARIA : flèches gauche/droite, Début, Fin). */
export function Tabs(props: { tabs: TabDef[]; active: string; onChange: (id: string) => void; label: string; className?: string }) {
  const base = useId().replace(/[^a-zA-Z0-9]/g, '');
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const idx = Math.max(0, props.tabs.findIndex((t) => t.id === props.active));
  const onKey = (e: KeyboardEvent) => {
    let next = idx;
    if (e.key === 'ArrowRight') next = (idx + 1) % props.tabs.length;
    else if (e.key === 'ArrowLeft') next = (idx - 1 + props.tabs.length) % props.tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = props.tabs.length - 1;
    else return;
    e.preventDefault();
    const id = props.tabs[next].id;
    props.onChange(id);
    refs.current[id]?.focus();
  };
  const activeTab = props.tabs[idx];
  return (
    <div className={`tabs ${props.className ?? ''}`}>
      <div role="tablist" aria-label={props.label} className="tablist" onKeyDown={onKey}>
        {props.tabs.map((t) => (
          <button
            key={t.id}
            ref={(el: HTMLButtonElement | null) => {
              refs.current[t.id] = el;
            }}
            role="tab"
            type="button"
            id={`${base}-tab-${t.id}`}
            aria-selected={t.id === activeTab.id}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={t.id === activeTab.id ? 0 : -1}
            className="tab"
            onClick={() => props.onChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-panel-${activeTab.id}`} aria-labelledby={`${base}-tab-${activeTab.id}`} className="tabpanel" tabIndex={0}>
        {activeTab.content}
      </div>
    </div>
  );
}
