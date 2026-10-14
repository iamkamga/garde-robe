// Crée un compte administrateur, ou le réinitialise s'il existe déjà.
// Usage : npm run admin:create -- <email> <mot de passe> [nom]
import { sql } from "./db.js";
import { hashPassword, logActivity, EMAIL_RE } from "./auth.js";

const [email, password, name = "Administrateur"] = process.argv.slice(2);
if (!sql) process.exit(1);
if (!EMAIL_RE.test(email ?? "") || !password || password.length < 12) {
  console.error("Usage : npm run admin:create -- <email> <mot de passe (12 caractères min.)> [nom]");
  process.exit(1);
}

const [user] = await sql`
  INSERT INTO users (name, email, password_hash, role)
  VALUES (${name}, ${email.toLowerCase()}, ${await hashPassword(password)}, 'admin')
  ON CONFLICT (email) DO UPDATE
    SET password_hash = EXCLUDED.password_hash, role = 'admin', active = TRUE
  RETURNING id, email
`;
await sql`DELETE FROM sessions WHERE user_id = ${user.id}`;
await logActivity(user.id, "compte admin créé / réinitialisé");
console.log(`✓ Administrateur prêt : ${user.email}`);
