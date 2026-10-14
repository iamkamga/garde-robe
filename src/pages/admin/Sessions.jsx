import React, { useState } from "react";
import { Laptop, LogOut, Smartphone, Wifi } from "lucide-react";
import { dateTime, timeAgo } from "../../lib/api.js";
import {
  Avatar, Badge, Card, EmptyState, ErrorBanner, IconButton, PageHeader, Segmented, Skeleton,
  describeDevice, useAdminAction, useAdminData, useAdminUI,
} from "./ui.jsx";

export default function Sessions() {
  const { confirm } = useAdminUI();
  const { data, error, reload } = useAdminData("/sessions");
  const run = useAdminAction(reload);
  const [filter, setFilter] = useState("online");

  const rows = (data || []).filter((s) => filter === "all" || s.online);
  const onlineCount = data?.filter((s) => s.online).length ?? 0;

  async function revoke(s) {
    const ok = await confirm({
      title: `Fermer cette session de ${s.name} ?`,
      message: `${describeDevice(s.user_agent).label} — la personne devra se reconnecter sur cet appareil.`,
      confirmLabel: "Fermer la session",
    });
    if (ok) run(`/sessions/${s.id}`, { method: "DELETE" }, "Session fermée");
  }

  return (
    <>
      <PageHeader
        title="Personnes connectées"
        description="Qui est sur la boutique en ce moment, depuis quel appareil. Mise à jour automatique."
      />
      <ErrorBanner error={error} />
      <div className="mb-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "online", label: "En ligne", count: onlineCount },
            { value: "all", label: "Toutes les sessions", count: data?.length },
          ]}
        />
      </div>

      <Card padded={false}>
        {!data ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={Wifi} title={filter === "online" ? "Personne en ligne" : "Aucune session ouverte"}>
            Un utilisateur est « en ligne » s'il a été actif dans les 5 dernières minutes.
          </EmptyState>
        ) : (
          <ul>
            {rows.map((s) => {
              const device = describeDevice(s.user_agent);
              const DeviceIcon = device.mobile ? Smartphone : Laptop;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 border-b last:border-0 border-[var(--line)]">
                  <div className="flex items-center gap-3 min-w-[220px] flex-1">
                    <Avatar name={s.name} size={36} />
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--text)]">
                        {s.name}
                        {s.role === "admin" && <span className="ml-2"><Badge tone="info">Admin</Badge></span>}
                      </p>
                      <p className="text-xs text-[var(--muted)]">{s.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm min-w-[170px] text-[var(--text-2)]">
                    <DeviceIcon size={16} className="text-[var(--muted)]" />
                    <span>{device.label}</span>
                  </div>
                  <div className="text-xs min-w-[150px] text-[var(--muted)]">
                    <p>Connecté le {dateTime(s.created_at)}</p>
                    <p>Activité : {timeAgo(s.last_seen_at)}{s.ip ? ` · ${s.ip}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    {s.online ? <Badge tone="good" pulse>En ligne</Badge> : <Badge tone="neutral">Inactif</Badge>}
                    {s.current ? (
                      <span className="text-xs px-2 text-[var(--muted)]">Cette session</span>
                    ) : (
                      <IconButton label="Fermer la session" onClick={() => revoke(s)}>
                        <LogOut size={16} />
                      </IconButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
