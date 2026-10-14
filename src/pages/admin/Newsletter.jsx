import React, { useState } from "react";
import { Copy, Mail } from "lucide-react";
import { dateTime } from "../../lib/api.js";
import {
  Button, Card, EmptyState, ErrorBanner, ExportButton, PageHeader, SearchInput, Skeleton, Table, Th,
  exportCsv, useAdminData, useAdminUI, useDebounced,
} from "./ui.jsx";

export default function Newsletter() {
  const { toast } = useAdminUI();
  const { data, error } = useAdminData("/newsletter");
  const [query, setQuery] = useState("");
  const q = useDebounced(query).toLowerCase();
  const rows = (data || []).filter((s) => !q || s.email.includes(q));

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(rows.map((r) => r.email).join(", "));
      toast(`${rows.length} email(s) copiés`);
    } catch {
      toast("Copie impossible dans ce navigateur", "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Newsletter"
        description={data ? `${data.length} abonné${data.length > 1 ? "s" : ""}` : "Abonnés à la newsletter"}
        actions={
          <>
            <Button onClick={copyAll} disabled={!rows.length}><Copy size={15} /> Copier les emails</Button>
            <ExportButton
              onClick={() =>
                exportCsv("newsletter", rows, [
                  { label: "Email", value: "email" },
                  { label: "Inscrit le", value: (r) => dateTime(r.created_at) },
                ])
              }
            />
          </>
        }
      />
      <ErrorBanner error={error} />
      <div className="mb-4 flex">
        <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un email" />
      </div>
      <Card padded={false}>
        {!data ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-8" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Mail} title="Aucun abonné">Les inscriptions du pied de page de la boutique s'afficheront ici.</EmptyState>
        ) : (
          <Table>
            <thead className="border-b border-[var(--line)]">
              <tr>
                <Th>Email</Th>
                <Th>Inscrit le</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.email} className="border-b last:border-0 border-[var(--line)]">
                  <td className="px-4 py-3 text-[var(--text)]">{r.email}</td>
                  <td className="px-4 py-3 text-[var(--text-2)]">{dateTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
