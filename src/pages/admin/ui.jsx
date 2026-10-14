import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Info, Search, X } from "lucide-react";
import { api } from "../../lib/api.js";

// ---------- Contexte UI : toasts, confirmations, rafraîchissement "live" ----------

const AdminUI = createContext(null);
export const useAdminUI = () => useContext(AdminUI);

export function AdminUIProvider({ tick, children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  const toast = useCallback((text, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const confirm = useCallback(
    (options) => new Promise((resolve) => setDialog({ ...options, resolve })),
    []
  );

  const close = (answer) => {
    dialog.resolve(answer);
    setDialog(null);
  };

  return (
    <AdminUI.Provider value={{ toast, confirm, tick }}>
      {children}

      <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(360px,calc(100vw-32px))]" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="adm-pop flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg bg-[var(--surface)] border-[var(--line)] text-[var(--text)]"
          >
            {t.type === "error" ? (
              <AlertTriangle size={17} className="shrink-0 mt-px text-[var(--critical)]" />
            ) : (
              <CheckCircle2 size={17} className="shrink-0 mt-px text-[var(--good)]" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      {dialog && (
        <Modal onClose={() => close(false)} labelledBy="confirm-title">
          <h2 id="confirm-title" className="text-base font-semibold text-[var(--text)]">{dialog.title}</h2>
          {dialog.message && <p className="mt-2 text-sm text-[var(--text-2)]">{dialog.message}</p>}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => close(false)}>Annuler</Button>
            <Button variant={dialog.danger ? "danger" : "primary"} onClick={() => close(true)} autoFocus>
              {dialog.confirmLabel || "Confirmer"}
            </Button>
          </div>
        </Modal>
      )}
    </AdminUI.Provider>
  );
}

// ---------- Chargement des données d'une route admin ----------

export function useAdminData(path) {
  const { tick } = useAdminUI();
  const [state, setState] = useState({ data: null, error: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api(`/admin${path}`)
      .then((data) => !cancelled && setState({ data, error: null }))
      .catch((error) => !cancelled && setState((s) => ({ data: s.data, error })));
    return () => {
      cancelled = true;
    };
  }, [path, tick, version]);

  return { ...state, reload: () => setVersion((v) => v + 1) };
}

// Exécute une action admin puis affiche un toast et recharge les données.
export function useAdminAction(reload) {
  const { toast } = useAdminUI();
  return async (path, options, successText) => {
    try {
      await api(`/admin${path}`, options);
      toast(successText);
      reload();
    } catch (err) {
      toast(err.message, "error");
    }
  };
}

// ---------- Composants ----------

export function Modal({ children, onClose, labelledBy, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`adm-pop relative w-full ${wide ? "max-w-xl" : "max-w-md"} rounded-2xl border p-6 shadow-2xl bg-[var(--surface)] border-[var(--line)]`}
      >
        {children}
      </div>
    </div>
  );
}

const BUTTON_STYLES = {
  primary: "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90",
  ghost: "text-[var(--text-2)] hover:bg-[var(--surface-2)]",
  outline: "border border-[var(--line)] text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--surface-2)]",
  danger: "bg-[var(--critical)] text-white hover:opacity-90",
};

export function Button({ variant = "outline", className = "", children, ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 h-9 text-sm font-medium transition disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--series)] ${BUTTON_STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({ label, children, tone = "default", ...props }) {
  const toneClass = tone === "danger" ? "hover:text-[var(--critical-text)]" : "hover:text-[var(--text)]";
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={`p-2 rounded-lg text-[var(--muted)] hover:bg-[var(--surface-2)] ${toneClass} transition disabled:opacity-30 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--series)]`}
    >
      {children}
    </button>
  );
}

export function Card({ title, subtitle, action, children, className = "", padded = true }) {
  return (
    <section className={`rounded-2xl border bg-[var(--surface)] border-[var(--line)] ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            {title && <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>}
            {subtitle && <p className="text-xs mt-0.5 text-[var(--muted)]">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-display text-[var(--text)]">{title}</h1>
        {description && <p className="text-sm mt-1 text-[var(--muted)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// Statut = pastille + libellé (jamais la couleur seule).
const TONES = {
  good: "var(--good)",
  warning: "var(--warning)",
  serious: "var(--serious)",
  critical: "var(--critical)",
  neutral: "var(--muted)",
  info: "var(--series)",
};

export function Badge({ tone = "neutral", children, pulse = false }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap border-[var(--line)] text-[var(--text-2)] bg-[var(--surface)]">
      <span className="relative flex w-2 h-2">
        {pulse && <span className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: TONES[tone] }} />}
        <span className="relative w-2 h-2 rounded-full" style={{ background: TONES[tone] }} />
      </span>
      {children}
    </span>
  );
}

export function Avatar({ name, size = 32 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-medium shrink-0 bg-[var(--surface-2)] text-[var(--text)]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(name || "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <label className="relative flex-1 min-w-[180px] max-w-sm">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 rounded-lg border pl-9 pr-8 text-sm bg-[var(--surface)] border-[var(--line)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--series)]"
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Effacer" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--muted)]">
          <X size={14} />
        </button>
      )}
    </label>
  );
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg border p-0.5 border-[var(--line)] bg-[var(--surface)]">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 h-8 rounded-md text-sm whitespace-nowrap transition ${
            value === o.value ? "bg-[var(--surface-2)] text-[var(--text)] font-medium" : "text-[var(--muted)] hover:text-[var(--text)]"
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 text-xs text-[var(--muted)]">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--surface-2)] ${className}`} />;
}

export function EmptyState({ icon: Icon = Info, title, children }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-4">
      <span className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--surface-2)] text-[var(--muted)]">
        <Icon size={20} />
      </span>
      <p className="mt-3 text-sm font-medium text-[var(--text)]">{title}</p>
      {children && <p className="mt-1 text-sm text-[var(--muted)] max-w-xs">{children}</p>}
    </div>
  );
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm border-[var(--line)] bg-[var(--surface)] text-[var(--text)]">
      <AlertTriangle size={16} className="text-[var(--critical)]" />
      {error.message}
    </div>
  );
}

// En-tête de colonne triable.
export function useSort(initialKey, initialDir = "desc") {
  const [sort, setSort] = useState({ key: initialKey, dir: initialDir });
  const toggle = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));
  const apply = (rows) =>
    [...rows].sort((a, b) => {
      const x = a[sort.key] ?? "";
      const y = b[sort.key] ?? "";
      const cmp = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr");
      return sort.dir === "asc" ? cmp : -cmp;
    });
  return { sort, toggle, apply };
}

export function Th({ children, sortKey, sorter, align = "left" }) {
  const active = sorter && sorter.sort.key === sortKey;
  const content = (
    <>
      {children}
      {active && <span aria-hidden>{sorter.sort.dir === "asc" ? " ↑" : " ↓"}</span>}
    </>
  );
  return (
    <th
      className={`px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-[var(--muted)] whitespace-nowrap ${align === "right" ? "text-right" : "text-left"}`}
      aria-sort={active ? (sorter.sort.dir === "asc" ? "ascending" : "descending") : undefined}
    >
      {sortKey && sorter ? (
        <button onClick={() => sorter.toggle(sortKey)} className="uppercase tracking-wide hover:text-[var(--text)]">
          {content}
        </button>
      ) : (
        content
      )}
    </th>
  );
}

export function Table({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

// ---------- Export CSV (séparateur ; et BOM pour Excel en français) ----------

export function exportCsv(filename, rows, columns) {
  const escape = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    columns.map((c) => escape(c.label)).join(";"),
    ...rows.map((r) => columns.map((c) => escape(typeof c.value === "function" ? c.value(r) : r[c.value])).join(";")),
  ];
  const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ onClick }) {
  return (
    <Button onClick={onClick}>
      <Download size={15} /> Exporter CSV
    </Button>
  );
}

// Appareil lisible à partir du user-agent.
export function describeDevice(ua = "") {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /curl|node/i.test(ua) ? "Script" : "Navigateur";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const mobile = /Mobile|Android|iPhone/.test(ua);
  return { label: os ? `${browser} · ${os}` : browser, mobile };
}

export function useDebounced(value, delay = 200) {
  const [v, setV] = useState(value);
  const t = useRef();
  useEffect(() => {
    clearTimeout(t.current);
    t.current = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t.current);
  }, [value, delay]);
  return v;
}
