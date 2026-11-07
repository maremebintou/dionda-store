import { useMemo, useState } from 'react';
import { services } from '../../app/services';
import { useCollection, useSession } from '../../app/hooks';
import type { Lot, MovementType, Product } from '../../types';
import { EntityManager, FormDialog, Pill, type SectionDef } from '../crud';
import { MOVEMENT_LABELS, options } from '../labels';
import { formatDate } from '../../domain/format';
import { daysUntil, expiryState, quantitiesByLot, sellableQuantity, stockLevels } from '../../domain/stock';
import { can } from '../../domain/permissions';
import { Tabs } from '../../ui/Tabs';
import { Icon } from '../../ui/Icon';
import { Empty, Notice, useToast } from '../../ui/common';

function productFormatOptions(products: Product[]) {
  return products.flatMap((p) => p.formats.map((f) => ({ value: `${p.id}|${f.id}`, label: `${p.name} — ${f.label}` })));
}

const EXPIRY_LABEL = { perime: 'Périmé', proche: 'Date proche', ok: 'Conforme', sans_date: 'Sans date' } as const;
const EXPIRY_TONE = { perime: 'danger', proche: 'warn', ok: 'ok', sans_date: 'neutral' } as const;

export function ExpiryPill({ lot }: { lot: Lot }) {
  const s = expiryState(lot);
  const d = daysUntil(lot.expiryDate);
  return (
    <Pill tone={EXPIRY_TONE[s]}>
      {EXPIRY_LABEL[s]}
      {d !== undefined && s !== 'ok' ? ` (${d < 0 ? `il y a ${-d} j` : `J-${d}`})` : ''}
    </Pill>
  );
}

export function InventoryModule() {
  const products = useCollection(services.products);
  const movements = useCollection(services.movements);
  const lots = useCollection(services.lots);
  const suppliers = useCollection(services.suppliers);
  const session = useSession();
  const toast = useToast();
  const writable = Boolean(session && can(session.role, 'stocks', 'ecrire'));
  const [tab, setTab] = useState('niveaux');
  const [receiving, setReceiving] = useState(false);
  const [moving, setMoving] = useState<{ pf?: string } | null>(null);
  const [typeFilter, setTypeFilter] = useState('');

  const levels = useMemo(() => stockLevels(products, movements), [products, movements]);
  const lotQty = useMemo(() => quantitiesByLot(movements), [movements]);
  const pfOptions = productFormatOptions(products);
  const name = (pid: string, fid: string) => {
    const p = products.find((x) => x.id === pid);
    return `${p?.name ?? '?'} — ${p?.formats.find((f) => f.id === fid)?.label ?? '?'}`;
  };
  const alerts = lots.filter((l) => (lotQty.get(l.id) ?? 0) > 0 && ['perime', 'proche'].includes(expiryState(l)));
  const low = levels.filter((l) => l.state !== 'ok');

  const receiveSections: SectionDef[] = [
    {
      id: 'r',
      label: 'Réception',
      fields: [
        { name: 'pf', label: 'Produit et format', type: 'select', required: true, options: pfOptions },
        { name: 'lotNumber', label: 'Numéro de lot', type: 'text', required: true },
        { name: 'quantity', label: 'Quantité reçue (unités)', type: 'number', required: true, min: 1 },
        { name: 'supplierId', label: 'Fournisseur', type: 'select', options: suppliers.map((s) => ({ value: s.id, label: s.name })) },
        { name: 'receivedAt', label: 'Date de réception', type: 'date', required: true },
        { name: 'productionDate', label: 'Date de production', type: 'date', optional: true },
        { name: 'expiryDate', label: 'Date limite (DLC / DDM)', type: 'date', optional: true },
        { name: 'storageConditions', label: 'Conditions de conservation', type: 'text', wide: true },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ],
    },
  ];

  const movementSections: SectionDef[] = [
    {
      id: 'm',
      label: 'Mouvement',
      intro: <p className="muted small">Entrée et retour augmentent le stock ; sortie et perte le diminuent ; un ajustement accepte une valeur positive ou négative (inventaire).</p>,
      fields: [
        { name: 'pf', label: 'Produit et format', type: 'select', required: true, options: pfOptions },
        { name: 'type', label: 'Type de mouvement', type: 'select', required: true, options: options(MOVEMENT_LABELS) },
        { name: 'quantity', label: 'Quantité', type: 'number', required: true, min: -100000 },
        { name: 'lotId', label: 'Lot concerné', type: 'select', options: lots.map((l) => ({ value: l.id, label: `${l.lotNumber} · ${name(l.productId, l.formatId)}` })) },
        { name: 'reason', label: 'Motif', type: 'text', required: true, wide: true },
      ],
    },
  ];

  const filteredMovements = [...movements].filter((m) => !typeFilter || m.type === typeFilter).sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div>
      <div className="mgr-head">
        <div>
          <h1 className="admin-title">Stocks & lots</h1>
          <p className="admin-lead">Niveaux de stock par format, lots, dates limites et journal des mouvements (traçabilité).</p>
        </div>
        {writable && (
          <div className="row-actions">
            <button type="button" className="btn btn-outline" onClick={() => setMoving({})}>
              <Icon name="edit" size={16} /> Mouvement
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setReceiving(true)}>
              <Icon name="lot" size={16} /> Réceptionner un lot
            </button>
          </div>
        )}
      </div>

      {(alerts.length > 0 || low.length > 0) && (
        <div className="alerts-row">
          {alerts.length > 0 && (
            <Notice tone="warn" title={`${alerts.length} lot(s) à surveiller :`}>
              {alerts.map((l) => `${l.lotNumber} (${name(l.productId, l.formatId)})`).join(' · ')}. Les lots périmés sont automatiquement exclus de la vente.
            </Notice>
          )}
          {low.length > 0 && (
            <Notice tone="danger" title={`${low.length} format(s) en stock bas ou en rupture.`}>
              Consultez l’onglet Niveaux.
            </Notice>
          )}
        </div>
      )}

      <Tabs
        label="Vues du stock"
        active={tab}
        onChange={setTab}
        tabs={[
          {
            id: 'niveaux',
            label: 'Niveaux',
            content: (
              <div className="table-wrap">
                <table className="table admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Produit — format</th>
                      <th scope="col">SKU</th>
                      <th scope="col">Stock total</th>
                      <th scope="col">Vendable</th>
                      <th scope="col">Seuil</th>
                      <th scope="col">État</th>
                      {writable && (
                        <th scope="col">
                          <span className="sr-only">Actions</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {[...levels]
                      .sort((a, b) => (a.state === b.state ? 0 : a.state === 'rupture' ? -1 : b.state === 'rupture' ? 1 : a.state === 'bas' ? -1 : 1))
                      .map((l) => {
                        const p = products.find((x) => x.id === l.productId);
                        const f = p?.formats.find((x) => x.id === l.formatId);
                        const sellable = sellableQuantity(l.productId, l.formatId, lots, movements);
                        return (
                          <tr key={`${l.productId}${l.formatId}`}>
                            <td>
                              <strong>{p?.name}</strong> <span className="muted">— {f?.label}</span>
                            </td>
                            <td className="mono small">{f?.sku}</td>
                            <td>{l.quantity}</td>
                            <td>{sellable !== l.quantity ? <span title="Lots périmés exclus">{sellable} *</span> : sellable}</td>
                            <td>{l.threshold}</td>
                            <td>
                              <Pill tone={l.state === 'ok' ? 'ok' : l.state === 'bas' ? 'warn' : 'danger'}>{l.state === 'ok' ? 'Suffisant' : l.state === 'bas' ? 'Stock bas' : 'Rupture'}</Pill>
                            </td>
                            {writable && (
                              <td className="col-actions">
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => setMoving({ pf: `${l.productId}|${l.formatId}` })} aria-label={`Mouvement de stock pour ${p?.name} ${f?.label}`}>
                                  Mouvement
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                <p className="fineprint">* Stock vendable inférieur au stock total : des lots périmés restent à retirer (enregistrez une perte).</p>
              </div>
            ),
          },
          {
            id: 'lots',
            label: 'Lots & péremption',
            content: (
              <EntityManager<Lot>
                title=""
                singular="Lot"
                repo={services.lots}
                resource="stocks"
                allowCreate={false}
                dialogSize="md"
                createEmpty={() => ({ productId: '', formatId: '', lotNumber: '', receivedAt: new Date().toISOString(), storageConditions: '', notes: '' })}
                searchText={(l) => `${l.lotNumber} ${name(l.productId, l.formatId)}`}
                itemLabel={(l) => `lot ${l.lotNumber}`}
                sort={(a, b) => (a.expiryDate ?? '9999').localeCompare(b.expiryDate ?? '9999')}
                deleteBlocker={(l) => (movements.some((m) => m.lotId === l.id) ? 'Ce lot a des mouvements de stock enregistrés : il doit être conservé pour la traçabilité.' : undefined)}
                filters={[{ id: 'exp', label: 'État', options: Object.entries(EXPIRY_LABEL).map(([value, label]) => ({ value, label })), test: (l, v) => expiryState(l) === v }]}
                sections={[
                  {
                    id: 'l',
                    label: 'Lot',
                    intro: <p className="muted small">La quantité d’un lot se modifie par des mouvements de stock, pas ici.</p>,
                    fields: [
                      { name: 'lotNumber', label: 'Numéro de lot', type: 'text', required: true },
                      { name: 'supplierId', label: 'Fournisseur', type: 'select', options: suppliers.map((s) => ({ value: s.id, label: s.name })) },
                      { name: 'receivedAt', label: 'Date de réception', type: 'date', required: true },
                      { name: 'productionDate', label: 'Date de production', type: 'date', optional: true },
                      { name: 'expiryDate', label: 'Date limite', type: 'date', optional: true },
                      { name: 'storageConditions', label: 'Conditions de conservation', type: 'text', wide: true },
                      { name: 'notes', label: 'Notes', type: 'textarea' },
                    ],
                  },
                ]}
                columns={[
                  { label: 'Lot', render: (l) => <span className="mono">{l.lotNumber}</span> },
                  { label: 'Produit — format', render: (l) => name(l.productId, l.formatId) },
                  { label: 'Fournisseur', render: (l) => suppliers.find((s) => s.id === l.supplierId)?.name ?? '—' },
                  { label: 'Reçu le', render: (l) => formatDate(l.receivedAt) },
                  { label: 'Date limite', render: (l) => formatDate(l.expiryDate) },
                  { label: 'Solde', render: (l) => lotQty.get(l.id) ?? 0 },
                  { label: 'État', render: (l) => <ExpiryPill lot={l} /> },
                ]}
              />
            ),
          },
          {
            id: 'mouvements',
            label: 'Mouvements',
            content: (
              <div>
                <div className="mgr-bar">
                  <label className="inline-field">
                    <span>Type</span>
                    <select className="select select-sm" value={typeFilter} onChange={(e: { target: { value: string } }) => setTypeFilter(e.target.value)}>
                      <option value="">Tous</option>
                      {options(MOVEMENT_LABELS).map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="mgr-count">{filteredMovements.length} mouvements</span>
                </div>
                {filteredMovements.length ? (
                  <div className="table-wrap">
                    <table className="table admin-table">
                      <thead>
                        <tr>
                          <th scope="col">Date</th>
                          <th scope="col">Type</th>
                          <th scope="col">Produit — format</th>
                          <th scope="col">Lot</th>
                          <th scope="col">Quantité</th>
                          <th scope="col">Motif</th>
                          <th scope="col">Par</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMovements.slice(0, 200).map((m) => (
                          <tr key={m.id}>
                            <td className="nowrap">{formatDate(m.at, true)}</td>
                            <td>{MOVEMENT_LABELS[m.type]}</td>
                            <td>{name(m.productId, m.formatId)}</td>
                            <td className="mono small">{lots.find((l) => l.id === m.lotId)?.lotNumber ?? '—'}</td>
                            <td className={m.quantity < 0 ? 'error' : 'ok'}>
                              <strong>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</strong>
                            </td>
                            <td>{m.reason}</td>
                            <td className="small muted">{m.by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty title="Aucun mouvement." />
                )}
              </div>
            ),
          },
        ]}
      />

      <FormDialog<{ pf: string; lotNumber: string; quantity?: number; supplierId?: string; receivedAt: string; productionDate?: string; expiryDate?: string; storageConditions: string; notes: string }>
        open={receiving}
        title="Réceptionner un lot"
        sections={receiveSections}
        initial={{ pf: '', lotNumber: '', receivedAt: new Date().toISOString(), storageConditions: '', notes: '' }}
        submitLabel="Enregistrer la réception"
        onClose={() => setReceiving(false)}
        validate={(d) => {
          const e: Record<string, string> = {};
          if (d.expiryDate && d.productionDate && d.expiryDate < d.productionDate) e.expiryDate = 'La date limite doit suivre la date de production.';
          if (lots.some((l) => l.lotNumber.trim().toLowerCase() === d.lotNumber.trim().toLowerCase())) e.lotNumber = 'Ce numéro de lot existe déjà.';
          return e;
        }}
        onSubmit={async (d) => {
          const [productId, formatId] = d.pf.split('|');
          const p = products.find((x) => x.id === productId);
          await services.inventory.receiveLot(
            { productId, formatId, lotNumber: d.lotNumber.trim(), supplierId: d.supplierId, receivedAt: d.receivedAt, productionDate: d.productionDate, expiryDate: d.expiryDate, storageConditions: d.storageConditions || p?.traceability.storageConditions || '', notes: d.notes },
            Number(d.quantity),
            session?.user.email ?? 'admin',
          );
          toast(`Lot ${d.lotNumber} réceptionné`);
          setReceiving(false);
        }}
      />

      <FormDialog<{ pf: string; type: MovementType; quantity?: number; lotId?: string; reason: string }>
        open={Boolean(moving)}
        title="Enregistrer un mouvement de stock"
        sections={movementSections}
        initial={{ pf: moving?.pf ?? '', type: 'ajustement', reason: '' }}
        submitLabel="Enregistrer"
        onClose={() => setMoving(null)}
        validate={(d) => {
          const e: Record<string, string> = {};
          if (!d.quantity) e.quantity = 'La quantité doit être différente de zéro.';
          if (d.type !== 'ajustement' && d.quantity !== undefined && d.quantity < 0) e.quantity = 'Saisissez une quantité positive : le sens dépend du type.';
          const [pid, fid] = d.pf.split('|');
          const current = levels.find((l) => l.productId === pid && l.formatId === fid)?.quantity ?? 0;
          const delta = d.type === 'ajustement' ? Number(d.quantity) : ['sortie', 'perte'].includes(d.type) ? -Math.abs(Number(d.quantity)) : Math.abs(Number(d.quantity));
          if (d.pf && current + delta < 0) e.quantity = `Stock insuffisant : ${current} unité(s) disponible(s).`;
          if (d.lotId) {
            const lot = lots.find((l) => l.id === d.lotId);
            if (lot && (lot.productId !== pid || lot.formatId !== fid)) e.lotId = 'Ce lot ne correspond pas au produit et au format choisis.';
          }
          return e;
        }}
        onSubmit={async (d) => {
          const [productId, formatId] = d.pf.split('|');
          await services.inventory.recordMovement({ productId, formatId, lotId: d.lotId, type: d.type, quantity: Number(d.quantity), reason: d.reason.trim(), at: new Date().toISOString(), by: session?.user.email ?? 'admin' });
          toast('Mouvement enregistré');
          setMoving(null);
        }}
      />
    </div>
  );
}
