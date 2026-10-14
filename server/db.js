import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.warn("⚠ DATABASE_URL manquant : copiez .env.example en .env et collez l'URL Neon.");
}

// Client HTTP Neon : chaque appel sql`...` est une requête paramétrée (pas d'injection SQL).
export const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
