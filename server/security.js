// Protections transverses de l'API (Security by Design / Privacy by Design).

// En-têtes HTTP de sécurité sur toutes les réponses de l'API.
export function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  // Les réponses de l'API contiennent des données personnelles : jamais en cache.
  res.setHeader("Cache-Control", "no-store");
  next();
}

// Protection CSRF : une requête qui modifie des données doit venir du site lui-même.
// (complète le cookie SameSite=Lax ; les clients sans en-tête Origin, comme curl, ne sont pas des navigateurs)
export function sameOriginOnly(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin) {
    let host;
    try {
      host = new URL(origin).host;
    } catch {
      host = null;
    }
    if (host !== req.headers.host) {
      return res.status(403).json({ error: "Requête refusée (origine non autorisée)" });
    }
  }
  next();
}

// Limite de requêtes par adresse IP (fenêtre glissante, en mémoire).
export function rateLimit({ windowMs, max, message = "Trop de requêtes, réessayez dans un instant." }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    // Nettoyage occasionnel pour que la table ne grossisse pas indéfiniment.
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (now - v[v.length - 1] > windowMs) hits.delete(k);
    }
    if (recent.length > max) {
      res.setHeader("Retry-After", Math.ceil(windowMs / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}

// Minimisation des données : on ne conserve qu'une IP tronquée
// (IPv4 : dernier octet à 0 ; IPv6 : 3 premiers groupes), suffisante pour repérer un abus.
export function anonymizeIp(ip) {
  if (!ip) return null;
  const v4 = ip.replace(/^::ffff:/, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return v4.replace(/\.\d+$/, ".0");
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":") + "::";
  return null;
}
