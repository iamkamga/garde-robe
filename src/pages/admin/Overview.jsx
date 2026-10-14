import React from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Euro, Mail, Package, ShoppingBag, Users, Wifi } from "lucide-react";
import { euros, timeAgo } from "../../lib/api.js";
import { Badge, Card, EmptyState, ErrorBanner, PageHeader, Skeleton, useAdminData } from "./ui.jsx";
import { OrderStatusBadge } from "./Orders.jsx";

// Variation sur 7 jours glissants vs les 7 jours précédents.
function Delta({ current, previous }) {
  if (!previous && !current) return <span className="text-xs text-[var(--muted)]">Pas d'activité récente</span>;
  if (!previous) return <span className="text-xs text-[var(--muted)]">Nouveau cette semaine</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={`inline-flex items-center font-medium ${up ? "text-[var(--good-text)]" : "text-[var(--critical-text)]"}`}>
        <Icon size={14} />
        {up ? "+" : ""}
        {pct} %
      </span>
      <span className="text-[var(--muted)]">vs 7 j précédents</span>
    </span>
  );
}

function Kpi({ icon: Icon, label, value, children }) {
  return (
    <div className="rounded-2xl border p-5 bg-[var(--surface)] border-[var(--line)]">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--muted)]">{label}</span>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--surface-2)] text-[var(--text-2)]">
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 text-[28px] leading-none font-semibold tracking-tight tabular-nums text-[var(--text)]">{value}</p>
      <div className="mt-2.5 min-h-[18px]">{children}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, render }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border px-3 py-2 text-xs shadow-lg bg-[var(--surface)] border-[var(--line)] text-[var(--text)]">
      {render(payload[0].payload, label)}
    </div>
  );
}

const shortDate = (d) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
const longDate = (d) => new Date(d).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const axisTick = { fill: "var(--muted)", fontSize: 11 };

function RevenueChart({ data }) {
  const total = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <Card title="Chiffre d'affaires" subtitle={`30 derniers jours · ${euros(total)}`} className="lg:col-span-2">
      <div className="h-64 -ml-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--series)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--series)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--grid)" />
            <XAxis dataKey="day" tickFormatter={shortDate} tick={axisTick} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `${v} €`} allowDecimals={false} />
            <Tooltip
              cursor={{ stroke: "var(--muted)", strokeDasharray: "3 3" }}
              content={
                <ChartTooltip
                  render={(d) => (
                    <>
                      <p className="text-[var(--muted)] capitalize">{longDate(d.day)}</p>
                      <p className="mt-1 font-semibold tabular-nums">{euros(d.revenue)}</p>
                      <p className="text-[var(--muted)]">{d.orders} commande{d.orders > 1 ? "s" : ""}</p>
                    </>
                  )}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="var(--series)"
              strokeWidth={2}
              fill="url(#revFill)"
              activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2, fill: "var(--series)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function CategoryChart({ data }) {
  return (
    <Card title="Ventes par catégorie" subtitle="Chiffre d'affaires cumulé">
      {data.length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Pas encore de ventes">Le classement apparaîtra après la première commande.</EmptyState>
      ) : (
        <div style={{ height: Math.max(160, data.length * 38) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={8}>
              <CartesianGrid horizontal={false} stroke="var(--grid)" />
              <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} €`} allowDecimals={false} />
              <YAxis type="category" dataKey="category" tick={{ ...axisTick, fill: "var(--text-2)" }} axisLine={false} tickLine={false} width={104} />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                content={
                  <ChartTooltip
                    render={(d) => (
                      <>
                        <p className="text-[var(--muted)]">{d.category}</p>
                        <p className="mt-1 font-semibold tabular-nums">{euros(d.revenue)}</p>
                        <p className="text-[var(--muted)]">{d.units} article{d.units > 1 ? "s" : ""} vendu{d.units > 1 ? "s" : ""}</p>
                      </>
                    )}
                  />
                }
              />
              <Bar dataKey="revenue" fill="var(--series)" radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

export default function Overview() {
  const { data, error } = useAdminData("/overview");

  if (!data) {
    return (
      <>
        <PageHeader title="Vue d'ensemble" description="Chargement des indicateurs…" />
        <ErrorBanner error={error} />
        <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[132px] rounded-2xl" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          <Skeleton className="h-80 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </>
    );
  }

  const { kpi, revenueByDay, byCategory, topProducts, recentOrders } = data;
  return (
    <>
      <PageHeader title="Vue d'ensemble" description="L'activité de la boutique en un coup d'œil." />
      <ErrorBanner error={error} />

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <Kpi icon={Euro} label="Chiffre d'affaires" value={euros(kpi.revenue)}>
          <Delta current={kpi.revenue_7d} previous={kpi.revenue_prev_7d} />
        </Kpi>
        <Kpi icon={Package} label="Commandes" value={kpi.orders}>
          {kpi.orders_pending > 0 ? (
            <Badge tone="warning">{kpi.orders_pending} à traiter</Badge>
          ) : (
            <Delta current={kpi.orders_7d} previous={kpi.orders_prev_7d} />
          )}
        </Kpi>
        <Kpi icon={Users} label="Clients" value={kpi.clients}>
          <Delta current={kpi.clients_7d} previous={kpi.clients_prev_7d} />
        </Kpi>
        <Kpi icon={Wifi} label="En ligne maintenant" value={kpi.online}>
          <Badge tone={kpi.online ? "good" : "neutral"} pulse={kpi.online > 0}>
            {kpi.online ? "Actifs < 5 min" : "Personne"}
          </Badge>
        </Kpi>
        <Kpi icon={Mail} label="Newsletter" value={kpi.newsletter}>
          <span className="text-xs text-[var(--muted)]">abonné{kpi.newsletter > 1 ? "s" : ""}</span>
        </Kpi>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <RevenueChart data={revenueByDay} />
        <CategoryChart data={byCategory} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card title="Meilleures ventes" subtitle="Articles les plus commandés" padded={false}>
          {topProducts.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Aucune vente pour l'instant" />
          ) : (
            <ol className="px-5 py-3">
              {topProducts.map((p, i) => (
                <li key={p.name + i} className="flex items-center gap-3 py-2.5">
                  <span className="w-5 text-xs tabular-nums text-[var(--muted)]">{i + 1}</span>
                  <img src={p.image} alt="" className="w-10 h-12 object-cover rounded-md bg-[var(--surface-2)]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate text-[var(--text)]">{p.name}</p>
                    <p className="text-xs text-[var(--muted)]">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm tabular-nums text-[var(--text)]">{euros(p.revenue)}</p>
                    <p className="text-xs text-[var(--muted)]">{p.units} vendu{p.units > 1 ? "s" : ""}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card
          title="Dernières commandes"
          action={<a href="#/admin/commandes" className="text-xs text-[var(--series)] hover:underline">Tout voir</a>}
          padded={false}
        >
          {recentOrders.length === 0 ? (
            <EmptyState icon={Package} title="Aucune commande">Elles s'afficheront ici en temps réel.</EmptyState>
          ) : (
            <ul className="px-5 py-3">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--text)]">
                      n° {o.id} · <span className="text-[var(--text-2)]">{o.customer}</span>
                    </p>
                    <p className="text-xs text-[var(--muted)]">{timeAgo(o.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={o.status} />
                    <span className="text-sm tabular-nums w-16 text-right text-[var(--text)]">{euros(o.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
