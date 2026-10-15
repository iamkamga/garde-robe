// Tests d'intégration et de sécurité : l'API réelle contre la branche Neon « test ».
// Ignorés si TEST_DATABASE_URL n'est pas défini (ex. : intégration continue sans secret).
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

const TEST_DB = process.env.TEST_DATABASE_URL;
const skip = !TEST_DB && "TEST_DATABASE_URL absent : tests d'intégration ignorés";

const RUN = Date.now().toString(36);
const mail = (who) => `${who}-${RUN}@test.garde-robe.local`;
const PASSWORD = "MotDePasse-Test-123";

let base, server, sql, hashPassword;

// Petit client HTTP qui garde le cookie de session comme un navigateur.
function client() {
  let cookie = "";
  return async (path, { method = "GET", body, headers = {} } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body && { "Content-Type": "application/json" }), ...(cookie && { cookie }), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get("set-cookie");
    if (set) cookie = set.split(";")[0].endsWith("=") ? "" : set.split(";")[0];
    const data = await res.json().catch(() => null);
    return { status: res.status, data, headers: res.headers, setCookie: set };
  };
}

describe("API Garde-Robe (intégration)", { skip }, () => {
  before(async () => {
    process.env.DATABASE_URL = TEST_DB; // doit précéder l'import de l'application
    ({ sql } = await import("../server/db.js"));
    ({ hashPassword } = await import("../server/auth.js"));
    const { default: app } = await import("../server/app.js");
    await new Promise((resolve) => {
      server = app.listen(0, resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
    // Un administrateur dédié au test.
    await sql`INSERT INTO users (name, email, password_hash, role) VALUES ('Admin Test', ${mail("admin")}, ${await hashPassword(PASSWORD)}, 'admin')`;
  });

  after(async () => {
    const pattern = `%-${RUN}@test.garde-robe.local`;
    await sql`DELETE FROM orders WHERE email LIKE ${pattern}`;
    await sql`DELETE FROM newsletter_subscribers WHERE email LIKE ${pattern}`;
    await sql`DELETE FROM users WHERE email LIKE ${pattern}`;
    server?.close();
  });

  const alice = client();
  const admin = client();
  const anonymous = client();

  test("santé : l'API répond et la base est connectée", async () => {
    const r = await anonymous("/api/health");
    assert.deepEqual(r.data, { ok: true, database: true });
  });

  test("en-têtes de sécurité présents", async () => {
    const r = await anonymous("/api/products");
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
    assert.equal(r.headers.get("x-frame-options"), "DENY");
    assert.equal(r.headers.get("cache-control"), "no-store");
    assert.equal(r.headers.get("x-powered-by"), null);
  });

  test("catalogue : 82 produits", async () => {
    const r = await anonymous("/api/products");
    assert.equal(r.status, 200);
    assert.equal(r.data.length, 82);
  });

  describe("inscription", () => {
    test("refusée sans consentement RGPD", async () => {
      const r = await anonymous("/api/auth/register", { method: "POST", body: { name: "Alice", email: mail("alice"), password: PASSWORD } });
      assert.equal(r.status, 400);
    });
    test("refusée avec un mot de passe trop court", async () => {
      const r = await anonymous("/api/auth/register", { method: "POST", body: { name: "Alice", email: mail("alice"), password: "123", consent: true } });
      assert.equal(r.status, 400);
    });
    test("acceptée : cookie de session HttpOnly + SameSite", async () => {
      const r = await alice("/api/auth/register", { method: "POST", body: { name: "Alice", email: mail("alice"), password: PASSWORD, consent: true } });
      assert.equal(r.status, 201);
      assert.equal(r.data.user.role, "client");
      assert.match(r.setCookie, /HttpOnly/);
      assert.match(r.setCookie, /SameSite=Lax/);
      const [row] = await sql`SELECT password_hash, privacy_accepted_at FROM users WHERE email = ${mail("alice")}`;
      assert.ok(row.privacy_accepted_at, "date de consentement enregistrée");
      assert.equal(row.password_hash.includes(PASSWORD), false, "mot de passe jamais stocké en clair");
    });
    test("doublon d'email refusé (409)", async () => {
      const r = await anonymous("/api/auth/register", { method: "POST", body: { name: "Bis", email: mail("alice"), password: PASSWORD, consent: true } });
      assert.equal(r.status, 409);
    });
  });

  describe("contrôle d'accès", () => {
    test("visiteur anonyme : dashboard refusé (401)", async () => {
      assert.equal((await anonymous("/api/admin/overview")).status, 401);
    });
    test("client connecté : dashboard refusé (403)", async () => {
      assert.equal((await alice("/api/admin/users")).status, 403);
    });
    test("connexion : message identique pour email inconnu et mauvais mot de passe", async () => {
      const a = await anonymous("/api/auth/login", { method: "POST", body: { email: mail("inconnu"), password: PASSWORD } });
      const b = await anonymous("/api/auth/login", { method: "POST", body: { email: mail("alice"), password: "faux-mot-de-passe" } });
      assert.equal(a.status, 401);
      assert.equal(b.status, 401);
      assert.equal(a.data.error, b.data.error);
    });
    test("tentative d'injection SQL dans l'email : rejetée", async () => {
      const r = await anonymous("/api/auth/login", { method: "POST", body: { email: "' OR 1=1 --", password: "x" } });
      assert.equal(r.status, 401);
    });
    test("requête venant d'un autre site (CSRF) : refusée", async () => {
      const r = await alice("/api/orders", { method: "POST", body: { items: [{ id: "Robes-0", qty: 1 }] }, headers: { origin: "https://pirate.example" } });
      assert.equal(r.status, 403);
    });
  });

  describe("commandes", () => {
    test("le prix envoyé par le navigateur est ignoré : le serveur recalcule", async () => {
      const r = await alice("/api/orders", { method: "POST", body: { items: [{ id: "Smokings-0", qty: 2, price: 1 }] } });
      assert.equal(r.status, 201);
      assert.equal(r.data.total, 480);
    });
    test("quantité invalide refusée", async () => {
      assert.equal((await alice("/api/orders", { method: "POST", body: { items: [{ id: "Robes-0", qty: -3 }] } })).status, 400);
    });
    test("article inexistant refusé", async () => {
      assert.equal((await alice("/api/orders", { method: "POST", body: { items: [{ id: "n-existe-pas", qty: 1 }] } })).status, 400);
    });
    test("la commande apparaît dans « Mes commandes »", async () => {
      const r = await alice("/api/auth/orders");
      assert.equal(r.data.length, 1);
      assert.equal(r.data[0].items, 2);
    });
  });

  describe("administration", () => {
    test("connexion admin et indicateurs du dashboard", async () => {
      assert.equal((await admin("/api/auth/login", { method: "POST", body: { email: mail("admin"), password: PASSWORD } })).status, 200);
      const r = await admin("/api/admin/overview");
      assert.equal(r.status, 200);
      assert.equal(r.data.revenueByDay.length, 30);
    });
    test("un admin ne peut pas se désactiver lui-même", async () => {
      const me = (await admin("/api/auth/me")).data.user;
      assert.equal((await admin(`/api/admin/users/${me.id}`, { method: "PATCH", body: { active: false } })).status, 400);
    });
    test("statut de commande modifiable, statut inconnu refusé", async () => {
      const orders = (await admin("/api/admin/orders")).data.filter((o) => o.email === mail("alice"));
      assert.equal((await admin(`/api/admin/orders/${orders[0].id}`, { method: "PATCH", body: { status: "expédiée" } })).status, 200);
      assert.equal((await admin(`/api/admin/orders/${orders[0].id}`, { method: "PATCH", body: { status: "volée" } })).status, 400);
    });
    test("désactivation d'un client : déconnexion immédiate et connexion bloquée", async () => {
      const users = (await admin("/api/admin/users")).data;
      const target = users.find((u) => u.email === mail("alice"));
      const bob = client();
      await bob("/api/auth/login", { method: "POST", body: { email: mail("alice"), password: PASSWORD } });
      await admin(`/api/admin/users/${target.id}`, { method: "PATCH", body: { active: false } });
      assert.equal((await bob("/api/auth/me")).data.user, null);
      assert.equal((await anonymous("/api/auth/login", { method: "POST", body: { email: mail("alice"), password: PASSWORD } })).status, 403);
      await admin(`/api/admin/users/${target.id}`, { method: "PATCH", body: { active: true } });
    });
    test("chaque action admin est journalisée", async () => {
      const log = (await admin("/api/admin/activity")).data;
      assert.ok(log.some((a) => a.action === "compte désactivé" && a.details?.cible === mail("alice")));
    });
  });

  describe("droits RGPD", () => {
    const carol = client();
    test("export des données personnelles (droit d'accès / portabilité)", async () => {
      await carol("/api/auth/register", { method: "POST", body: { name: "Carol", email: mail("carol"), password: PASSWORD, consent: true } });
      await carol("/api/orders", { method: "POST", body: { items: [{ id: "Jeans-0", qty: 1 }] } });
      const r = await carol("/api/auth/export");
      assert.equal(r.status, 200);
      assert.match(r.headers.get("content-disposition"), /attachment/);
      assert.equal(r.data.profil.email, mail("carol"));
      assert.equal(r.data.commandes.length, 1);
      assert.match(r.data.sessions_actives[0].ip ?? "", /(\.0|::)$/, "IP stockée tronquée");
    });
    test("newsletter : consentement obligatoire puis désinscription", async () => {
      assert.equal((await anonymous("/api/newsletter", { method: "POST", body: { email: mail("carol") } })).status, 400);
      assert.equal((await anonymous("/api/newsletter", { method: "POST", body: { email: mail("carol"), consent: true } })).status, 201);
      assert.equal((await anonymous("/api/newsletter/unsubscribe", { method: "POST", body: { email: mail("carol") } })).status, 200);
      const rows = await sql`SELECT 1 FROM newsletter_subscribers WHERE email = ${mail("carol")}`;
      assert.equal(rows.length, 0);
    });
    test("suppression du compte : mot de passe exigé", async () => {
      assert.equal((await carol("/api/auth/account", { method: "DELETE", body: { password: "faux" } })).status, 400);
    });
    test("suppression du compte (droit à l'effacement) : commande conservée mais détachée", async () => {
      assert.equal((await carol("/api/auth/account", { method: "DELETE", body: { password: PASSWORD } })).status, 200);
      assert.equal((await carol("/api/auth/me")).data.user, null);
      assert.equal((await sql`SELECT 1 FROM users WHERE email = ${mail("carol")}`).length, 0);
      const [order] = await sql`SELECT user_id FROM orders WHERE email = ${mail("carol")}`;
      assert.equal(order.user_id, null);
    });
  });
});
