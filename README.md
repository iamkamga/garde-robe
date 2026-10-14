# Garde-Robe

Boutique de vêtements en ligne (React + Tailwind CSS).

## Ouvrir dans Visual Studio Code

1. Dézippez `garde-robe.zip`.
2. Ouvrez le dossier `garde-robe` dans VS Code (`File > Open Folder`).
3. Dans le terminal intégré de VS Code :
   ```bash
   npm install
   npm run dev
   ```
4. Ouvrez l'adresse affichée dans le terminal (en général `http://localhost:5173`).

## Base de données (Neon) et API

- `.env` contient `DATABASE_URL` (ne jamais le partager ni le committer). Modèle : `.env.example`.
- `npm run dev` lance le site (port 5173) **et** l'API Express (port 3001).
- `npm run db:setup` crée/met à jour les tables et importe le catalogue de `src/data/catalog.js`.
- `npm run admin:create -- <email> <mot de passe> [nom]` crée un admin ou réinitialise son mot de passe.

## Comptes et administration

- Icône « compte » en haut à droite → `#/compte` : connexion, création de compte, commandes, mot de passe.
- `#/admin` : dashboard réservé aux admins (indicateurs, graphiques, utilisateurs, personnes connectées,
  commandes, newsletter, journal d'activité, export CSV, mode sombre, palette `Ctrl+K`, mise à jour en direct).

## Structure

- `src/App.jsx` — la boutique (catégories, panier, favoris, recherche)
- `src/pages/AccountPage.jsx` — connexion / inscription / mon compte
- `src/pages/admin/` — dashboard administrateur
- `server/` — API Express (`index.js`, `auth.js`, `admin.js`) et schéma SQL
- `src/main.jsx` — point d'entrée React
- `src/index.css` — imports Tailwind
- `tailwind.config.js` / `postcss.config.js` — configuration Tailwind
