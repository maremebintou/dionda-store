import { useMemo, useState } from 'react';
import { services } from '../../app/services';
import { useCollection } from '../../app/hooks';
import { formatDate, formatFCFA } from '../../domain/format';
import { expiryState, quantitiesByLot, stockLevels } from '../../domain/stock';
import { Link } from '../../ui/router';
import { Icon } from '../../ui/Icon';
import { Notice } from '../../ui/common';
import { StatusPill } from './sales';

const DAY = 86_400_000;

/** Histogramme à une seule série (pas de légende : le titre la nomme). Survol + clavier = info-bulle. */
function BarChart({ data, title, valueLabel }: { data: { label: string; value: number; sub?: string }[]; title: string; valueLabel: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = 220;
  const pad = { l: 8, r: 8, t: 16, b: 28 };
  const max = Math.max(1, ...data.map((d) => d.value));
  const slot = (W - pad.l - pad.r) / data.length;
  const bw = Math.min(24, slot * 0.6);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const best = data.reduce((bi, d, i) => (d.value > data[bi].value ? i : bi), 0);
  const ticks = [0, 0.5, 1].map((t) => t * max);
  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      <div className="chart-box">
        <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" role="group" aria-label={`${title}. Maximum ${valueLabel(data[best]?.value ?? 0)} le ${data[best]?.label}.`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            </g>
          ))}
          {data.map((d, i) => {
            const x = pad.l + slot * i + (slot - bw) / 2;
            const top = y(d.value);
            const h = H - pad.b - top;
            const r = Math.min(4, h);
            return (
              <g
                key={i}
                tabIndex={0}
                role="img"
                aria-label={`${d.label} : ${valueLabel(d.value)}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="bar-g"
              >
                <rect x={pad.l + slot * i} y={pad.t} width={slot} height={H - pad.t - pad.b} fill="transparent" />
                {h > 0 && <path d={`M${x} ${H - pad.b} V${top + r} Q${x} ${top} ${x + r} ${top} H${x + bw - r} Q${x + bw} ${top} ${x + bw} ${top + r} V${H - pad.b} Z`} className={`bar ${hover === i ? 'bar-hover' : ''}`} />}
                {i === best && d.value > 0 && hover === null ? (
                  <text x={x + bw / 2} y={top - 5} textAnchor="middle" className="bar-label">
                    {valueLabel(d.value)}
                  </text>
                ) : null}
                {(data.length <= 14 || i % 2 === 0) && (
                  <text x={x + bw / 2} y={H - 9} textAnchor="middle" className="axis-label">
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="baseline" />
        </svg>
        {hover !== null && (
          <div className="tooltip" style={{ left: `${((pad.l + slot * hover + slot / 2) / W) * 100}%` }} role="status">
            <strong>{data[hover].label}</strong>
            <span>{valueLabel(data[hover].value)}</span>
            {data[hover].sub && <span className="muted">{data[hover].sub}</span>}
          </div>
        )}
      </div>
      <details className="chart-table">
        <summary>Voir les données en tableau</summary>
        <table className="table table-compact">
          <thead>
            <tr>
              <th scope="col">Jour</th>
              <th scope="col">Valeur</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <td>{d.label}</td>
                <td>
                  {valueLabel(d.value)} {d.sub && <span className="muted">({d.sub})</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function HBars({ rows, title }: { rows: { label: string; value: number }[]; title: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      <ul className="hbars">
        {rows.map((r) => (
          <li key={r.label}>
            <span className="hbar-label">{r.label}</span>
            <span className="hbar-track" aria-hidden="true">
              <span className="hbar" style={{ width: `${(r.value / max) * 100}%` }} />
            </span>
            <span className="hbar-value">{formatFCFA(r.value)}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function DashboardModule() {
  const orders = useCollection(services.orders);
  const products = useCollection(services.products);
  const categories = useCollection(services.categories);
  const movements = useCollection(services.movements);
  const lots = useCollection(services.lots);
  const customers = useCollection(services.customers);
  const [period, setPeriod] = useState(14);

  const s = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (period - 1)).getTime();
    const inPeriod = orders.filter((o) => new Date(o.createdAt).getTime() >= start);
    const valid = inPeriod.filter((o) => o.status !== 'annulee');
    const revenue = valid.reduce((a, o) => a + o.total, 0);
    const days = Array.from({ length: period }, (_, i) => {
      const d0 = start + i * DAY;
      const os = valid.filter((o) => {
        const t = new Date(o.createdAt).getTime();
        return t >= d0 && t < d0 + DAY;
      });
      return { label: new Date(d0).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), value: os.reduce((a, o) => a + o.total, 0), sub: `${os.length} commande(s)` };
    });
    const byCat = new Map<string, number>();
    const byProduct = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of valid)
      for (const l of o.lines) {
        const catName = l.kind === 'coffret' ? 'Coffrets' : categories.find((c) => c.id === products.find((p) => p.id === l.refId)?.categoryId)?.name ?? 'Autre';
        byCat.set(catName, (byCat.get(catName) ?? 0) + l.lineTotal);
        const cur = byProduct.get(l.refId) ?? { name: l.name, qty: 0, revenue: 0 };
        byProduct.set(l.refId, { ...cur, qty: cur.qty + l.quantity, revenue: cur.revenue + l.lineTotal });
      }
    return {
      revenue,
      count: valid.length,
      cancelled: inPeriod.length - valid.length,
      avg: valid.length ? Math.round(revenue / valid.length) : 0,
      days,
      byCat: [...byCat.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
      top: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
    };
  }, [orders, products, categories, period]);

  const levels = stockLevels(products, movements);
  const low = levels.filter((l) => l.state !== 'ok');
  const lotQty = quantitiesByLot(movements);
  const expiring = lots.filter((l) => (lotQty.get(l.id) ?? 0) > 0 && expiryState(l) !== 'ok' && expiryState(l) !== 'sans_date');
  const toProcess = orders.filter((o) => o.status === 'en_attente' || o.status === 'confirmee').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const unverified = products.filter((p) => p.origin.status !== 'verifie' || p.virtues.status !== 'verifie').length;

  return (
    <div>
      <div className="mgr-head">
        <div>
          <h1 className="admin-title">Tableau de bord</h1>
          <p className="admin-lead">Statistiques calculées sur les commandes de démonstration enregistrées dans ce navigateur.</p>
        </div>
        <div className="seg" role="group" aria-label="Période">
          {[7, 14, 30].map((p) => (
            <button key={p} type="button" className={period === p ? 'active' : ''} aria-pressed={period === p} onClick={() => setPeriod(p)}>
              {p} jours
            </button>
          ))}
        </div>
      </div>
      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">Chiffre d’affaires</span>
          <span className="kpi-value">{formatFCFA(s.revenue)}</span>
          <span className="kpi-sub">hors commandes annulées</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Commandes</span>
          <span className="kpi-value">{s.count}</span>
          <span className="kpi-sub">{s.cancelled} annulée(s)</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Panier moyen</span>
          <span className="kpi-value">{formatFCFA(s.avg)}</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Clients</span>
          <span className="kpi-value">{customers.length}</span>
        </div>
      </div>
      <div className="dash-grid">
        <section className="card card-wide">
          <BarChart title={`Chiffre d’affaires par jour (FCFA), ${period} derniers jours`} data={s.days} valueLabel={formatFCFA} />
        </section>
        <section className="card">
          <HBars title="Ventes par catégorie" rows={s.byCat} />
        </section>
        <section className="card">
          <h2 className="card-title">Meilleures ventes</h2>
          {s.top.length ? (
            <table className="table table-compact">
              <thead>
                <tr>
                  <th scope="col">Article</th>
                  <th scope="col">Qté</th>
                  <th scope="col">CA</th>
                </tr>
              </thead>
              <tbody>
                {s.top.map((t) => (
                  <tr key={t.name}>
                    <td>{t.name}</td>
                    <td>{t.qty}</td>
                    <td>{formatFCFA(t.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Aucune vente sur la période.</p>
          )}
        </section>
        <section className="card">
          <h2 className="card-title">
            Commandes à traiter <span className="count-badge">{toProcess.length}</span>
          </h2>
          <ul className="mini-list">
            {toProcess.slice(0, 5).map((o) => (
              <li key={o.id}>
                <span className="mono">{o.number}</span> <span className="muted small">{formatDate(o.createdAt)}</span>
                <StatusPill s={o.status} />
              </li>
            ))}
          </ul>
          <Link to="/admin/commandes" className="link-more">
            Toutes les commandes <Icon name="chevron" size={15} />
          </Link>
        </section>
        <section className="card">
          <h2 className="card-title">Alertes</h2>
          {low.length === 0 && expiring.length === 0 ? (
            <Notice tone="ok">Aucune alerte de stock ou de péremption.</Notice>
          ) : (
            <>
              {low.length > 0 && <Notice tone="danger">{low.length} format(s) en stock bas ou en rupture.</Notice>}
              {expiring.length > 0 && <Notice tone="warn">{expiring.length} lot(s) périmé(s) ou proche(s) de la date limite.</Notice>}
            </>
          )}
          <Notice tone="info">
            {unverified} fiche(s) produit dont l’origine ou les vertus ne sont pas encore vérifiées. <Link to="/admin/contenus">Voir les contenus</Link>
          </Notice>
          <Link to="/admin/stocks" className="link-more">
            Gérer les stocks <Icon name="chevron" size={15} />
          </Link>
        </section>
      </div>
    </div>
  );
}
