// Tests unitaires : fonctions pures et middlewares, sans base de données.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { hashPassword, verifyPassword } from "../server/auth.js";
import { anonymizeIp, rateLimit, sameOriginOnly } from "../server/security.js";
import { PRODUCTS, CATEGORIES } from "../src/data/catalog.js";
import { euros, timeAgo } from "../src/lib/api.js";

// Simule req/res Express pour tester un middleware isolément.
function runMiddleware(mw, req) {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
  let nextCalled = false;
  mw(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

describe("Mots de passe (scrypt)", () => {
  test("un mot de passe correct est vérifié", async () => {
    const hash = await hashPassword("motdepasse-solide");
    assert.ok(await verifyPassword("motdepasse-solide", hash));
  });

  test("un mauvais mot de passe est refusé", async () => {
    const hash = await hashPassword("motdepasse-solide");
    assert.equal(await verifyPassword("autre-chose", hash), false);
  });

  test("le hash est salé : deux hash du même mot de passe diffèrent", async () => {
    const [a, b] = await Promise.all([hashPassword("identique"), hashPassword("identique")]);
    assert.notEqual(a, b);
    assert.match(a, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  });

  test("le mot de passe n'apparaît jamais en clair dans le hash", async () => {
    const hash = await hashPassword("SecretVisible123");
    assert.equal(hash.includes("SecretVisible123"), false);
  });
});

describe("Anonymisation des adresses IP (RGPD)", () => {
  test("IPv4 : dernier octet supprimé", () => assert.equal(anonymizeIp("192.168.12.34"), "192.168.12.0"));
  test("IPv4 encapsulée en IPv6", () => assert.equal(anonymizeIp("::ffff:10.0.0.7"), "10.0.0.0"));
  test("IPv6 : seuls les 3 premiers groupes sont gardés", () =>
    assert.equal(anonymizeIp("2a01:cb00:1234:5678:9abc:def0:1:2"), "2a01:cb00:1234::"));
  test("adresse absente", () => assert.equal(anonymizeIp(undefined), null));
});

describe("Limitation du nombre de requêtes", () => {
  test("bloque au-delà du maximum avec un code 429", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 2 });
    const req = { ip: "203.0.113.1" };
    assert.ok(runMiddleware(limiter, req).nextCalled);
    assert.ok(runMiddleware(limiter, req).nextCalled);
    const third = runMiddleware(limiter, req);
    assert.equal(third.nextCalled, false);
    assert.equal(third.res.statusCode, 429);
    assert.ok(third.res.headers["Retry-After"]);
  });

  test("compte chaque adresse IP séparément", () => {
    const limiter = rateLimit({ windowMs: 60_000, max: 1 });
    assert.ok(runMiddleware(limiter, { ip: "203.0.113.2" }).nextCalled);
    assert.ok(runMiddleware(limiter, { ip: "203.0.113.3" }).nextCalled);
  });
});

describe("Protection CSRF (vérification de l'origine)", () => {
  const post = (origin) => ({ method: "POST", headers: { host: "garde-robe-pi.vercel.app", ...(origin && { origin }) } });

  test("refuse un POST venant d'un autre site", () => {
    const { res, nextCalled } = runMiddleware(sameOriginOnly, post("https://site-malveillant.example"));
    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 403);
  });
  test("accepte un POST venant du site lui-même", () =>
    assert.ok(runMiddleware(sameOriginOnly, post("https://garde-robe-pi.vercel.app")).nextCalled));
  test("laisse passer les lectures (GET)", () =>
    assert.ok(runMiddleware(sameOriginOnly, { method: "GET", headers: { origin: "https://autre.example", host: "x" } }).nextCalled));
});

describe("Catalogue", () => {
  test("82 produits répartis dans 7 catégories", () => {
    assert.equal(PRODUCTS.length, 82);
    assert.equal(CATEGORIES.length, 7);
    assert.ok(PRODUCTS.every((p) => CATEGORIES.includes(p.category)));
  });
  test("identifiants uniques et prix positifs", () => {
    assert.equal(new Set(PRODUCTS.map((p) => p.id)).size, PRODUCTS.length);
    assert.ok(PRODUCTS.every((p) => p.price > 0));
  });
  test("chaque image existe sur le disque au format WebP", () => {
    for (const p of PRODUCTS) {
      assert.match(p.image, /\.webp$/);
      assert.ok(existsSync(new URL(`../public${p.image}`, import.meta.url)), `image manquante : ${p.image}`);
    }
  });
});

describe("Formatage", () => {
  test("montants en euros à la française", () => assert.equal(euros(1240).replace(/\s/g, " "), "1 240 €"));
  test("durées relatives", () => {
    assert.equal(timeAgo(new Date()), "à l'instant");
    assert.equal(timeAgo(new Date(Date.now() - 5 * 60_000)), "il y a 5 min");
    assert.equal(timeAgo(null), "jamais");
  });
});
