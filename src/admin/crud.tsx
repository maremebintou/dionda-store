/**
 * Gestionnaire générique d'entités (liste + recherche + filtres + formulaire à onglets).
 * Chaque module d'administration le configure avec des colonnes et des sections de champs.
 */
import { useMemo, useState, type ReactNode } from 'react';
import type { CreateInput, Resource, ShopScoped } from '../types';
import type { Repository } from '../services/contracts';
import { ServiceError } from '../services/contracts';
import { useCollection, useSession } from '../app/hooks';
import { can } from '../domain/permissions';
import { Dialog } from '../ui/Dialog';
import { Tabs } from '../ui/Tabs';
import { Icon } from '../ui/Icon';
import { Empty, Notice, useToast } from '../ui/common';
import { UNIT_LABELS } from './labels';
import { uid } from '../domain/format';
import { resolvePhoto } from '../ui/ProductVisual';

/* ---------- accès par chemin "a.b.c" ---------- */
type Dict = Record<string, unknown>;
export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Dict)[k] : undefined), obj);
}
export function setPath<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.');
  const src = (obj ?? {}) as Dict;
  return { ...src, [head]: rest.length ? setPath(src[head], rest.join('.'), value) : value } as T;
}

export type Option = { value: string; label: string };
export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'select' | 'checkbox' | 'date' | 'list' | 'sources' | 'nutrition' | 'formats' | 'bundleItems' | 'color' | 'email' | 'photo';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: Option[];
  required?: boolean;
  help?: string;
  placeholder?: string;
  wide?: boolean;
  optional?: boolean;
  min?: number;
  /** pour bundleItems */
  products?: { id: string; name: string; formats: { id: string; label: string }[] }[];
}

export interface SectionDef {
  id: string;
  label: string;
  intro?: ReactNode;
  fields: FieldDef[];
}

export interface ColumnDef<T> {
  label: string;
  render: (item: T) => ReactNode;
  className?: string;
}

export interface FilterDef<T> {
  id: string;
  label: string;
  options: Option[];
  test: (item: T, value: string) => boolean;
}

/* ---------- Champs ---------- */
function toDateInput(iso: unknown) {
  return typeof iso === 'string' && iso ? iso.slice(0, 10) : '';
}

export function FieldInput({ field, value, onChange, error, disabled, idPrefix }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; error?: string; disabled?: boolean; idPrefix: string }) {
  const id = `${idPrefix}-${field.name.replace(/\./g, '-')}`;
  const describedBy = [field.help ? `${id}-help` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  const common = { id, disabled, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy };
  let control: ReactNode;
  switch (field.type) {
    case 'textarea':
      control = <textarea {...common} className="input" rows={4} value={String(value ?? '')} onChange={(e: { target: { value: string } }) => onChange(e.target.value)} placeholder={field.placeholder} />;
      break;
    case 'number':
    case 'money':
      control = (
        <div className="input-affix">
          <input
            {...common}
            className="input"
            type="number"
            inputMode="numeric"
            min={field.min ?? 0}
            step={1}
            value={value === undefined || value === null ? '' : String(value)}
            onChange={(e: { target: { value: string } }) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
          />
          {field.type === 'money' && <span className="affix">FCFA</span>}
        </div>
      );
      break;
    case 'select':
      control = (
        <select {...common} className="select" value={String(value ?? '')} onChange={(e: { target: { value: string } }) => onChange(e.target.value || undefined)}>
          {!field.required && <option value="">— Aucun —</option>}
          {field.required && !value && <option value="">Choisir…</option>}
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case 'checkbox':
      return (
        <label className={`check field ${field.wide ? 'field-wide' : ''}`}>
          <input id={id} type="checkbox" disabled={disabled} checked={Boolean(value)} onChange={(e: { target: { checked: boolean } }) => onChange(e.target.checked)} />
          <span>
            {field.label}
            {field.help && <span className="help"> — {field.help}</span>}
          </span>
        </label>
      );
    case 'date':
      control = <input {...common} className="input" type="date" value={toDateInput(value)} onChange={(e: { target: { value: string } }) => onChange(e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : undefined)} />;
      break;
    case 'color':
      control = <input {...common} className="input input-color" type="color" value={String(value ?? '#000000')} onChange={(e: { target: { value: string } }) => onChange(e.target.value)} />;
      break;
    case 'list': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      control = (
        <textarea
          {...common}
          className="input"
          rows={Math.max(3, arr.length + 1)}
          value={arr.join('\n')}
          placeholder={field.placeholder ?? 'Une entrée par ligne'}
          onChange={(e: { target: { value: string } }) => onChange(e.target.value.split('\n').map((s) => s.trimStart()).filter((s, i, a) => s !== '' || i === a.length - 1))}
          onBlur={() => onChange(arr.map((s) => s.trim()).filter(Boolean))}
        />
      );
      break;
    }
    case 'sources': {
      const arr = Array.isArray(value) ? (value as { label: string; url?: string }[]) : [];
      control = (
        <div className="rows" id={id}>
          {arr.map((s, i) => (
            <div className="row-line" key={i}>
              <input className="input" aria-label={`Source ${i + 1} : intitulé`} placeholder="Intitulé (ouvrage, étude, organisme…)" disabled={disabled} value={s.label} onChange={(e: { target: { value: string } }) => onChange(arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input className="input" aria-label={`Source ${i + 1} : lien`} placeholder="https://… (facultatif)" disabled={disabled} value={s.url ?? ''} onChange={(e: { target: { value: string } }) => onChange(arr.map((x, j) => (j === i ? { ...x, url: e.target.value || undefined } : x)))} />
              <button type="button" className="icon-btn" disabled={disabled} aria-label={`Supprimer la source ${i + 1}`} onClick={() => onChange(arr.filter((_, j) => j !== i))}>
                <Icon name="trash" size={17} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" disabled={disabled} onClick={() => onChange([...arr, { label: '' }])}>
            <Icon name="plus" size={15} /> Ajouter une source
          </button>
        </div>
      );
      break;
    }
    case 'nutrition': {
      const arr = Array.isArray(value) ? (value as { nutrient: string; amount: number; unit: string; per: string }[]) : [];
      const upd = (i: number, k: string, v: unknown) => onChange(arr.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
      control = (
        <div className="rows" id={id}>
          {arr.length > 0 && (
            <div className="row-line row-head" aria-hidden="true">
              <span>Nutriment</span>
              <span>Quantité</span>
              <span>Unité</span>
              <span>Pour</span>
              <span />
            </div>
          )}
          {arr.map((n, i) => (
            <div className="row-line row-nutri" key={i}>
              <input className="input" aria-label="Nutriment" disabled={disabled} value={n.nutrient} onChange={(e: { target: { value: string } }) => upd(i, 'nutrient', e.target.value)} placeholder="Protéines" />
              <input className="input" aria-label="Quantité" type="number" step="any" min={0} disabled={disabled} value={Number.isFinite(n.amount) ? n.amount : ''} onChange={(e: { target: { value: string } }) => upd(i, 'amount', Number(e.target.value))} />
              <input className="input" aria-label="Unité" disabled={disabled} value={n.unit} onChange={(e: { target: { value: string } }) => upd(i, 'unit', e.target.value)} placeholder="g" />
              <input className="input" aria-label="Pour" disabled={disabled} value={n.per} onChange={(e: { target: { value: string } }) => upd(i, 'per', e.target.value)} placeholder="100 g" />
              <button type="button" className="icon-btn" disabled={disabled} aria-label="Supprimer la ligne" onClick={() => onChange(arr.filter((_, j) => j !== i))}>
                <Icon name="trash" size={17} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-outline btn-sm" disabled={disabled} onClick={() => onChange([...arr, { nutrient: '', amount: 0, unit: 'g', per: '100 g' }])}>
            <Icon name="plus" size={15} /> Ajouter une valeur
          </button>
        </div>
      );
      break;
    }
    case 'formats': {
      const arr = Array.isArray(value) ? (value as Dict[]) : [];
      const upd = (i: number, k: string, v: unknown) => onChange(arr.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
      control = (
        <div className="rows" id={id}>
          <div className="table-wrap">
            <table className="table table-compact table-edit">
              <thead>
                <tr>
                  <th scope="col">Libellé</th>
                  <th scope="col">Qté</th>
                  <th scope="col">Unité</th>
                  <th scope="col">Prix (FCFA)</th>
                  <th scope="col">Prix barré</th>
                  <th scope="col">Réf. (SKU)</th>
                  <th scope="col">Seuil alerte</th>
                  <th scope="col">Actif</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {arr.map((f, i) => (
                  <tr key={String(f.id)}>
                    <td>
                      <input className="input" aria-label="Libellé du format" disabled={disabled} value={String(f.label ?? '')} onChange={(e: { target: { value: string } }) => upd(i, 'label', e.target.value)} placeholder="Sachet 250 g" />
                    </td>
                    <td>
                      <input className="input input-num" aria-label="Quantité" type="number" min={0} step="any" disabled={disabled} value={String(f.quantity ?? '')} onChange={(e: { target: { value: string } }) => upd(i, 'quantity', Number(e.target.value))} />
                    </td>
                    <td>
                      <select className="select" aria-label="Unité" disabled={disabled} value={String(f.unit)} onChange={(e: { target: { value: string } }) => upd(i, 'unit', e.target.value)}>
                        {Object.entries(UNIT_LABELS).map(([k, l]) => (
                          <option key={k} value={k}>
                            {l}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input className="input input-num" aria-label="Prix en FCFA" type="number" min={0} step={1} disabled={disabled} value={String(f.price ?? '')} onChange={(e: { target: { value: string } }) => upd(i, 'price', Number(e.target.value))} />
                    </td>
                    <td>
                      <input className="input input-num" aria-label="Prix barré en FCFA" type="number" min={0} step={1} disabled={disabled} value={f.compareAtPrice === undefined ? '' : String(f.compareAtPrice)} onChange={(e: { target: { value: string } }) => upd(i, 'compareAtPrice', e.target.value === '' ? undefined : Number(e.target.value))} />
                    </td>
                    <td>
                      <input className="input" aria-label="Référence SKU" disabled={disabled} value={String(f.sku ?? '')} onChange={(e: { target: { value: string } }) => upd(i, 'sku', e.target.value)} />
                    </td>
                    <td>
                      <input className="input input-num" aria-label="Seuil d'alerte de stock" type="number" min={0} disabled={disabled} value={String(f.lowStockThreshold ?? 0)} onChange={(e: { target: { value: string } }) => upd(i, 'lowStockThreshold', Number(e.target.value))} />
                    </td>
                    <td>
                      <input type="checkbox" aria-label="Format actif" disabled={disabled} checked={Boolean(f.active)} onChange={(e: { target: { checked: boolean } }) => upd(i, 'active', e.target.checked)} />
                    </td>
                    <td>
                      <button type="button" className="icon-btn" disabled={disabled || arr.length <= 1} aria-label="Supprimer le format" onClick={() => onChange(arr.filter((_, j) => j !== i))}>
                        <Icon name="trash" size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-outline btn-sm" disabled={disabled} onClick={() => onChange([...arr, { id: uid('fmt_'), label: '', quantity: 0, unit: 'g', price: 0, sku: '', lowStockThreshold: 5, active: true }])}>
            <Icon name="plus" size={15} /> Ajouter un format
          </button>
        </div>
      );
      break;
    }
    case 'bundleItems': {
      const arr = Array.isArray(value) ? (value as { productId: string; formatId: string; quantity: number }[]) : [];
      const prods = field.products ?? [];
      const upd = (i: number, patch: Dict) => onChange(arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));
      control = (
        <div className="rows" id={id}>
          {arr.map((it, i) => {
            const p = prods.find((x) => x.id === it.productId);
            return (
              <div className="row-line row-bundle" key={i}>
                <select className="select" aria-label="Produit" disabled={disabled} value={it.productId} onChange={(e: { target: { value: string } }) => { const np = prods.find((x) => x.id === e.target.value); upd(i, { productId: e.target.value, formatId: np?.formats[0]?.id ?? '' }); }}>
                  {prods.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <select className="select" aria-label="Format" disabled={disabled} value={it.formatId} onChange={(e: { target: { value: string } }) => upd(i, { formatId: e.target.value })}>
                  {p?.formats.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <input className="input input-num" aria-label="Quantité" type="number" min={1} disabled={disabled} value={it.quantity} onChange={(e: { target: { value: string } }) => upd(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
                <button type="button" className="icon-btn" disabled={disabled} aria-label="Retirer ce produit du coffret" onClick={() => onChange(arr.filter((_, j) => j !== i))}>
                  <Icon name="trash" size={17} />
                </button>
              </div>
            );
          })}
          <button type="button" className="btn btn-outline btn-sm" disabled={disabled || !prods.length} onClick={() => onChange([...arr, { productId: prods[0].id, formatId: prods[0].formats[0]?.id ?? '', quantity: 1 }])}>
            <Icon name="plus" size={15} /> Ajouter un produit
          </button>
        </div>
      );
      break;
    }
    case 'photo': {
      const name = String(value ?? '');
      control = (
        <div className="photo-field">
          <div className="photo-preview">{name ? <PhotoPreview name={name} /> : <span className="muted small">Aucune photo</span>}</div>
          <div className="photo-controls">
            <input {...common} className="input" value={name} placeholder="fonio.jpg" onChange={(e: { target: { value: string } }) => onChange(e.target.value.trim())} />
            <div className="row-actions" style={{ justifyContent: 'flex-start' }}>
              <label className={`btn btn-outline btn-sm ${disabled ? 'is-disabled' : ''}`}>
                Choisir dans le dossier photos
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={disabled}
                  onChange={(e: { target: { files: FileList | null; value: string } }) => {
                    const f = e.target.files?.[0];
                    if (f) onChange(f.name);
                    e.target.value = '';
                  }}
                />
              </label>
              {name && (
                <button type="button" className="btn btn-outline btn-sm" disabled={disabled} onClick={() => onChange('')}>
                  Retirer la photo
                </button>
              )}
            </div>
          </div>
        </div>
      );
      break;
    }
    default:
      control = <input {...common} className="input" type={field.type === 'email' ? 'email' : 'text'} value={String(value ?? '')} placeholder={field.placeholder} onChange={(e: { target: { value: string } }) => onChange(e.target.value)} />;
  }
  const multi = ['photo', 'list', 'sources', 'nutrition', 'formats', 'bundleItems', 'textarea'].includes(field.type);
  return (
    <div className={`field ${field.wide || multi ? 'field-wide' : ''}`}>
      <label className="label" htmlFor={id}>
        {field.label} {field.required && <span aria-hidden="true" className="req">*</span>}
        {field.optional && <span className="muted"> (facultatif)</span>}
      </label>
      {control}
      {field.help && (
        <p className="help" id={`${id}-help`}>
          {field.help}
        </p>
      )}
      {error && (
        <p className="error small" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

function PhotoPreview({ name }: { name: string }) {
  const src = resolvePhoto(name);
  const [status, setStatus] = useState<{ src: string; ok: boolean } | null>(null);
  const known = status?.src === src;
  return (
    <>
      <img key={src} src={src} alt="" className={known && status?.ok ? '' : 'sr-only'} onLoad={() => setStatus({ src, ok: true })} onError={() => setStatus({ src, ok: false })} />
      {known && !status?.ok && <span className="error small">Fichier introuvable dans photos/ : l'illustration sera affichée.</span>}
    </>
  );
}

export function validateFields(sections: SectionDef[], draft: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const s of sections)
    for (const f of s.fields) {
      const v = getPath(draft, f.name);
      if (f.required && (v === undefined || v === null || (typeof v === 'string' && !v.trim()))) errors[f.name] = 'Champ obligatoire.';
      if ((f.type === 'number' || f.type === 'money') && v !== undefined && (typeof v !== 'number' || !Number.isFinite(v) || v < (f.min ?? 0))) errors[f.name] = `Valeur numérique ≥ ${f.min ?? 0} attendue.`;
      if (f.type === 'email' && typeof v === 'string' && v.trim() && !/^\S+@\S+\.\S+$/.test(v.trim())) errors[f.name] = 'Adresse e-mail invalide.';
    }
  return errors;
}

/* ---------- Formulaire à onglets ---------- */
export function EntityForm({ sections, draft, setDraft, errors, readOnly, idPrefix, initialTab }: { sections: SectionDef[]; draft: unknown; setDraft: (d: unknown) => void; errors: Record<string, string>; readOnly: boolean; idPrefix: string; initialTab?: string }) {
  const [tab, setTab] = useState(initialTab ?? sections[0]?.id);
  const body = (s: SectionDef) => (
    <div>
      {s.intro && <div className="section-intro">{s.intro}</div>}
      <div className="form-grid">
        {s.fields.map((f) => (
          <FieldInput key={f.name} field={f} idPrefix={idPrefix} value={getPath(draft, f.name)} error={errors[f.name]} disabled={readOnly} onChange={(v) => setDraft(setPath(draft, f.name, v))} />
        ))}
      </div>
    </div>
  );
  if (sections.length === 1) return body(sections[0]);
  return (
    <Tabs
      label="Sections du formulaire"
      active={tab}
      onChange={setTab}
      tabs={sections.map((s) => ({
        id: s.id,
        label: (
          <>
            {s.label}
            {s.fields.some((f) => errors[f.name]) && <span className="tab-error" aria-label="contient des erreurs">!</span>}
          </>
        ),
        content: body(s),
      }))}
    />
  );
}

/* ---------- Gestionnaire générique ---------- */
export interface EntityManagerProps<T extends ShopScoped> {
  title: string;
  description?: ReactNode;
  singular: string;
  repo: Repository<T>;
  resource: Resource;
  columns: ColumnDef<T>[];
  sections: SectionDef[] | ((draft: T) => SectionDef[]);
  createEmpty: () => CreateInput<T>;
  searchText: (item: T) => string;
  itemLabel: (item: T) => string;
  filters?: FilterDef<T>[];
  validate?: (draft: T, all: T[]) => Record<string, string>;
  beforeSave?: (draft: T) => T;
  deleteBlocker?: (item: T) => string | undefined;
  sort?: (a: T, b: T) => number;
  toolbar?: ReactNode;
  rowActions?: (item: T) => ReactNode;
  dialogSize?: 'md' | 'lg' | 'xl';
  /** ouverture directe d'un élément (lien depuis un autre module) */
  openId?: string;
  openTab?: string;
  allowCreate?: boolean;
  /** contenu ajouté sous le titre (ex. alertes) */
  header?: ReactNode;
}

/** Fenêtre de formulaire autonome (actions métier : réception de lot, mouvement de stock…). */
export function FormDialog<D>(props: { open: boolean; title: string; sections: SectionDef[]; initial: D; onClose: () => void; onSubmit: (d: D) => Promise<void>; submitLabel: string; validate?: (d: D) => Record<string, string> }) {
  const [draft, setDraft] = useState<D>(props.initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [openKey, setOpenKey] = useState(false);
  if (props.open !== openKey) {
    setOpenKey(props.open);
    if (props.open) {
      setDraft(props.initial);
      setErrors({});
      setErr('');
    }
  }
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.title}
      size="lg"
      footer={
        <div className="form-actions">
          {err && (
            <p className="error" role="alert">
              {err}
            </p>
          )}
          <button type="button" className="btn btn-outline" onClick={props.onClose}>
            Annuler
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              const e = { ...validateFields(props.sections, draft), ...(props.validate?.(draft) ?? {}) };
              setErrors(e);
              if (Object.keys(e).length) {
                setErr('Le formulaire contient des erreurs.');
                return;
              }
              try {
                await props.onSubmit(draft);
              } catch (x) {
                setErr(x instanceof ServiceError ? x.message : 'Opération impossible.');
              }
            }}
          >
            {props.submitLabel}
          </button>
        </div>
      }
    >
      {props.open && <EntityForm sections={props.sections} draft={draft} setDraft={(d) => setDraft(d as D)} errors={errors} readOnly={false} idPrefix="frm" />}
    </Dialog>
  );
}

export function EntityManager<T extends ShopScoped>(props: EntityManagerProps<T>) {
  const items = useCollection(props.repo);
  const session = useSession();
  const toast = useToast();
  const writable = Boolean(session && can(session.role, props.resource, 'ecrire'));
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<{ id?: string; draft: T; tab?: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<T | null>(null);
  const [formError, setFormError] = useState('');
  const [openedFromLink, setOpenedFromLink] = useState('');

  if (props.openId && openedFromLink !== props.openId) {
    const found = items.find((x) => x.id === props.openId);
    if (found) {
      setOpenedFromLink(props.openId);
      setEditing({ id: found.id, draft: structuredClone(found), tab: props.openTab });
    }
  }

  const list = useMemo(() => {
    const s = search.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    let l = items.filter((it) => !s || props.searchText(it).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(s));
    for (const f of props.filters ?? []) {
      const v = filterValues[f.id];
      if (v) l = l.filter((it) => f.test(it, v));
    }
    return props.sort ? [...l].sort(props.sort) : l;
  }, [items, search, filterValues, props]);

  const sectionsFor = (d: T) => (typeof props.sections === 'function' ? props.sections(d) : props.sections);

  const save = async () => {
    if (!editing) return;
    setFormError('');
    const draft = props.beforeSave ? props.beforeSave(editing.draft) : editing.draft;
    const errs = { ...validateFields(sectionsFor(draft), draft), ...(props.validate?.(draft, items) ?? {}) };
    setErrors(errs);
    if (Object.keys(errs).length) {
      setFormError('Le formulaire contient des erreurs : vérifiez les champs signalés.');
      return;
    }
    try {
      const { id: _id, shopId: _s, createdAt: _c, updatedAt: _u, ...data } = draft as T & Dict;
      if (editing.id) await props.repo.update(editing.id, data as never);
      else await props.repo.create(data as never);
      toast(editing.id ? `${props.singular} mis(e) à jour` : `${props.singular} créé(e)`);
      setEditing(null);
    } catch (e) {
      setFormError(e instanceof ServiceError ? e.message : 'Enregistrement impossible.');
    }
  };

  const blocker = confirmDelete ? props.deleteBlocker?.(confirmDelete) : undefined;

  return (
    <div className="manager">
      <div className="mgr-head">
        <div>
          {props.title && <h1 className="admin-title">{props.title}</h1>}
          {props.description && <div className="admin-lead">{props.description}</div>}
        </div>
        {writable && props.allowCreate !== false && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setErrors({});
              setFormError('');
              setEditing({ draft: props.createEmpty() as unknown as T });
            }}
          >
            <Icon name="plus" size={17} /> Ajouter
          </button>
        )}
      </div>
      {!writable && <Notice tone="info">Votre rôle permet la consultation de ce module, pas sa modification.</Notice>}
      {props.header}
      <div className="mgr-bar">
        <label className="search-field">
          <Icon name="search" size={17} />
          <span className="sr-only">Rechercher</span>
          <input type="search" placeholder="Rechercher…" value={search} onChange={(e: { target: { value: string } }) => setSearch(e.target.value)} />
        </label>
        {props.filters?.map((f) => (
          <label key={f.id} className="inline-field">
            <span className="sr-only">{f.label}</span>
            <select className="select select-sm" value={filterValues[f.id] ?? ''} onChange={(e: { target: { value: string } }) => setFilterValues((v) => ({ ...v, [f.id]: e.target.value }))}>
              <option value="">{f.label} : tous</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {props.toolbar}
        <span className="mgr-count" aria-live="polite">
          {list.length} élément{list.length > 1 ? 's' : ''}
        </span>
      </div>
      {list.length ? (
        <div className="table-wrap">
          <table className="table admin-table">
            <thead>
              <tr>
                {props.columns.map((c) => (
                  <th key={c.label} scope="col" className={c.className}>
                    {c.label}
                  </th>
                ))}
                <th scope="col" className="col-actions">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((it) => (
                <tr key={it.id}>
                  {props.columns.map((c) => (
                    <td key={c.label} className={c.className}>
                      {c.render(it)}
                    </td>
                  ))}
                  <td className="col-actions">
                    <div className="row-actions">
                      {props.rowActions?.(it)}
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setErrors({});
                          setFormError('');
                          setEditing({ id: it.id, draft: structuredClone(it) });
                        }}
                        aria-label={`${writable ? 'Modifier' : 'Consulter'} ${props.itemLabel(it)}`}
                      >
                        <Icon name={writable ? 'edit' : 'doc'} size={15} /> {writable ? 'Modifier' : 'Voir'}
                      </button>
                      {writable && (
                        <button type="button" className="icon-btn danger-hover" aria-label={`Supprimer ${props.itemLabel(it)}`} onClick={() => setConfirmDelete(it)}>
                          <Icon name="trash" size={17} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title={items.length ? 'Aucun résultat pour ces critères.' : 'Aucun élément pour le moment.'} />
      )}

      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size={props.dialogSize ?? 'lg'}
        title={editing?.id ? `${writable ? 'Modifier' : 'Consulter'} : ${editing ? props.itemLabel(editing.draft) : ''}` : `Nouveau / nouvelle : ${props.singular.toLowerCase()}`}
        footer={
          <div className="form-actions">
            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}
            <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>
              {writable ? 'Annuler' : 'Fermer'}
            </button>
            {writable && (
              <button type="button" className="btn btn-primary" onClick={save}>
                Enregistrer
              </button>
            )}
          </div>
        }
      >
        {editing && <EntityForm key={editing.id ?? 'new'} sections={sectionsFor(editing.draft)} draft={editing.draft} setDraft={(d) => setEditing((e) => (e ? { ...e, draft: d as T } : e))} errors={errors} readOnly={!writable} idPrefix="ent" initialTab={editing.tab} />}
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title="Confirmer la suppression" size="md"
        footer={
          <div className="form-actions">
            <button type="button" className="btn btn-outline" onClick={() => setConfirmDelete(null)}>
              Annuler
            </button>
            {!blocker && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={async () => {
                  if (!confirmDelete) return;
                  await props.repo.remove(confirmDelete.id);
                  toast(`${props.itemLabel(confirmDelete)} supprimé(e)`);
                  setConfirmDelete(null);
                }}
              >
                Supprimer définitivement
              </button>
            )}
          </div>
        }
      >
        {confirmDelete && (blocker ? <Notice tone="warn">{blocker}</Notice> : <p>Supprimer « {props.itemLabel(confirmDelete)} » ? Cette action est irréversible.</p>)}
      </Dialog>
    </div>
  );
}

export function Pill({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'accent'; children?: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
