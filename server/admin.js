import { Router } from "express";
import { sql } from "./db.js";
import { requireAdmin, logActivity } from "./auth.js";

// Un utilisateur est "en ligne" s'il a fait une requête dans les 5 dernières minutes.
const ONLINE = "5 minutes";
export const ORDER_STATUSES = ["nouvelle", "préparée", "expédiée", "livrée", "annulée"];

export const adminRouter = Router();
adminRouter.use(requireAdmin);

adminRouter.get("/overview", async (req, res) => {
  const [kpi] = await sql`
    SELECT
      (SELECT COALESCE(SUM(total), 0)::float FROM orders WHERE status <> 'annulée') AS revenue,
      (SELECT COALESCE(SUM(total), 0)::float FROM orders WHERE status <> 'annulée' AND created_at > now() - interval '7 days') AS revenue_7d,
      (SELECT COALESCE(SUM(total), 0)::float FROM orders WHERE status <> 'annulée' AND created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days') AS revenue_prev_7d,
      (SELECT count(*)::int FROM orders) AS orders,
      (SELECT count(*)::int FROM orders WHERE created_at > now() - interval '7 days') AS orders_7d,
      (SELECT count(*)::int FROM orders WHERE created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days') AS orders_prev_7d,
      (SELECT count(*)::int FROM orders WHERE status = 'nouvelle') AS orders_pending,
      (SELECT count(*)::int FROM users WHERE role = 'client') AS clients,
      (SELECT count(*)::int FROM users WHERE role = 'client' AND created_at > now() - interval '7 days') AS clients_7d,
      (SELECT count(*)::int FROM users WHERE role = 'client' AND created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days') AS clients_prev_7d,
      (SELECT count(DISTINCT user_id)::int FROM sessions WHERE expires_at > now() AND last_seen_at > now() - ${ONLINE}::interval) AS online,
      (SELECT count(*)::int FROM newsletter_subscribers) AS newsletter
  `;
  const revenueByDay = await sql`
    SELECT to_char(d, 'YYYY-MM-DD') AS day,
           COALESCE(SUM(o.total), 0)::float AS revenue,
           count(o.id)::int AS orders
    FROM generate_series(current_date - 29, current_date, interval '1 day') d
    LEFT JOIN orders o ON o.created_at::date = d::date AND o.status <> 'annulée'
    GROUP BY d ORDER BY d
  `;
  const byCategory = await sql`
    SELECT p.category, SUM(oi.quantity * oi.unit_price)::float AS revenue, SUM(oi.quantity)::int AS units
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id AND o.status <> 'annulée'
    GROUP BY p.category ORDER BY revenue DESC
  `;
  const topProducts = await sql`
    SELECT p.name, p.category, p.image, SUM(oi.quantity)::int AS units, SUM(oi.quantity * oi.unit_price)::float AS revenue
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id AND o.status <> 'annulée'
    GROUP BY p.id ORDER BY units DESC, revenue DESC LIMIT 5
  `;
  const recentOrders = await sql`
    SELECT o.id, o.total::float AS total, o.status, o.created_at, COALESCE(u.name, o.email, 'Invité') AS customer
    FROM orders o LEFT JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC LIMIT 6
  `;
  res.json({ kpi, revenueByDay, byCategory, topProducts, recentOrders });
});

adminRouter.get("/users", async (req, res) => {
  const rows = await sql`
    SELECT u.id, u.name, u.email, u.role, u.active, u.created_at, u.last_login_at,
           (SELECT max(last_seen_at) FROM sessions s WHERE s.user_id = u.id AND s.expires_at > now()) AS last_seen_at,
           EXISTS (SELECT 1 FROM sessions s WHERE s.user_id = u.id AND s.expires_at > now()
                   AND s.last_seen_at > now() - ${ONLINE}::interval) AS online,
           (SELECT count(*)::int FROM sessions s WHERE s.user_id = u.id AND s.expires_at > now()) AS sessions,
           (SELECT count(*)::int FROM orders o WHERE o.user_id = u.id) AS orders,
           (SELECT COALESCE(SUM(total), 0)::float FROM orders o WHERE o.user_id = u.id AND o.status <> 'annulée') AS spent
    FROM users u
    ORDER BY u.created_at DESC
  `;
  res.json(rows);
});

async function findOtherUser(req, res) {
  const id = Number(req.params.id);
  if (id === req.user.id) {
    res.status(400).json({ error: "Vous ne pouvez pas effectuer cette action sur votre propre compte" });
    return null;
  }
  const [user] = await sql`SELECT id, email FROM users WHERE id = ${id}`;
  if (!user) res.status(404).json({ error: "Utilisateur introuvable" });
  return user;
}

adminRouter.patch("/users/:id", async (req, res) => {
  const user = await findOtherUser(req, res);
  if (!user) return;
  const { role, active } = req.body ?? {};
  if (role !== undefined) {
    if (!["client", "admin"].includes(role)) return res.status(400).json({ error: "Rôle invalide" });
    await sql`UPDATE users SET role = ${role} WHERE id = ${user.id}`;
    await logActivity(req.user.id, "rôle modifié", { cible: user.email, role });
  }
  if (active !== undefined) {
    await sql`UPDATE users SET active = ${Boolean(active)} WHERE id = ${user.id}`;
    if (!active) await sql`DELETE FROM sessions WHERE user_id = ${user.id}`;
    await logActivity(req.user.id, active ? "compte réactivé" : "compte désactivé", { cible: user.email });
  }
  res.json({ ok: true });
});

adminRouter.delete("/users/:id/sessions", async (req, res) => {
  const user = await findOtherUser(req, res);
  if (!user) return;
  await sql`DELETE FROM sessions WHERE user_id = ${user.id}`;
  await logActivity(req.user.id, "déconnexion forcée", { cible: user.email });
  res.json({ ok: true });
});

adminRouter.delete("/users/:id", async (req, res) => {
  const user = await findOtherUser(req, res);
  if (!user) return;
  await sql`DELETE FROM users WHERE id = ${user.id}`;
  await logActivity(req.user.id, "compte supprimé", { cible: user.email });
  res.json({ ok: true });
});

adminRouter.get("/sessions", async (req, res) => {
  const rows = await sql`
    SELECT s.id, s.created_at, s.last_seen_at, s.ip, s.user_agent,
           s.last_seen_at > now() - ${ONLINE}::interval AS online,
           s.id = ${req.sessionId} AS current,
           u.id AS user_id, u.name, u.email, u.role
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.expires_at > now()
    ORDER BY s.last_seen_at DESC
  `;
  res.json(rows);
});

adminRouter.delete("/sessions/:id", async (req, res) => {
  if (req.params.id === req.sessionId) {
    return res.status(400).json({ error: "Utilisez « Se déconnecter » pour votre propre session" });
  }
  const [s] = await sql`
    DELETE FROM sessions s USING users u
    WHERE s.id = ${req.params.id} AND u.id = s.user_id
    RETURNING u.email
  `;
  if (!s) return res.status(404).json({ error: "Session introuvable" });
  await logActivity(req.user.id, "session révoquée", { cible: s.email });
  res.json({ ok: true });
});

adminRouter.get("/orders", async (req, res) => {
  const rows = await sql`
    SELECT o.id, o.total::float AS total, o.status, o.created_at,
           COALESCE(u.email, o.email) AS email, u.name,
           COALESCE(json_agg(json_build_object('name', p.name, 'qty', oi.quantity, 'price', oi.unit_price::float))
                    FILTER (WHERE oi.id IS NOT NULL), '[]') AS items
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON p.id = oi.product_id
    GROUP BY o.id, u.email, u.name
    ORDER BY o.created_at DESC
  `;
  res.json(rows);
});

adminRouter.patch("/orders/:id", async (req, res) => {
  const { status } = req.body ?? {};
  if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: "Statut invalide" });
  const [order] = await sql`UPDATE orders SET status = ${status} WHERE id = ${Number(req.params.id)} RETURNING id`;
  if (!order) return res.status(404).json({ error: "Commande introuvable" });
  await logActivity(req.user.id, "statut de commande", { commande: order.id, status });
  res.json({ ok: true });
});

adminRouter.get("/newsletter", async (req, res) => {
  res.json(await sql`SELECT email, created_at FROM newsletter_subscribers ORDER BY created_at DESC`);
});

adminRouter.get("/activity", async (req, res) => {
  const rows = await sql`
    SELECT a.id, a.action, a.details, a.created_at, u.name, u.email
    FROM activity_log a LEFT JOIN users u ON u.id = a.user_id
    ORDER BY a.created_at DESC LIMIT 200
  `;
  res.json(rows);
});
