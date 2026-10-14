import React, { useEffect, useMemo, useState } from "react";
import {
  Activity as ActivityIcon, Command, LayoutDashboard, LogOut, Mail, Menu, Moon, Package, RefreshCw, Search, Store,
  Sun, Users as UsersIcon, Wifi, X,
} from "lucide-react";
import { useAuth } from "../../auth.jsx";
import { navigate, useHashRoute } from "../../lib/route.js";
import { AdminUIProvider, Avatar, Modal } from "./ui.jsx";
import Overview from "./Overview.jsx";
import Users from "./Users.jsx";
import Sessions from "./Sessions.jsx";
import Orders from "./Orders.jsx";
import Newsletter from "./Newsletter.jsx";
import Activity from "./Activity.jsx";

const LIVE_INTERVAL_MS = 30_000;
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const THEME_KEY = "garde-robe-admin-theme";

const SECTIONS = [
  { path: "", label: "Vue d'ensemble", icon: LayoutDashboard, component: Overview },
  { path: "utilisateurs", label: "Utilisateurs", icon: UsersIcon, component: Users },
  { path: "connectes", label: "Personnes connectées", icon: Wifi, component: Sessions },
  { path: "commandes", label: "Commandes", icon: Package, component: Orders },
  { path: "newsletter", label: "Newsletter", icon: Mail, component: Newsletter },
  { path: "activite", label: "Journal d'activité", icon: ActivityIcon, component: Activity },
];

// Jetons de couleur clair/sombre du dashboard (graphiques : bleu validé daltonisme).
const THEME_CSS = `
.adm {
  color-scheme: light;
  --bg: #F5F2ED; --surface: #FCFCFB; --surface-2: #EFEBE4; --row-hover: #F6F3EE; --line: #E3DED3;
  --text: #22201D; --text-2: #5C5748; --muted: #8A8578;
  --accent: #22201D; --accent-fg: #F5F2ED;
  --series: #2a78d6; --grid: #ECE8E0;
  --good: #0ca30c; --warning: #fab219; --serious: #ec835a; --critical: #d03b3b;
  --good-text: #006300; --critical-text: #b42323;
}
.adm[data-theme="dark"] {
  color-scheme: dark;
  --bg: #121211; --surface: #1a1a19; --surface-2: #262624; --row-hover: #20201e; --line: #2f2e2b;
  --text: #f0efec; --text-2: #c3c2b7; --muted: #8f8d84;
  --accent: #f0efec; --accent-fg: #1a1a19;
  --series: #3987e5; --grid: #2a2927;
  --good-text: #4cc24c; --critical-text: #ef7a7a;
}
@keyframes admPop { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: none; } }
.adm-pop { animation: admPop .16s ease-out both; }
`;

function useTheme() {
  const system = () => (window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || system();
    } catch {
      return system();
    }
  });
  const toggle = () =>
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}
      return next;
    });
  return [theme, toggle];
}

function CommandPalette({ onClose, actions }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const results = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  const runAt = (i) => {
    const action = results[i];
    if (!action) return;
    onClose();
    action.run();
  };

  return (
    <Modal onClose={onClose} labelledBy="palette-title" wide>
      <h2 id="palette-title" className="sr-only">Palette de commandes</h2>
      <div className="-m-6">
        <div className="flex items-center gap-3 px-4 border-b border-[var(--line)]">
          <Search size={17} className="text-[var(--muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIndex((i) => Math.min(i + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                runAt(index);
              }
            }}
            placeholder="Aller à… ou lancer une action"
            className="flex-1 h-14 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-[var(--line)] text-[var(--muted)]">Échap</kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2" role="listbox">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-[var(--muted)]">Aucun résultat</li>}
          {results.map((a, i) => (
            <li key={a.label} role="option" aria-selected={i === index}>
              <button
                onMouseEnter={() => setIndex(i)}
                onClick={() => runAt(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left ${
                  i === index ? "bg-[var(--surface-2)] text-[var(--text)]" : "text-[var(--text-2)]"
                }`}
              >
                <a.icon size={16} className="text-[var(--muted)]" />
                {a.label}
                <span className="ml-auto text-xs text-[var(--muted)]">{a.group}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

function Sidebar({ current, onNavigate, user, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      <a href="#/" className="flex items-center gap-2.5 px-5 h-16 shrink-0">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center font-display text-lg bg-[var(--accent)] text-[var(--accent-fg)]">G</span>
        <span>
          <span className="block font-display text-[17px] leading-tight text-[var(--text)]">Garde-Robe</span>
          <span className="block text-[11px] text-[var(--muted)]">Administration</span>
        </span>
      </a>
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {SECTIONS.map((s) => {
          const active = current.path === s.path;
          return (
            <a
              key={s.path}
              href={`#/admin${s.path ? `/${s.path}` : ""}`}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 h-10 rounded-lg text-sm transition ${
                active
                  ? "bg-[var(--surface-2)] text-[var(--text)] font-medium"
                  : "text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              }`}
            >
              <s.icon size={17} />
              {s.label}
            </a>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[var(--line)] space-y-0.5">
        <a href="#/" className="flex items-center gap-3 px-3 h-10 rounded-lg text-sm text-[var(--text-2)] hover:bg-[var(--surface-2)]">
          <Store size={17} /> Voir la boutique
        </a>
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar name={user.name} size={30} />
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate text-[var(--text)]">{user.name}</p>
            <p className="text-xs truncate text-[var(--muted)]">{user.email}</p>
          </div>
          <button onClick={onLogout} aria-label="Se déconnecter" title="Se déconnecter" className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Shell({ user, logout }) {
  const route = useHashRoute();
  const [theme, toggleTheme] = useTheme();
  const [tick, setTick] = useState(0);
  const [live, setLive] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(() => new Date());
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const sub = route.replace(/^\/admin\/?/, "").split("/")[0];
  const current = SECTIONS.find((s) => s.path === sub) || SECTIONS[0];
  const Page = current.component;

  const refresh = () => {
    setTick((t) => t + 1);
    setUpdatedAt(new Date());
  };

  // Rafraîchissement automatique ("live"), en pause quand l'onglet est masqué.
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => document.visibilityState === "visible" && refresh(), LIVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [live]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const doLogout = async () => {
    await logout();
    navigate("/compte");
  };

  const actions = useMemo(
    () => [
      ...SECTIONS.map((s) => ({
        label: s.label,
        icon: s.icon,
        group: "Aller à",
        run: () => navigate(`/admin${s.path ? `/${s.path}` : ""}`),
      })),
      { label: "Actualiser les données", icon: RefreshCw, group: "Action", run: refresh },
      { label: theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre", icon: theme === "dark" ? Sun : Moon, group: "Action", run: toggleTheme },
      { label: "Voir la boutique", icon: Store, group: "Action", run: () => navigate("/") },
      { label: "Se déconnecter", icon: LogOut, group: "Action", run: doLogout },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme]
  );

  return (
    <div className="adm font-body min-h-screen bg-[var(--bg)] text-[var(--text)]" data-theme={theme}>
      <style>{THEME_CSS}</style>
      <AdminUIProvider tick={tick}>
        {/* Menu latéral : fixe sur grand écran, tiroir sur mobile */}
        <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 border-r border-[var(--line)] bg-[var(--surface)]">
          <Sidebar current={current} user={user} onLogout={doLogout} />
        </aside>
        {menuOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
            <aside className="adm-pop absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-[var(--surface)] border-r border-[var(--line)]">
              <button onClick={() => setMenuOpen(false)} aria-label="Fermer le menu" className="absolute top-4 right-3 p-1.5 text-[var(--muted)]">
                <X size={18} />
              </button>
              <Sidebar current={current} user={user} onLogout={doLogout} onNavigate={() => setMenuOpen(false)} />
            </aside>
          </div>
        )}

        <div className="lg:pl-64">
          <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 md:px-8 border-b border-[var(--line)] bg-[var(--bg)]">
            <button onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu" className="lg:hidden p-2 -ml-2 rounded-lg text-[var(--text-2)]">
              <Menu size={20} />
            </button>
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 h-9 px-3 rounded-lg border text-sm flex-1 max-w-xs border-[var(--line)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]"
            >
              <Search size={15} />
              <span className="flex-1 text-left truncate">Rechercher…</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border border-[var(--line)]">
                {IS_MAC ? <Command size={10} /> : "Ctrl "}K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={() => setLive((l) => !l)}
                title={live ? "Mise à jour automatique toutes les 30 s (cliquer pour mettre en pause)" : "Mise à jour automatique en pause"}
                className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-lg text-xs border border-[var(--line)] bg-[var(--surface)] text-[var(--text-2)]"
              >
                <span className="relative flex w-2 h-2">
                  {live && <span className="absolute inset-0 rounded-full animate-ping opacity-60 bg-[var(--good)]" />}
                  <span className={`relative w-2 h-2 rounded-full ${live ? "bg-[var(--good)]" : "bg-[var(--muted)]"}`} />
                </span>
                {live ? "En direct" : "En pause"}
                <span className="text-[var(--muted)]">· {updatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
              </button>
              <button onClick={refresh} aria-label="Actualiser" title="Actualiser" className="p-2 rounded-lg text-[var(--text-2)] hover:bg-[var(--surface-2)]">
                <RefreshCw size={17} />
              </button>
              <button
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Mode clair" : "Mode sombre"}
                title={theme === "dark" ? "Mode clair" : "Mode sombre"}
                className="p-2 rounded-lg text-[var(--text-2)] hover:bg-[var(--surface-2)]"
              >
                {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            </div>
          </header>

          <main className="px-4 md:px-8 py-8 max-w-[1400px]">
            <Page key={current.path} />
          </main>
        </div>

        {paletteOpen && <CommandPalette actions={actions} onClose={() => setPaletteOpen(false)} />}
      </AdminUIProvider>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate("/compte");
  }, [loading, user]);

  if (loading || !user) return <div className="min-h-screen" style={{ background: "#F5F2ED" }} />;

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen font-body flex items-center justify-center p-6" style={{ background: "#F5F2ED", color: "#22201D" }}>
        <div className="text-center max-w-sm">
          <h1 className="font-display text-2xl">Accès réservé</h1>
          <p className="text-sm mt-2" style={{ color: "#8A8578" }}>Cette page est réservée aux administrateurs de la boutique.</p>
          <a href="#/" className="inline-block mt-6 text-sm px-5 py-2.5" style={{ background: "#22201D", color: "#F5F2ED" }}>
            Retour à la boutique
          </a>
        </div>
      </div>
    );
  }

  return <Shell user={user} logout={logout} />;
}
