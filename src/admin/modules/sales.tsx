import { useMemo, useState } from 'react';
import { services } from '../../app/services';
import { useCollection, useSession } from '../../app/hooks';
import type { Customer, DeliveryStatus, DeliveryZone, Order, OrderStatus } from '../../types';
import { EntityManager, Pill } from '../crud';
import { DELIVERY_STATUS_LABELS, ORDER_FLOW, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, options } from '../labels';
import { formatDate, formatFCFA } from '../../domain/format';
import { can } from '../../domain/permissions';
import { Dialog } from '../../ui/Dialog';
import { Icon } from '../../ui/Icon';
import { Empty, Notice, useToast } from '../../ui/common';
import { ServiceError } from '../../services/contracts';
import { Tabs } from '../../ui/Tabs';

const STATUS_TONE: Record<OrderStatus, 'neutral' | 'info' | 'warn' | 'ok' | 'danger' | 'accent'> = {
  en_attente: 'warn',
  confirmee: 'info',
  en_preparation: 'accent',
  expediee: 'info',
  livree: 'ok',
  annulee: 'danger',
};
export const StatusPill = ({ s }: { s: OrderStatus }) => <Pill tone={STATUS_TONE[s]}>{ORDER_STATUS_LABELS[s]}</Pill>;

function OrderDetail({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const lots = useCollection(services.lots);
  const zones = useCollection(services.zones);
  const session = useSession();
  const toast = useToast();
  const [err, setErr] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const writeOrders = Boolean(session && can(session.role, 'commandes', 'ecrire'));
  const writeDelivery = Boolean(session && can(session.role, 'livraisons', 'ecrire'));
  if (!order) return <Dialog open={false} onClose={onClose} title="" />;
  const idx = ORDER_FLOW.indexOf(order.status);
  const next = idx >= 0 && idx < ORDER_FLOW.length - 1 ? ORDER_FLOW[idx + 1] : undefined;
  const zone = zones.find((z) => z.id === order.delivery.zoneId);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setErr('');
    try {
      await fn();
      toast(msg);
    } catch (e) {
      setErr(e instanceof ServiceError ? e.message : 'Action impossible.');
    }
  };

  return (
    <Dialog open onClose={onClose} title={`Commande ${order.number}`} subtitle={`Passée le ${formatDate(order.createdAt, true)} · commande de démonstration`} size="xl"
      footer={
        <div className="form-actions">
          {err && <p className="error" role="alert">{err}</p>}
          {writeOrders && order.status !== 'annulee' && order.status !== 'livree' && (
            <button type="button" className="btn btn-danger" onClick={() => setConfirmCancel(true)}>
              Annuler la commande
            </button>
          )}
          {writeOrders && next && (
            <button type="button" className="btn btn-primary" onClick={() => act(() => services.orderService.updateStatus(order.id, next), `Commande ${ORDER_STATUS_LABELS[next].toLowerCase()}`)}>
              Passer à « {ORDER_STATUS_LABELS[next]} »
            </button>
          )}
        </div>
      }
    >
      {confirmCancel && (
        <Notice tone="danger" title="Confirmer l’annulation ?">
          Les quantités seront remises en stock dans leurs lots d’origine.{' '}
          <button type="button" className="btn btn-danger btn-sm" onClick={() => { setConfirmCancel(false); act(() => services.orderService.updateStatus(order.id, 'annulee', 'Annulée depuis l’administration.'), 'Commande annulée, stock réintégré'); }}>
            Oui, annuler
          </button>{' '}
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setConfirmCancel(false)}>
            Non
          </button>
        </Notice>
      )}
      <div className="order-grid">
        <section className="order-box">
          <h3>Statut</h3>
          <StatusPill s={order.status} />
          <ol className="steps" aria-label="Progression de la commande">
            {ORDER_FLOW.map((s, i) => (
              <li key={s} className={order.status === 'annulee' ? '' : i <= idx ? 'done' : ''}>
                {ORDER_STATUS_LABELS[s]}
              </li>
            ))}
          </ol>
          <p className="small">
            Paiement : {PAYMENT_METHOD_LABELS[order.paymentMethod]} — <strong>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</strong>
          </p>
        </section>
        <section className="order-box">
          <h3>Client</h3>
          <p>
            <strong>{order.customerName}</strong>
            <br />
            {order.customerPhone}
          </p>
          <p className="small">
            {order.delivery.address}, {order.delivery.city}
          </p>
          {order.note && <p className="small">Note : {order.note}</p>}
        </section>
        <section className="order-box">
          <h3>Livraison</h3>
          <p className="small">
            {zone?.name ?? 'Zone supprimée'} · {zone?.estimatedDelay}
          </p>
          <div className="form-grid form-grid-tight">
            <label className="field">
              <span className="label">Statut de livraison</span>
              <select className="select select-sm" disabled={!writeDelivery || order.status === 'annulee'} value={order.delivery.status} onChange={(e: { target: { value: string } }) => act(() => services.orderService.updateDelivery(order.id, { status: e.target.value as DeliveryStatus }), 'Livraison mise à jour')}>
                {options(DELIVERY_STATUS_LABELS).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="label">Date prévue</span>
              <input className="input" type="date" disabled={!writeDelivery || order.status === 'annulee'} value={order.delivery.scheduledFor?.slice(0, 10) ?? ''} onChange={(e: { target: { value: string } }) => act(() => services.orderService.updateDelivery(order.id, { scheduledFor: e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : '' }), 'Date de livraison enregistrée')} />
            </label>
            <label className="field field-wide">
              <span className="label">Livreur</span>
              <input
                className="input"
                disabled={!writeDelivery || order.status === 'annulee'}
                defaultValue={order.delivery.courier}
                placeholder="Nom du livreur"
                onBlur={(e: { target: { value: string } }) => e.target.value !== order.delivery.courier && act(() => services.orderService.updateDelivery(order.id, { courier: e.target.value }), 'Livreur enregistré')}
              />
            </label>
          </div>
        </section>
      </div>
      <h3 className="sub-title">Articles et lots prélevés</h3>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th scope="col">Article</th>
              <th scope="col">Qté</th>
              <th scope="col">Prix unitaire</th>
              <th scope="col">Total</th>
              <th scope="col">Lots (traçabilité)</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <strong>{l.name}</strong> <span className="muted">— {l.formatLabel}</span>
                </td>
                <td>{l.quantity}</td>
                <td>{formatFCFA(l.unitPrice)}</td>
                <td>{formatFCFA(l.lineTotal)}</td>
                <td className="small">
                  {l.allocations.map((a, j) => (
                    <span key={j} className="mono lot-chip">
                      {lots.find((x) => x.id === a.lotId)?.lotNumber ?? 'hors lot'} ×{a.quantity}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="sums sums-right">
        <div className="sum-row">
          <dt>Sous-total</dt>
          <dd>{formatFCFA(order.subtotal)}</dd>
        </div>
        {order.discount > 0 && (
          <div className="sum-row">
            <dt>Remise {order.promotionCode}</dt>
            <dd>− {formatFCFA(order.discount)}</dd>
          </div>
        )}
        <div className="sum-row">
          <dt>Livraison</dt>
          <dd>{order.deliveryFee ? formatFCFA(order.deliveryFee) : 'Offerte'}</dd>
        </div>
        <div className="sum-row sum-strong">
          <dt>Total</dt>
          <dd>{formatFCFA(order.total)}</dd>
        </div>
      </dl>
      <h3 className="sub-title">Historique</h3>
      <ul className="history">
        {[...order.history].reverse().map((h, i) => (
          <li key={i}>
            <span className="muted small nowrap">{formatDate(h.at, true)}</span> <StatusPill s={h.status} /> {h.note}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

export function OrdersModule() {
  const orders = useCollection(services.orders);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useMemo(
    () =>
      [...orders]
        .filter((o) => (!status || o.status === status) && (!search || `${o.number} ${o.customerName} ${o.customerPhone}`.toLowerCase().includes(search.toLowerCase())))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [orders, status, search],
  );
  const open = orders.find((o) => o.id === openId) ?? null;
  return (
    <div>
      <h1 className="admin-title">Commandes</h1>
      <p className="admin-lead">Commandes de démonstration passées depuis la boutique. Le passage d’un statut à l’autre met à jour le stock et la livraison.</p>
      <div className="status-chips" role="group" aria-label="Filtrer par statut">
        <button type="button" className={`filter-chip ${!status ? 'active' : ''}`} aria-pressed={!status} onClick={() => setStatus('')}>
          Toutes <span>{orders.length}</span>
        </button>
        {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
          <button key={s} type="button" className={`filter-chip ${status === s ? 'active' : ''}`} aria-pressed={status === s} onClick={() => setStatus(s)}>
            {ORDER_STATUS_LABELS[s]} <span>{orders.filter((o) => o.status === s).length}</span>
          </button>
        ))}
      </div>
      <div className="mgr-bar">
        <label className="search-field">
          <Icon name="search" size={17} />
          <span className="sr-only">Rechercher une commande</span>
          <input type="search" placeholder="N°, client, téléphone…" value={search} onChange={(e: { target: { value: string } }) => setSearch(e.target.value)} />
        </label>
        <span className="mgr-count">{list.length} commande(s)</span>
      </div>
      {list.length ? (
        <div className="table-wrap">
          <table className="table admin-table">
            <thead>
              <tr>
                <th scope="col">N°</th>
                <th scope="col">Date</th>
                <th scope="col">Client</th>
                <th scope="col">Articles</th>
                <th scope="col">Total</th>
                <th scope="col">Statut</th>
                <th scope="col">Livraison</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id}>
                  <td className="mono">{o.number}</td>
                  <td className="nowrap">{formatDate(o.createdAt, true)}</td>
                  <td>
                    {o.customerName}
                    <div className="muted small">{o.delivery.city}</div>
                  </td>
                  <td>{o.lines.reduce((s, l) => s + l.quantity, 0)}</td>
                  <td>
                    <strong>{formatFCFA(o.total)}</strong>
                  </td>
                  <td>
                    <StatusPill s={o.status} />
                  </td>
                  <td className="small">{DELIVERY_STATUS_LABELS[o.delivery.status]}</td>
                  <td className="col-actions">
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpenId(o.id)} aria-label={`Ouvrir la commande ${o.number}`}>
                      Détail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Aucune commande pour ces critères." />
      )}
      <OrderDetail order={open} onClose={() => setOpenId(null)} />
    </div>
  );
}

export function CustomersModule() {
  const orders = useCollection(services.orders);
  const zones = useCollection(services.zones);
  const stats = (c: Customer) => {
    const os = orders.filter((o) => o.customerId === c.id && o.status !== 'annulee');
    return { n: os.length, total: os.reduce((s, o) => s + o.total, 0), last: os.map((o) => o.createdAt).sort().pop() };
  };
  return (
    <EntityManager<Customer>
      title="Clients"
      singular="Client"
      description="Clients créés lors des commandes (identifiés par leur numéro de téléphone). Données fictives dans cette démonstration."
      repo={services.customers}
      resource="clients"
      createEmpty={() => ({ firstName: '', lastName: '', phone: '', email: '', address: '', city: '', notes: '' })}
      searchText={(c) => `${c.firstName} ${c.lastName} ${c.phone} ${c.city}`}
      itemLabel={(c) => `${c.firstName} ${c.lastName}`.trim() || 'Nouveau client'}
      sort={(a, b) => stats(b).total - stats(a).total}
      validate={(c, all) => (all.some((x) => x.id !== c.id && x.phone.replace(/\D/g, '') === c.phone.replace(/\D/g, '')) ? { phone: 'Un client utilise déjà ce numéro.' } : ({} as Record<string, string>))}
      deleteBlocker={(c) => (orders.some((o) => o.customerId === c.id) ? 'Ce client a des commandes : il doit être conservé (historique et facturation).' : undefined)}
      sections={[
        {
          id: 'c',
          label: 'Client',
          fields: [
            { name: 'firstName', label: 'Prénom', type: 'text', required: true },
            { name: 'lastName', label: 'Nom', type: 'text', required: true },
            { name: 'phone', label: 'Téléphone', type: 'text', required: true },
            { name: 'email', label: 'E-mail', type: 'email', optional: true },
            { name: 'address', label: 'Adresse', type: 'text', wide: true },
            { name: 'city', label: 'Ville / quartier', type: 'text' },
            { name: 'zoneId', label: 'Zone de livraison habituelle', type: 'select', options: zones.map((z) => ({ value: z.id, label: z.name })) },
            { name: 'notes', label: 'Notes internes', type: 'textarea' },
          ],
        },
      ]}
      columns={[
        { label: 'Client', render: (c) => <strong>{c.firstName} {c.lastName}</strong> },
        { label: 'Téléphone', render: (c) => c.phone },
        { label: 'Ville', render: (c) => c.city },
        { label: 'Commandes', render: (c) => stats(c).n },
        { label: 'Montant cumulé', render: (c) => formatFCFA(stats(c).total) },
        { label: 'Dernière commande', render: (c) => formatDate(stats(c).last) },
      ]}
    />
  );
}

export function DeliveryModule() {
  const orders = useCollection(services.orders);
  const zones = useCollection(services.zones);
  const [tab, setTab] = useState('suivi');
  const [openId, setOpenId] = useState<string | null>(null);
  const active = orders.filter((o) => o.status !== 'annulee' && o.delivery.status !== 'livree').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <div>
      <h1 className="admin-title">Livraisons & zones desservies</h1>
      <p className="admin-lead">Suivi des livraisons en cours et configuration des zones, frais et délais.</p>
      <Tabs
        label="Livraisons"
        active={tab}
        onChange={setTab}
        tabs={[
          {
            id: 'suivi',
            label: `Livraisons à traiter (${active.length})`,
            content: active.length ? (
              <div className="table-wrap">
                <table className="table admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Commande</th>
                      <th scope="col">Client</th>
                      <th scope="col">Zone</th>
                      <th scope="col">Statut commande</th>
                      <th scope="col">Livraison</th>
                      <th scope="col">Prévue le</th>
                      <th scope="col">Livreur</th>
                      <th scope="col">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.map((o) => (
                      <tr key={o.id}>
                        <td className="mono">{o.number}</td>
                        <td>
                          {o.customerName}
                          <div className="small muted">{o.delivery.address}, {o.delivery.city}</div>
                        </td>
                        <td>{zones.find((z) => z.id === o.delivery.zoneId)?.name ?? '—'}</td>
                        <td>
                          <StatusPill s={o.status} />
                        </td>
                        <td>{DELIVERY_STATUS_LABELS[o.delivery.status]}</td>
                        <td>{formatDate(o.delivery.scheduledFor)}</td>
                        <td>{o.delivery.courier || '—'}</td>
                        <td className="col-actions">
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpenId(o.id)}>
                            Gérer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="Aucune livraison en attente." />
            ),
          },
          {
            id: 'zones',
            label: 'Zones desservies',
            content: (
              <EntityManager<DeliveryZone>
                title=""
                singular="Zone de livraison"
                repo={services.zones}
                resource="livraisons"
                dialogSize="md"
                createEmpty={() => ({ name: '', cities: [], fee: 0, estimatedDelay: '', active: true })}
                searchText={(z) => `${z.name} ${z.cities.join(' ')}`}
                itemLabel={(z) => z.name || 'Nouvelle zone'}
                sort={(a, b) => a.fee - b.fee}
                deleteBlocker={(z) => (orders.some((o) => o.delivery.zoneId === z.id) ? 'Des commandes utilisent cette zone : désactivez-la plutôt.' : undefined)}
                sections={[
                  {
                    id: 'z',
                    label: 'Zone',
                    fields: [
                      { name: 'name', label: 'Nom de la zone', type: 'text', required: true },
                      { name: 'estimatedDelay', label: 'Délai indicatif', type: 'text', required: true, placeholder: '24 à 48 h' },
                      { name: 'fee', label: 'Frais de livraison', type: 'money', required: true },
                      { name: 'freeAbove', label: 'Livraison offerte à partir de', type: 'money', optional: true },
                      { name: 'cities', label: 'Villes et quartiers desservis', type: 'list', placeholder: 'Une localité par ligne' },
                      { name: 'active', label: 'Zone active (proposée au client)', type: 'checkbox' },
                    ],
                  },
                ]}
                columns={[
                  { label: 'Zone', render: (z) => <strong>{z.name}</strong> },
                  { label: 'Localités', render: (z) => <span className="small">{z.cities.join(', ') || '—'}</span> },
                  { label: 'Frais', render: (z) => formatFCFA(z.fee) },
                  { label: 'Offerte dès', render: (z) => (z.freeAbove ? formatFCFA(z.freeAbove) : '—') },
                  { label: 'Délai', render: (z) => z.estimatedDelay },
                  { label: 'État', render: (z) => (z.active ? <Pill tone="ok">Active</Pill> : <Pill>Inactive</Pill>) },
                ]}
              />
            ),
          },
        ]}
      />
      <OrderDetail order={orders.find((o) => o.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </div>
  );
}
