import express from "express";
import { sql } from "./db.js";
import { authRouter, loadUser, logActivity, EMAIL_RE } from "./auth.js";
import { adminRouter } from "./admin.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(loadUser);

// Toutes les routes /api exigent une base configurée, sauf /api/health.
function requireDb(req, res, next) {
  if (!sql) return res.status(503).json({ error: "Base de données non configurée" });
  next();
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, database: Boolean(sql) });
});

app.use("/api/auth", requireDb, authRouter);
app.use("/api/admin", requireDb, adminRouter);

app.get("/api/products", requireDb, async (req, res) => {
  const rows = await sql`
    SELECT id, category, name, price::float AS price, image
    FROM products
    WHERE active
    ORDER BY category, created_at, id
  `;
  res.json(rows);
});

app.post("/api/orders", requireDb, async (req, res) => {
  const { items } = req.body ?? {};
  // Client connecté : la commande est rattachée à son compte et à son email.
  const email = req.user?.email ?? req.body?.email;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Le panier est vide" });
  }
  if (email && !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Email invalide" });
  }
  const lines = items.map((i) => ({ id: String(i.id), qty: Number(i.qty) }));
  if (lines.some((l) => !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 99)) {
    return res.status(400).json({ error: "Quantité invalide" });
  }

  // Les prix viennent toujours de la base, jamais du navigateur.
  const ids = lines.map((l) => l.id);
  const products = await sql`SELECT id, price FROM products WHERE active AND id = ANY(${ids})`;
  const priceById = new Map(products.map((p) => [p.id, Number(p.price)]));
  const missing = ids.filter((id) => !priceById.has(id));
  if (missing.length) {
    return res.status(400).json({ error: "Article introuvable", missing });
  }
  const total = lines.reduce((s, l) => s + priceById.get(l.id) * l.qty, 0);

  const [order] = await sql`
    INSERT INTO orders (email, total, user_id)
    VALUES (${email || null}, ${total}, ${req.user?.id ?? null}) RETURNING id
  `;
  await sql.transaction(
    lines.map((l) => sql`
      INSERT INTO order_items (order_id, product_id, quantity, unit_price)
      VALUES (${order.id}, ${l.id}, ${l.qty}, ${priceById.get(l.id)})
    `)
  );
  await logActivity(req.user?.id ?? null, "commande", { commande: order.id, total });
  res.status(201).json({ orderId: order.id, total });
});

app.post("/api/newsletter", requireDb, async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Email invalide" });
  await sql`INSERT INTO newsletter_subscribers (email) VALUES (${email}) ON CONFLICT DO NOTHING`;
  res.status(201).json({ ok: true });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur serveur" });
});

app.listen(PORT, () => {
  console.log(`API Garde-Robe prête sur http://localhost:${PORT}`);
});
