import React, { useMemo, useState } from "react";
import { Ban, CheckCircle2, LogOut, ShieldCheck, ShieldOff, Trash2, Users as UsersIcon } from "lucide-react";
import { useAuth } from "../../auth.jsx";
import { dateTime, euros, timeAgo } from "../../lib/api.js";
import {
  Avatar, Badge, Card, EmptyState, ErrorBanner, ExportButton, IconButton, PageHeader, SearchInput, Segmented,
  Skeleton, Table, Th, exportCsv, useAdminAction, useAdminData, useAdminUI, useDebounced, useSort,
} from "./ui.jsx";

export function UserStatus({ user }) {
  if (!user.active) return <Badge tone="critical">Désactivé</Badge>;
  if (user.online) return <Badge tone="good" pulse>En ligne</Badge>;
  return <Badge tone="neutral">Hors ligne</Badge>;
}

export default function Users() {
  const { user: me } = useAuth();
  const { confirm } = useAdminUI();
  const { data, error, reload } = useAdminData("/users");
  const run = useAdminAction(reload);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const q = useDebounced(query).toLowerCase();
  const sorter = useSort("created_at");

  const rows = useMemo(() => {
    if (!data) return [];
    return sorter.apply(
      data.filter(
        (u) =>
          (role === "all" || u.role === role) &&
          (status === "all" ||
            (status === "online" && u.online) ||
            (status === "active" && u.active) ||
            (status === "disabled" && !u.active)) &&
          (!q || u.name.toLowerCase().includes(q) || u.email.includes(q))
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, role, status, q, sorter.sort]);

  const counts = data && {
    all: data.length,
    client: data.filter((u) => u.role === "client").length,
    admin: data.filter((u) => u.role === "admin").length,
    online: data.filter((u) => u.online).length,
    disabled: data.filter((u) => !u.active).length,
  };

  async function toggleRole(u) {
    const next = u.role === "admin" ? "client" : "admin";
    const ok = await confirm({
      title: next === "admin" ? `Nommer ${u.name} administrateur ?` : `Retirer les droits admin de ${u.name} ?`,
      message: next === "admin" ? "Cette personne aura accès à tout le dashboard." : "Cette personne redeviendra un client.",
      confirmLabel: next === "admin" ? "Nommer admin" : "Retirer les droits",
    });
    if (ok) run(`/users/${u.id}`, { method: "PATCH", body: { role: next } }, "Rôle mis à jour");
  }

  async function toggleActive(u) {
    if (u.active) {
      const ok = await confirm({
        title: `Désactiver le compte de ${u.name} ?`,
        message: "La personne sera déconnectée immédiatement et ne pourra plus se connecter.",
        confirmLabel: "Désactiver",
        danger: true,
      });
      if (!ok) return;
    }
    run(`/users/${u.id}`, { method: "PATCH", body: { active: !u.active } }, u.active ? "Compte désactivé" : "Compte réactivé");
  }

  async function forceLogout(u) {
    const ok = await confirm({
      title: `Déconnecter ${u.name} ?`,
      message: `Ses ${u.sessions} session(s) ouverte(s) seront fermées. La personne pourra se reconnecter.`,
      confirmLabel: "Déconnecter",
    });
    if (ok) run(`/users/${u.id}/sessions`, { method: "DELETE" }, "Utilisateur déconnecté");
  }

  async function remove(u) {
    const ok = await confirm({
      title: `Supprimer définitivement ${u.name} ?`,
      message: "Le compte est supprimé. Ses commandes sont conservées mais ne lui sont plus rattachées. Action irréversible.",
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (ok) run(`/users/${u.id}`, { method: "DELETE" }, "Compte supprimé");
  }

  return (
    <>
      <PageHeader
        title="Utilisateurs"
        description="Gérez les comptes clients et administrateurs."
        actions={
          <ExportButton
            onClick={() =>
              exportCsv("utilisateurs", rows, [
                { label: "Nom", value: "name" },
                { label: "Email", value: "email" },
                { label: "Rôle", value: "role" },
                { label: "Actif", value: (u) => (u.active ? "oui" : "non") },
                { label: "Commandes", value: "orders" },
                { label: "Dépensé (€)", value: "spent" },
                { label: "Inscrit le", value: (u) => dateTime(u.created_at) },
                { label: "Dernière connexion", value: (u) => dateTime(u.last_login_at) },
              ])
            }
          />
        }
      />
      <ErrorBanner error={error} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Rechercher un nom ou un email" />
        <Segmented
          value={role}
          onChange={setRole}
          options={[
            { value: "all", label: "Tous", count: counts?.all },
            { value: "client", label: "Clients", count: counts?.client },
            { value: "admin", label: "Admins", count: counts?.admin },
          ]}
        />
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Tous statuts" },
            { value: "online", label: "En ligne", count: counts?.online },
            { value: "active", label: "Actifs" },
            { value: "disabled", label: "Désactivés", count: counts?.disabled },
          ]}
        />
      </div>

      <Card padded={false}>
        {!data ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState icon={UsersIcon} title="Aucun utilisateur trouvé">Modifiez la recherche ou les filtres.</EmptyState>
        ) : (
          <Table>
            <thead className="border-b border-[var(--line)]">
              <tr>
                <Th sortKey="name" sorter={sorter}>Utilisateur</Th>
                <Th>Rôle</Th>
                <Th>Statut</Th>
                <Th sortKey="orders" sorter={sorter} align="right">Commandes</Th>
                <Th sortKey="spent" sorter={sorter} align="right">Dépensé</Th>
                <Th sortKey="last_seen_at" sorter={sorter}>Dernière activité</Th>
                <Th align="right"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const self = u.id === me.id;
                return (
                  <tr key={u.id} className="border-b last:border-0 border-[var(--line)] hover:bg-[var(--row-hover)]">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} />
                        <div className="min-w-0">
                          <p className="text-[var(--text)] whitespace-nowrap">
                            {u.name}
                            {self && <span className="ml-1.5 text-xs text-[var(--muted)]">(vous)</span>}
                          </p>
                          <p className="text-xs text-[var(--muted)]" title={`Inscrit le ${dateTime(u.created_at)}`}>{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={u.role === "admin" ? "info" : "neutral"}>{u.role === "admin" ? "Admin" : "Client"}</Badge>
                    </td>
                    <td className="px-3 py-3"><UserStatus user={u} /></td>
                    <td className="px-3 py-3 text-right tabular-nums text-[var(--text)]">{u.orders}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-[var(--text)]">{euros(u.spent)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-[var(--text-2)]">{timeAgo(u.last_seen_at || u.last_login_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end">
                        <IconButton label={u.role === "admin" ? "Retirer les droits admin" : "Nommer admin"} disabled={self} onClick={() => toggleRole(u)}>
                          {u.role === "admin" ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                        </IconButton>
                        <IconButton label="Forcer la déconnexion" disabled={self || !u.sessions} onClick={() => forceLogout(u)}>
                          <LogOut size={16} />
                        </IconButton>
                        <IconButton label={u.active ? "Désactiver le compte" : "Réactiver le compte"} disabled={self} onClick={() => toggleActive(u)}>
                          {u.active ? <Ban size={16} /> : <CheckCircle2 size={16} />}
                        </IconButton>
                        <IconButton label="Supprimer le compte" tone="danger" disabled={self} onClick={() => remove(u)}>
                          <Trash2 size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
