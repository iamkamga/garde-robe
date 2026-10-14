// Crée les tables puis importe le catalogue de src/data/catalog.js dans Neon.
// Usage : npm run db:setup  (sans risque si relancé : met à jour les produits existants)
import { readFileSync } from "node:fs";
import { sql } from "./db.js";
import { PRODUCTS } from "../src/data/catalog.js";

if (!sql) process.exit(1);

const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const statements = schema
  .split(";")
  .map((s) => s.replace(/--.*$/gm, "").trim())
  .filter(Boolean);
for (const statement of statements) {
  await sql.query(statement);
}
console.log(`✓ ${statements.length} instructions SQL appliquées`);

await sql.transaction(
  PRODUCTS.map((p) => sql`
    INSERT INTO products (id, category, name, price, image)
    VALUES (${p.id}, ${p.category}, ${p.name}, ${p.price}, ${p.image})
    ON CONFLICT (id) DO UPDATE
      SET category = EXCLUDED.category, name = EXCLUDED.name,
          price = EXCLUDED.price, image = EXCLUDED.image
  `)
);
console.log(`✓ ${PRODUCTS.length} produits importés`);
