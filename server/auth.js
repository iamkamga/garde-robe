import { Router } from "express";
import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { sql } from "./db.js";

const scryptAsync = promisify(scrypt);
const COOKIE = "gr_session";
const SESSION_DAYS = 30;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- Mots de passe (scrypt, sel aléatoire, comparaison en temps constant) ----------

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [, salt, hex] = stored.split("$");
  const expected = Buffer.from(hex, "hex");
  const actual = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

// Hash factice pour que "email inconnu" prenne autant de temps que "mauvais mot de passe".
const DUMMY_HASH = await hashPassword(randomBytes(8).toString("hex"));

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères";
  if (password.length > 200) return "Mot de passe trop long";
  return null;
}

// ---------- Sessions ----------

const hashToken = (token) => createHash("sha256").update(token).digest("hex");

function readCookie(req) {
  const header = req.headers.cookie || "";
  const match = header.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`));
  return match ? decodeURIComponent(match.slice(COOKIE.length + 1)) : null;
}

function setCookie(res, token, maxAgeSeconds) {
  const parts = [
    `${COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

async function startSession(req, res, userId) {
  const token = randomBytes(32).toString("base64url");
  await sql`
    INSERT INTO sessions (id, user_id, expires_at, ip, user_agent)
    VALUES (${hashToken(token)}, ${userId}, now() + make_interval(days => ${SESSION_DAYS}),
            ${req.ip}, ${String(req.headers["user-agent"] || "").slice(0, 300)})
  `;
  await sql`UPDATE users SET last_login_at = now() WHERE id = ${userId}`;
  setCookie(res, token, SESSION_DAYS * 86400);
}

export async function logActivity(userId, action, details = null) {
  await sql`INSERT INTO activity_log (user_id, action, details) VALUES (${userId}, ${action}, ${details})`;
}

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

// Charge l'utilisateur de la session (si cookie valide) et met à jour "vu pour la dernière fois".
export async function loadUser(req, res, next) {
  const token = sql && readCookie(req);
  if (!token) return next();
  const [row] = await sql`
    SELECT u.id, u.name, u.email, u.role, s.id AS session_id,
           s.last_seen_at < now() - interval '1 minute' AS stale
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.id = ${hashToken(token)} AND s.expires_at > now() AND u.active
  `;
  if (row) {
    req.user = publicUser(row);
    req.sessionId = row.session_id;
    if (row.stale) await sql`UPDATE sessions SET last_seen_at = now() WHERE id = ${row.session_id}`;
  }
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Connexion requise" });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Connexion requise" });
  if (req.user.role !== "admin") return res.status(403).json({ error: "Accès réservé aux administrateurs" });
  next();
}

// ---------- Limitation des tentatives de connexion (en mémoire) ----------

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function tooManyAttempts(key) {
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((t) => now - t < WINDOW_MS);
  attempts.set(key, recent);
  return recent.length >= MAX_ATTEMPTS;
}
const recordFailure = (key) => attempts.get(key)?.push(Date.now());

// ---------- Routes ----------

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const { password } = req.body ?? {};
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: "Indiquez votre nom" });
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Email invalide" });
  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });

  const [user] = await sql`
    INSERT INTO users (name, email, password_hash)
    VALUES (${name}, ${email}, ${await hashPassword(password)})
    ON CONFLICT (email) DO NOTHING
    RETURNING id, name, email, role
  `;
  if (!user) return res.status(409).json({ error: "Un compte existe déjà avec cet email" });
  await startSession(req, res, user.id);
  await logActivity(user.id, "inscription");
  res.status(201).json({ user: publicUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");
  const key = `${req.ip}|${email}`;
  if (tooManyAttempts(key)) {
    return res.status(429).json({ error: "Trop de tentatives. Réessayez dans 15 minutes." });
  }

  const [user] = await sql`SELECT id, name, email, role, active, password_hash FROM users WHERE email = ${email}`;
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    recordFailure(key);
    if (user) await logActivity(user.id, "échec de connexion");
    return res.status(401).json({ error: "Email ou mot de passe incorrect" });
  }
  if (!user.active) return res.status(403).json({ error: "Ce compte a été désactivé" });

  attempts.delete(key);
  await startSession(req, res, user.id);
  await logActivity(user.id, "connexion");
  res.json({ user: publicUser(user) });
});

authRouter.post("/logout", async (req, res) => {
  if (req.sessionId) {
    await sql`DELETE FROM sessions WHERE id = ${req.sessionId}`;
    await logActivity(req.user.id, "déconnexion");
  }
  setCookie(res, "", 0);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  res.json({ user: req.user ?? null });
});

authRouter.post("/password", requireUser, async (req, res) => {
  const { current, next: nextPassword } = req.body ?? {};
  const pwError = validatePassword(nextPassword);
  if (pwError) return res.status(400).json({ error: pwError });
  const [row] = await sql`SELECT password_hash FROM users WHERE id = ${req.user.id}`;
  if (!(await verifyPassword(String(current ?? ""), row.password_hash))) {
    return res.status(400).json({ error: "Mot de passe actuel incorrect" });
  }
  await sql`UPDATE users SET password_hash = ${await hashPassword(nextPassword)} WHERE id = ${req.user.id}`;
  // Déconnecte les autres appareils, garde la session courante.
  await sql`DELETE FROM sessions WHERE user_id = ${req.user.id} AND id <> ${req.sessionId}`;
  await logActivity(req.user.id, "mot de passe modifié");
  res.json({ ok: true });
});

authRouter.get("/orders", requireUser, async (req, res) => {
  const rows = await sql`
    SELECT o.id, o.total::float AS total, o.status, o.created_at,
           COALESCE(SUM(oi.quantity), 0)::int AS items
    FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = ${req.user.id}
    GROUP BY o.id ORDER BY o.created_at DESC
  `;
  res.json(rows);
});
