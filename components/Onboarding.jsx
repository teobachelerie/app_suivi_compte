import { useState } from "react";
import { TIER_LIMITS } from "../lib/constants";
import { api } from "../lib/api";

const QUESTIONS = [
  {
    text: "Combien de comptes bancaires veux-tu suivre ?",
    options: [
      { label: "Un seul", points: 0 },
      { label: "2 à 4 (courant, pro, livrets…)", points: 1 },
      { label: "5 ou plus", points: 2 },
    ],
  },
  {
    text: "Combien d'objectifs d'épargne actifs en même temps ?",
    options: [
      { label: "Un seul", points: 0 },
      { label: "2 ou 3", points: 1 },
      { label: "4 ou plus", points: 2 },
    ],
  },
  {
    text: "À quelle fréquence exportes-tu tes données (CSV/Excel) ?",
    options: [
      { label: "Jamais", points: 0 },
      { label: "De temps en temps", points: 1 },
      { label: "Régulièrement", points: 2 },
    ],
  },
  {
    text: "Personnaliser finement tes catégories (couleurs, règles automatiques), c'est important pour toi ?",
    options: [
      { label: "Pas vraiment", points: 0 },
      { label: "Utile", points: 1 },
      { label: "Indispensable", points: 2 },
    ],
  },
  {
    text: "Comptes-tu partager le suivi avec des proches (colocation, famille) ?",
    options: [
      { label: "Non", points: 0 },
      { label: "Peut-être", points: 1 },
      { label: "Oui", points: 2 },
    ],
  },
];

function recommendTier(score) {
  if (score <= 3) return "amateur";
  if (score <= 7) return "confirme";
  return "investisseur";
}

export function Onboarding({ onDone }) {
  const [step, setStep] = useState(0); // 0..4 = questions, 5 = résultat + choix
  const [answers, setAnswers] = useState([]);
  const [choosing, setChoosing] = useState(false);
  const [tierError, setTierError] = useState("");

  const isResult = step === QUESTIONS.length;
  const score = answers.reduce((s, a) => s + a, 0);
  const recommended = recommendTier(score);

  function answer(points) {
    const next = [...answers, points];
    setAnswers(next);
    setStep((s) => s + 1);
  }

  async function chooseTier(tier) {
    if (tier === "amateur") { onDone(); return; }
    setChoosing(true); setTierError("");
    try {
      const { url } = await api("/api/billing/checkout", { method: "POST", body: { tier } });
      onDone(); // La visite est déjà terminée à ce stade — le paiement Stripe n'est qu'une étape suivante, pas une raison de la refaire au retour.
      window.location.href = url;
    } catch (e) { setTierError(e.message); setChoosing(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--surface-base)", zIndex: 100, display: "flex", flexDirection: "column", fontFamily: "var(--font-core)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "calc(env(safe-area-inset-top, 0px) + var(--space-4)) var(--gutter-screen) 0" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {!isResult && QUESTIONS.map((_, i) => (
            <span key={i} style={{ width: i === step ? 20 : 7, height: 7, borderRadius: "var(--radius-round)", background: i <= step ? "var(--accent-bg)" : "var(--grey-2)" }} />
          ))}
        </div>
        <button onClick={onDone} style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>Passer</button>
      </div>

      {!isResult ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 var(--gutter-screen)", gap: "var(--space-6)" }}>
          <div>
            <span style={{ font: "400 13px var(--font-core)", color: "var(--text-tertiary)", display: "block", marginBottom: 8 }}>QUESTION {step + 1} SUR {QUESTIONS.length}</span>
            <span style={{ font: "600 22px/1.35 var(--font-display)", color: "var(--text-primary)" }}>{QUESTIONS[step].text}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {QUESTIONS[step].options.map((o) => (
              <button
                key={o.label}
                onClick={() => answer(o.points)}
                style={{ textAlign: "left", background: "var(--surface-raised)", boxShadow: "var(--elev-raised-sm)", border: "none", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", cursor: "pointer", font: "500 16px var(--font-core)", color: "var(--text-primary)" }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 var(--gutter-screen)", gap: "var(--space-5)" }}>
          <div style={{ textAlign: "center", marginBottom: "var(--space-2)" }}>
            <span style={{ font: "600 22px var(--font-display)", color: "var(--text-primary)" }}>{TIER_LIMITS[recommended].label} te correspond</span>
            <div style={{ font: "400 14px var(--font-core)", color: "var(--text-secondary)", marginTop: 6 }}>D'après tes réponses. Tu pourras changer ça à tout moment dans Réglages → Abonnement.</div>
          </div>
          {tierError && <div style={{ color: "var(--red)", fontSize: 13, textAlign: "center" }}>{tierError}</div>}
          {["amateur", "confirme", "investisseur"].map((tierKey) => {
            const t = TIER_LIMITS[tierKey];
            const isRecommended = tierKey === recommended;
            return (
              <button
                key={tierKey}
                onClick={() => chooseTier(tierKey)}
                disabled={choosing}
                style={{
                  textAlign: "left", background: "var(--surface-raised)", boxShadow: isRecommended ? "var(--elev-raised)" : "var(--elev-raised-sm)",
                  border: isRecommended ? "2px solid var(--accent-bg)" : "2px solid transparent",
                  borderRadius: "var(--radius-lg)", padding: "var(--space-4)", cursor: "pointer", opacity: choosing ? 0.6 : 1, display: "flex", flexDirection: "column", gap: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <span style={{ font: "600 17px var(--font-core)", color: "var(--text-primary)" }}>{t.label}{isRecommended ? " · Recommandé" : ""}</span>
                  <span style={{ font: "600 15px var(--font-core)", color: "var(--text-secondary)" }}>{t.price === 0 ? "Gratuit" : `${t.price.toFixed(2).replace(".", ",")} €/mois`}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
