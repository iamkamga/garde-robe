import React, { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
import { dateTime, euros } from "../../lib/api.js";
import {
  Badge, Card, EmptyState, ErrorBanner, ExportButton, PageHeader, SearchInput, Segmented, Skeleton, Table, Th,
  exportCsv, useAdminAction, useAdminData, useDebounced, useSort,
} from "./ui.jsx";

export const STATUSES = [
  { value: "nouvelle", label: "Nouvelle", tone: "warning" },
  { value: "préparée", label: "Préparée", tone: "info" },
  { value: "expédiée", label: "Expédiée", tone: "info" },
  { value: "livrée", label: "Livrée", tone: "good" },
  { value: "annulée", label: "Annulée", tone: "critical" },
];

export function OrderStatusBadge({ status }) {
  const s = STATUSES.find((x) => x.value === status) || { label: status, tone: "neutral" };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export default function Orders() {
  const { data, error, reload } = useAdminData("/orders");
  const run = useAdminAction(reload);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(() => new Set());
  const q = useDebounced(query).toLowerCase();
  const sorter = useSort("created_at");

  const rows = useMemo(() => {
    if (!data) return [];
    return sorter.apply(
      data.filter(
        (o) =>
          (status === "all" || o.status === status) &&
          (!q || String(o.id) === q.replace("#", "") || (o.email || "").includes(q) || (o.name || "").toLowerCase().includes(q))
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, status, q, sorter.sort]);

  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <>
      <PageHeader
        title="Commandes"
        description="Suivez et faites avancer chaque commande."
        actions={
          <ExportButton
            onClick={() =>
              exportCsv("commandes", rows, [
                { label: "N°", value: "id" },
                { label: "Date", value: (o) => dateTime(o.created_at) },
                { label: "Client", value: (o) => o.name || "Invité" },
                { label: "Email", value: "email" },
                { label: "Articles", value: (o) => o.items.map((i) => `${i.qty}× ${i.name}`).join(", ") },
                { label: "Total (€)", value: "total" },
                { label: "Statut", value: "status" },
              ])
            }
          />
        }
      />
      <ErrorBanner error={error} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="N° de commande, client ou email" />
        <div className="max-w-full overflow-x-auto">
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "Toutes", count: data?.length },
              ...STATUSES.map((s) => ({ value: s.value, label: s.label, count: data?.filter((o) => o.status === s.value).length })),
            ]}
          />
        </div>
      </div>

      <Card padded={false}>
        {!data ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Package} title="Aucune commande">
            {data.length ? "Aucune commande ne correspond aux filtres." : "Les commandes passées sur la boutique apparaîtront ici."}
          </EmptyState>
        ) : (
          <Table>
            <thead className="border-b border-[var(--line)]">
              <tr>
                <Th sortKey="id" sorter={sorter}>N°</Th>
                <Th sortKey="created_at" sorter={sorter}>Date</Th>
                <Th>Client</Th>
                <Th sortKey="total" sorter={sorter} align="right">Total</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <Fragment key={o.id}>
                  <tr className="border-b border-[var(--line)] hover:bg-[var(--row-hover)]">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggle(o.id)}
                        aria-expanded={open.has(o.id)}
                        className="inline-flex items-center gap-1 font-medium text-[var(--text)]"
                      >
                        {open.has(o.id) ? <ChevronDown size={15} /> : <ChevronRight size={15} />} #{o.id}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--text-2)]">{dateTime(o.created_at)}</td>
                    <td className="px-4 py-3">
                      <p className="text-[var(--text)]">{o.name || "Invité"}</p>
                      <p className="text-xs text-[var(--muted)]">{o.email || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--text)]">{euros(o.total)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <OrderStatusBadge status={o.status} />
                        <select
                          value={o.status}
                          aria-label={`Changer le statut de la commande ${o.id}`}
                          onChange={(e) =>
                            run(`/orders/${o.id}`, { method: "PATCH", body: { status: e.target.value } }, `Commande #${o.id} : ${e.target.value}`)
                          }
                          className="h-8 rounded-lg border px-2 text-xs bg-[var(--surface)] border-[var(--line)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--series)]"
                        >
                          {STATUSES.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                  {open.has(o.id) && (
                    <tr className="border-b border-[var(--line)] bg-[var(--row-hover)]">
                      <td colSpan={5} className="px-4 py-3">
                        <ul className="space-y-1.5 pl-6">
                          {o.items.map((i, idx) => (
                            <li key={idx} className="flex justify-between max-w-md text-[var(--text-2)]">
                              <span>{i.qty} × {i.name}</span>
                              <span className="tabular-nums">{euros(i.qty * i.price)}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
