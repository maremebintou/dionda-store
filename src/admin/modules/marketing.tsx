import { useState } from 'react';
import { services } from '../../app/services';
import { useCollection } from '../../app/hooks';
import type { Bundle, Promotion } from '../../types';
import { EntityManager, Pill } from '../crud';
import { PROMO_TYPE_LABELS, options } from '../labels';
import { formatDate, formatFCFA, slugify } from '../../domain/format';
import { checkPromotion } from '../../domain/pricing';
import { Tabs } from '../../ui/Tabs';
import { ProductVisual } from '../../ui/ProductVisual';

export function MarketingModule() {
  const [tab, setTab] = useState('promos');
  const products = useCollection(services.products);
  const orders = useCollection(services.orders);
  const productOpts = products.filter((p) => p.status !== 'archive').map((p) => ({ id: p.id, name: p.name, formats: p.formats.map((f) => ({ id: f.id, label: `${f.label} (${formatFCFA(f.price)})` })) }));
  const worth = (b: Bundle) => b.items.reduce((s, it) => s + (products.find((p) => p.id === it.productId)?.formats.find((f) => f.id === it.formatId)?.price ?? 0) * it.quantity, 0);

  return (
    <div>
      <h1 className="admin-title">Promotions & coffrets</h1>
      <p className="admin-lead">Codes de réduction et assortiments proposés dans la boutique.</p>
      <Tabs
        label="Promotions et coffrets"
        active={tab}
        onChange={setTab}
        tabs={[
          {
            id: 'promos',
            label: 'Codes promo',
            content: (
              <EntityManager<Promotion>
                title=""
                singular="Code promo"
                repo={services.promotions}
                resource="promotions"
                dialogSize="md"
                createEmpty={() => ({ code: '', label: '', type: 'pourcentage', value: 10, usageCount: 0, active: true })}
                searchText={(p) => `${p.code} ${p.label}`}
                itemLabel={(p) => p.code || 'Nouveau code'}
                beforeSave={(p) => ({ ...p, code: p.code.trim().toUpperCase().replace(/\s+/g, '') })}
                validate={(p, all) => {
                  const e: Record<string, string> = {};
                  if (all.some((x) => x.id !== p.id && x.code === p.code)) e.code = 'Ce code existe déjà.';
                  if (p.type === 'pourcentage' && (p.value <= 0 || p.value > 100)) e.value = 'Un pourcentage doit être compris entre 1 et 100.';
                  if (p.type === 'montant_fixe' && p.value <= 0) e.value = 'Le montant doit être positif.';
                  if (p.startsAt && p.endsAt && p.endsAt < p.startsAt) e.endsAt = 'La date de fin doit suivre la date de début.';
                  return e;
                }}
                deleteBlocker={(p) => (orders.some((o) => o.promotionCode === p.code) ? 'Ce code a été utilisé dans des commandes : désactivez-le plutôt.' : undefined)}
                sections={[
                  {
                    id: 'p',
                    label: 'Promotion',
                    fields: [
                      { name: 'code', label: 'Code', type: 'text', required: true, help: 'Converti en majuscules, sans espace.' },
                      { name: 'label', label: 'Libellé affiché', type: 'text', required: true },
                      { name: 'type', label: 'Type', type: 'select', required: true, options: options(PROMO_TYPE_LABELS) },
                      { name: 'value', label: 'Valeur (% ou FCFA)', type: 'number', required: true, help: 'Ignorée pour « Livraison offerte ».' },
                      { name: 'minSubtotal', label: 'Minimum d’achat', type: 'money', optional: true },
                      { name: 'usageLimit', label: 'Nombre maximal d’utilisations', type: 'number', optional: true },
                      { name: 'startsAt', label: 'Début', type: 'date', optional: true },
                      { name: 'endsAt', label: 'Fin', type: 'date', optional: true },
                      { name: 'active', label: 'Code actif', type: 'checkbox' },
                    ],
                  },
                ]}
                columns={[
                  { label: 'Code', render: (p) => <span className="mono strong">{p.code}</span> },
                  { label: 'Avantage', render: (p) => (p.type === 'pourcentage' ? `−${p.value} %` : p.type === 'montant_fixe' ? `−${formatFCFA(p.value)}` : 'Livraison offerte') },
                  { label: 'Minimum', render: (p) => (p.minSubtotal ? formatFCFA(p.minSubtotal) : '—') },
                  { label: 'Période', render: (p) => (p.startsAt || p.endsAt ? `${formatDate(p.startsAt)} → ${formatDate(p.endsAt)}` : 'Permanente') },
                  { label: 'Utilisations', render: (p) => `${p.usageCount}${p.usageLimit ? ` / ${p.usageLimit}` : ''}` },
                  {
                    label: 'État',
                    render: (p) => {
                      const err = checkPromotion(p, Number.MAX_SAFE_INTEGER);
                      return err ? <Pill tone="neutral">{p.active ? 'Inutilisable' : 'Inactive'}</Pill> : <Pill tone="ok">Utilisable</Pill>;
                    },
                  },
                ]}
              />
            ),
          },
          {
            id: 'coffrets',
            label: 'Coffrets',
            content: (
              <EntityManager<Bundle>
                title=""
                singular="Coffret"
                repo={services.bundles}
                resource="promotions"
                createEmpty={() => ({ name: '', slug: '', description: '', items: [], price: 0, active: false, visual: { hue: 30, motif: 'coffret' } })}
                searchText={(b) => b.name}
                itemLabel={(b) => b.name || 'Nouveau coffret'}
                beforeSave={(b) => ({ ...b, slug: slugify(b.slug || b.name) })}
                validate={(b) => {
                  const e: Record<string, string> = {};
                  if (!b.items.length) e.items = 'Ajoutez au moins un produit.';
                  if (!(b.price > 0)) e.price = 'Le prix doit être supérieur à 0.';
                  return e;
                }}
                sections={[
                  {
                    id: 'b',
                    label: 'Coffret',
                    fields: [
                      { name: 'name', label: 'Nom du coffret', type: 'text', required: true },
                      { name: 'price', label: 'Prix du coffret', type: 'money', required: true },
                      { name: 'description', label: 'Description', type: 'textarea' },
                      { name: 'items', label: 'Composition', type: 'bundleItems', products: productOpts },
                      { name: 'visual.photo', label: 'Photo du coffret', type: 'photo', help: 'Nom du fichier dans photos/ ou adresse https://.' },
                      { name: 'visual.hue', label: 'Teinte de l’illustration (0–360)', type: 'number' },
                      { name: 'active', label: 'Proposé dans la boutique', type: 'checkbox' },
                    ],
                  },
                ]}
                columns={[
                  { label: '', className: 'col-thumb', render: (b) => <ProductVisual visual={b.visual} className="thumb" /> },
                  { label: 'Coffret', render: (b) => <strong>{b.name}</strong> },
                  { label: 'Produits', render: (b) => b.items.reduce((s, i) => s + i.quantity, 0) },
                  { label: 'Prix', render: (b) => formatFCFA(b.price) },
                  { label: 'Valeur séparée', render: (b) => <span className="muted">{formatFCFA(worth(b))}</span> },
                  { label: 'État', render: (b) => (b.active ? <Pill tone="ok">En vente</Pill> : <Pill>Masqué</Pill>) },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
