import React, { useState } from "react";
import {
  Activity as ActivityIcon, Ban, KeyRound, LogIn, LogOut, ShieldAlert, ShieldCheck, ShoppingBag, Trash2, UserPlus,
} from "lucide-react";
import { dateTime, euros, timeAgo } from "../../lib/api.js";
import { Card, EmptyState, ErrorBanner, PageHeader, SearchInput, Skeleton, useAdminData, useDebounced } from "./ui.jsx";

const ICONS = {
  inscription: UserPlus,
  connexion: LogIn,
  déconnexion: LogOut,
  "échec de connexion": ShieldAlert,
  "mot de passe modifié": KeyRound,
  commande: ShoppingBag,
  "compte désactivé": Ban,
  "compte supprimé": Trash2,
  "rôle modifié": ShieldCheck,
};

function describe(a) {
  const d = a.details || {};
  if (a.action === "commande") return `Commande #${d.commande} · ${euros(d.total)}`;
  if (a.action === "statut de commande") return `Commande #${d.commande} → ${d.status}`;
  if (a.action === "rôle modifié") return `${d.cible} → ${d.role}`;
  if (d.cible) return d.cible;
  return null;
}

export default function Activity() {
  const { data, error } = useAdminData("/activity");
  const [query, setQuery] = useState("");
  const q = useDebounced(query).toLowerCase();
  const rows = (data || []).filter(
    (a) => !q || a.action.includes(q) || (a.name || "").toLowerCase().includes(q) || (a.email || "").includes(q)
  );

  return (
    <>
      <PageHeader title="Journal d'activité" description="Les 200 derniers événements : connexions, commandes, actions des admins." />
      <ErrorBanner error={error} />
      <div className="mb-4 flex">
        <SearchInput value={query} onChange={setQuery} placeholder="Filtrer par action ou par personne" />
      </div>
      <Card padded={false}>
        {!data ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={ActivityIcon} title="Aucun événement" />
        ) : (
          <ol className="px-5 py-2">
            {rows.map((a) => {
              const Icon = ICONS[a.action] || ActivityIcon;
              const detail = describe(a);
              return (
                <li key={a.id} className="flex gap-3 py-3 border-b last:border-0 border-[var(--line)]">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[var(--surface-2)] text-[var(--text-2)]">
                    <Icon size={15} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text)]">
                      <span className="font-medium">{a.name || "Visiteur"}</span>{" "}
                      <span className="text-[var(--text-2)]">· {a.action}</span>
                    </p>
                    {detail && <p className="text-xs mt-0.5 text-[var(--muted)]">{detail}</p>}
                  </div>
                  <time className="text-xs whitespace-nowrap text-[var(--muted)]" title={dateTime(a.created_at)}>
                    {timeAgo(a.created_at)}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </>
  );
}
