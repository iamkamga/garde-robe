import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "../lib/api.js";

const INK = "#22201D";
const IVORY = "#F5F2ED";
const MUTED = "#6E6A5F";
const LINE = "#DEDACF";

// Informations du responsable de traitement : à compléter avec les données réelles de la boutique.
const CONTROLLER = {
  name: "Garde-Robe — [À COMPLÉTER : raison sociale / nom du gérant]",
  address: "[À COMPLÉTER : adresse postale]",
  email: "[À COMPLÉTER : email de contact]",
};

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl" style={{ color: INK }}>{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed" style={{ color: "#4A463D" }}>{children}</div>
    </section>
  );
}

function Unsubscribe() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault();
    try {
      await api("/newsletter/unsubscribe", { method: "POST", body: { email } });
      setMessage("C'est fait : cette adresse ne recevra plus la newsletter.");
    } catch (err) {
      setMessage(err.message);
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 mt-2">
      <input
        type="email"
        required
        aria-label="Email à désinscrire"
        placeholder="Votre email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 min-w-[200px] text-sm px-3 py-2 border bg-white focus:outline-none"
        style={{ borderColor: LINE }}
      />
      <button className="text-sm px-4 py-2" style={{ backgroundColor: INK, color: IVORY }}>Me désinscrire</button>
      {message && <p className="w-full text-sm" style={{ color: INK }}>{message}</p>}
    </form>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen font-body" style={{ backgroundColor: IVORY, color: INK }}>
      <header className="border-b" style={{ borderColor: LINE }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <a href="#/" className="font-display text-xl tracking-tight" style={{ color: INK }}>Garde-Robe</a>
          <a href="#/" className="inline-flex items-center gap-1.5 text-sm" style={{ color: MUTED }}>
            <ArrowLeft size={16} /> Retour à la boutique
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 md:px-8 py-14">
        <h1 className="font-display text-3xl" style={{ color: INK }}>Politique de confidentialité</h1>
        <p className="text-sm mt-2" style={{ color: MUTED }}>Dernière mise à jour : 15 octobre 2026</p>

        <Section title="Qui est responsable de vos données ?">
          <p>{CONTROLLER.name}, {CONTROLLER.address}. Contact : {CONTROLLER.email}.</p>
        </Section>

        <Section title="Quelles données et pourquoi ?">
          <p>Nous ne collectons que ce qui est nécessaire :</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Compte client</strong> : nom, email, mot de passe (stocké uniquement sous forme chiffrée irréversible). Base légale : exécution du contrat.</li>
            <li><strong>Commandes</strong> : articles, montants, email. Base légale : exécution du contrat et obligations comptables.</li>
            <li><strong>Newsletter</strong> : email, uniquement si vous cochez la case prévue. Base légale : votre consentement.</li>
            <li><strong>Sécurité</strong> : sessions de connexion (navigateur utilisé, adresse IP tronquée) et journal des connexions. Base légale : intérêt légitime (protéger votre compte).</li>
          </ul>
          <p>Aucune donnée bancaire n'est collectée, aucune donnée n'est vendue ni utilisée à des fins publicitaires.</p>
        </Section>

        <Section title="Combien de temps ?">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Compte : jusqu'à sa suppression (vous pouvez le supprimer vous-même depuis « Mon compte »).</li>
            <li>Sessions de connexion : 30 jours maximum.</li>
            <li>Journal d'activité : 12 mois, puis suppression automatique.</li>
            <li>Commandes : 10 ans (obligation légale de conservation des pièces comptables).</li>
            <li>Newsletter : jusqu'à votre désinscription.</li>
          </ul>
        </Section>

        <Section title="Cookies et stockage local">
          <p>
            Le site utilise <strong>un seul cookie</strong>, strictement nécessaire : <code>gr_session</code>, qui vous garde connecté
            (sécurisé, inaccessible aux scripts, 30 jours). Votre panier est conservé dans votre navigateur. Il n'y a
            <strong> aucun cookie publicitaire ni outil de mesure d'audience</strong> : aucun bandeau de consentement n'est donc nécessaire.
          </p>
          <p>Les polices d'écriture sont hébergées sur nos serveurs : aucune donnée n'est transmise à Google ou à un tiers lors de votre visite.</p>
        </Section>

        <Section title="Où sont hébergées vos données ?">
          <p>
            Base de données : Neon (infrastructure AWS, Francfort, Union européenne). Site et API : Vercel Inc. (région de calcul
            Francfort ; société américaine adhérant au Data Privacy Framework UE–États-Unis). Les échanges sont chiffrés (HTTPS).
          </p>
        </Section>

        <Section title="Vos droits">
          <p>
            Vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité, de limitation et d'opposition.
            Depuis « Mon compte », vous pouvez <strong>télécharger toutes vos données</strong> et <strong>supprimer votre compte</strong> en
            autonomie. Pour toute autre demande : {CONTROLLER.email}.
          </p>
          <p>
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez adresser une réclamation à la CNIL (www.cnil.fr).
          </p>
        </Section>

        <Section title="Se désinscrire de la newsletter">
          <Unsubscribe />
        </Section>
      </main>
    </div>
  );
}
