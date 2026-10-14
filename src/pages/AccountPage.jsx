import React, { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "../auth.jsx";
import { api, euros, dateTime } from "../lib/api.js";
import { navigate } from "../lib/route.js";

const INK = "#22201D";
const IVORY = "#F5F2ED";
const MUTED = "#8A8578";
const LINE = "#DEDACF";
const ERROR = "#7A2E2E";

function Field({ label, type = "text", value, onChange, autoComplete, minLength }) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block">
      <span className="text-sm" style={{ color: INK }}>{label}</span>
      <div className="relative mt-1.5">
        <input
          type={isPassword && visible ? "text" : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          minLength={minLength}
          required
          className="w-full text-sm px-3 py-2.5 border bg-white focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ borderColor: LINE, color: INK }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
          >
            {visible ? <EyeOff size={16} color={MUTED} /> : <Eye size={16} color={MUTED} />}
          </button>
        )}
      </div>
    </label>
  );
}

function PrimaryButton({ children, busy, ...props }) {
  return (
    <button
      {...props}
      disabled={busy}
      className="w-full text-sm py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60"
      style={{ backgroundColor: INK, color: IVORY }}
    >
      {busy ? "Un instant…" : children}
    </button>
  );
}

function AuthForms() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = mode === "login" ? await login(email, password) : await register(name, email, password);
      navigate(user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const tab = (value, label) => (
    <button
      type="button"
      onClick={() => {
        setMode(value);
        setError("");
      }}
      className="flex-1 text-sm pb-3 border-b-2 transition-colors focus:outline-none"
      style={{ borderColor: mode === value ? INK : "transparent", color: mode === value ? INK : MUTED }}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="font-display text-3xl text-center" style={{ color: INK }}>
        {mode === "login" ? "Bon retour parmi nous" : "Créer votre compte"}
      </h1>
      <p className="text-sm text-center mt-2" style={{ color: MUTED }}>
        {mode === "login"
          ? "Connectez-vous pour suivre vos commandes."
          : "Quelques secondes suffisent, sans engagement."}
      </p>

      <div className="flex mt-8 border-b" style={{ borderColor: LINE }}>
        {tab("login", "Se connecter")}
        {tab("register", "Créer un compte")}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "register" && (
          <Field label="Nom complet" value={name} onChange={setName} autoComplete="name" />
        )}
        <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
        <Field
          label="Mot de passe"
          type="password"
          value={password}
          onChange={setPassword}
          minLength={mode === "register" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
        {mode === "register" && (
          <p className="text-xs" style={{ color: MUTED }}>8 caractères minimum.</p>
        )}
        {error && (
          <p role="alert" className="text-sm" style={{ color: ERROR }}>{error}</p>
        )}
        <PrimaryButton type="submit" busy={busy}>
          {mode === "login" ? "Se connecter" : "Créer mon compte"}
        </PrimaryButton>
      </form>
    </div>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await api("/auth/password", { method: "POST", body: { current, next } });
      setCurrent("");
      setNext("");
      setMessage({ ok: true, text: "Mot de passe modifié. Vos autres appareils ont été déconnectés." });
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Mot de passe actuel" type="password" value={current} onChange={setCurrent} autoComplete="current-password" />
      <Field label="Nouveau mot de passe" type="password" value={next} onChange={setNext} minLength={8} autoComplete="new-password" />
      {message && (
        <p className="text-sm" style={{ color: message.ok ? INK : ERROR }}>{message.text}</p>
      )}
      <PrimaryButton type="submit" busy={busy}>Mettre à jour</PrimaryButton>
    </form>
  );
}

function Account() {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    api("/auth/orders").then(setOrders).catch(() => setOrders([]));
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm" style={{ color: MUTED }}>Mon compte</p>
          <h1 className="font-display text-3xl mt-1" style={{ color: INK }}>Bonjour {user.name}</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>{user.email}</p>
        </div>
        <div className="flex gap-3">
          {user.role === "admin" && (
            <a
              href="#/admin"
              className="inline-flex items-center gap-2 text-sm px-4 py-2.5"
              style={{ backgroundColor: INK, color: IVORY }}
            >
              <LayoutDashboard size={16} /> Dashboard admin
            </a>
          )}
          <button
            onClick={async () => {
              await logout();
              navigate("/");
            }}
            className="inline-flex items-center gap-2 text-sm px-4 py-2.5 border"
            style={{ borderColor: INK, color: INK }}
          >
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-10 mt-12">
        <section className="md:col-span-3">
          <h2 className="font-display text-xl" style={{ color: INK }}>Mes commandes</h2>
          <div className="mt-4 border-t" style={{ borderColor: LINE }}>
            {orders === null ? (
              <p className="text-sm py-4" style={{ color: MUTED }}>Chargement…</p>
            ) : orders.length === 0 ? (
              <p className="text-sm py-4" style={{ color: MUTED }}>
                Aucune commande pour le moment. <a href="#/" className="underline">Découvrir la collection</a>
              </p>
            ) : (
              orders.map((o) => (
                <div key={o.id} className="flex justify-between py-4 border-b text-sm" style={{ borderColor: LINE }}>
                  <div>
                    <p style={{ color: INK }}>Commande n° {o.id}</p>
                    <p style={{ color: MUTED }}>
                      {dateTime(o.created_at)} · {o.items} article{o.items > 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p style={{ color: INK }}>{euros(o.total)}</p>
                    <p className="capitalize" style={{ color: MUTED }}>{o.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
        <section className="md:col-span-2">
          <h2 className="font-display text-xl mb-4" style={{ color: INK }}>Sécurité</h2>
          <ChangePassword />
        </section>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen font-body" style={{ backgroundColor: IVORY, color: INK }}>
      <header className="border-b" style={{ borderColor: LINE }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <a href="#/" className="font-display text-xl tracking-tight" style={{ color: INK }}>Garde-Robe</a>
          <a href="#/" className="inline-flex items-center gap-1.5 text-sm" style={{ color: MUTED }}>
            <ArrowLeft size={16} /> Retour à la boutique
          </a>
        </div>
      </header>
      <main className="px-5 md:px-8 py-14 md:py-20">
        {loading ? null : user ? <Account /> : <AuthForms />}
      </main>
    </div>
  );
}
