// Petit client pour l'API : envoie/lit du JSON et lève une Error avec le message du serveur.
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || "Service indisponible, réessayez plus tard.");
    error.status = res.status;
    throw error;
  }
  return data;
}

export const euros = (n) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export const dateTime = (d) =>
  d ? new Date(d).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";

export function timeAgo(d) {
  if (!d) return "jamais";
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}
