import { useRef, useState } from "react";
import { Check, Zap, ShieldCheck, Timer } from "lucide-react";
import { TIER_LIMITS, BANK_PRESETS } from "../lib/constants";
import { api } from "../lib/api";
import { haptic } from "../lib/haptics";
import { Button } from "./ui/Button";
import { BankBadge, styleForAccountCard } from "./AccountCardStack";

// Présentation à la première connexion, dans la D.A : quatre écrans courts qu'on peut passer à
// tout moment. On montre la valeur, on règle la seule chose utile tout de suite (la banque du compte,
// pour la carte de l'accueil), on présente le Raccourci, puis le palier (gratuit par défaut).
// Remplace la visite guidée sur fond grisé et le questionnaire de cinq questions.
const STEPS = ["bienvenue", "banque", "raccourci", "palier"];
const TIERS = ["amateur", "confirme", "investisseur"];
const TIER_PITCH = {
  amateur: "1 compte, 1 objectif, l'essentiel",
  confirme: "5 comptes, couleurs et règles auto",
  investisseur: "Tout illimité, export complet",
};

function StepWelcome() {
  // Trois cartes qui se déploient : la pile de l'accueil, en aperçu.
  const cards = [
    { bankId: "boursorama", label: "pro" },
    { bankId: "societe-generale", label: "courant" },
    { key: "Tous", label: "Patrimoine" },
  ];
  return (
    <>
      <div className="fin-ob-cards" aria-hidden="true">
        {cards.map((c, i) => {
          const st = styleForAccountCard({ key: c.key || c.bankId, bankId: c.bankId }, BANK_PRESETS, "dark");
          return (
            <div key={c.label} className="fin-ob-card" style={{ background: st.background, color: st.text, "--i": i }}>
              <span style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>{c.label}</span>
              {i === 2 ? <span className="ds-tabular fin-ob-card__amount">3 810 €</span> : null}
            </div>
          );
        })}
      </div>
      <h1 className="fin-ob-title">Tes dépenses, <span className="fin-strong-word">en clair</span></h1>
      <p className="fin-sub-serif fin-ob-sub">Ce que tu dépenses, où, et ce qu'il te reste.</p>
      <ul className="fin-ob-points">
        <li><Timer size={18} aria-hidden="true" /> Une dépense en trois secondes</li>
        <li><ShieldCheck size={18} aria-hidden="true" /> Aucune connexion à ta banque</li>
        <li><Zap size={18} aria-hidden="true" /> Un Raccourci iOS pour aller plus vite</li>
      </ul>
    </>
  );
}

function StepBank({ account, onPick }) {
  const current = account?.bank_id || null;
  return (
    <>
      <h1 className="fin-ob-title">Ta <span className="fin-strong-word">banque</span></h1>
      <p className="fin-sub-serif fin-ob-sub">Ta carte prend ses couleurs sur l'accueil. Jamais de logo, jamais de connexion.</p>
      <div className="fin-ob-preview">
        <BankBadge bankId={current} bankPresets={BANK_PRESETS} width={64} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 17 }}>{account?.name || "Compte courant"}</div>
          <div className="fin-mrow__sub">{BANK_PRESETS.find((b) => b.id === current)?.name || "Choisis ta banque"}</div>
        </div>
      </div>
      <div className="fin-ob-banks" role="listbox" aria-label="Banque">
        {BANK_PRESETS.map((b) => (
          <button key={b.id} type="button" role="option" aria-selected={current === b.id} className="fin-ob-bank" onClick={() => onPick(b.id)}>
            <BankBadge bankId={b.id} bankPresets={BANK_PRESETS} width={44} />
            <span>{b.name}</span>
            {current === b.id ? <Check size={16} className="fin-ob-bank__check" aria-hidden="true" /> : null}
          </button>
        ))}
      </div>
      <p className="fin-ob-note">Livrets, compte pro : tu les ajouteras dans Réglages → Comptes.</p>
    </>
  );
}

function StepShortcut() {
  return (
    <>
      {/* Démonstration : une notification « dépense ajoutée » descend, comme quand le Raccourci tourne. */}
      <div className="fin-ob-phone" aria-hidden="true">
        <div className="fin-ob-clock ds-tabular">9:41</div>
        <div className="fin-ob-notif">
          <span className="fin-ob-notif__icon"><Zap size={16} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Finelio</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>Dépense de <span className="ds-tabular" style={{ fontWeight: 700, color: "var(--text-primary)" }}>12,50 €</span> ajoutée · Café</div>
          </div>
        </div>
      </div>
      <h1 className="fin-ob-title">Sans même <span className="fin-strong-word">ouvrir l'app</span></h1>
      <p className="fin-sub-serif fin-ob-sub">Depuis l'écran d'accueil, Siri, ou deux tapes au dos de l'iPhone.</p>
      <ol className="fin-ob-steps">
        <li><span>1</span> Crée ta clé personnelle</li>
        <li><span>2</span> Installe le Raccourci</li>
        <li><span>3</span> Colle ta clé, c'est prêt</li>
      </ol>
    </>
  );
}

function StepTier({ tier, onPick, error }) {
  return (
    <>
      <h1 className="fin-ob-title">Ton <span className="fin-strong-word">palier</span></h1>
      <p className="fin-sub-serif fin-ob-sub">Commence gratuitement. Tu changes quand tu veux, dans Réglages.</p>
      <div className="fin-ob-tiers" role="radiogroup" aria-label="Palier">
        {TIERS.map((key) => {
          const t = TIER_LIMITS[key];
          const on = tier === key;
          return (
            <button key={key} type="button" role="radio" aria-checked={on} className="fin-ob-tier" onClick={() => onPick(key)}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>{t.label}</div>
                <div className="fin-mrow__sub">{TIER_PITCH[key]}</div>
              </div>
              <div className="ds-tabular" style={{ fontWeight: 800, whiteSpace: "nowrap" }}>{t.price === 0 ? "Gratuit" : `${t.price.toFixed(2).replace(".", ",")} €`}<span style={{ fontWeight: 500, color: "var(--text-tertiary)", fontSize: 13 }}>{t.price === 0 ? "" : " / mois"}</span></div>
            </button>
          );
        })}
      </div>
      {error ? <div className="fin-error" role="alert">{error}</div> : null}
    </>
  );
}

export function Onboarding({ account, onChangeAccountBank, onDone }) {
  const [step, setStep] = useState(0);
  const [tier, setTier] = useState("amateur");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirRef = useRef("push");
  const name = STEPS[step];
  const last = step === STEPS.length - 1;

  function go(next) {
    dirRef.current = next > step ? "push" : "pop";
    haptic("light");
    setStep(next);
  }

  async function finish(action) {
    if (tier === "amateur" || action === "skip") { onDone(action === "skip" ? "done" : action); return; }
    setBusy(true); setError("");
    try {
      const { url } = await api("/api/billing/checkout", { method: "POST", body: { tier } });
      onDone("done"); // la présentation est terminée ; le paiement Stripe n'est qu'une étape suivante
      window.location.href = url;
    } catch (e) { setError(e.message); setBusy(false); }
  }

  const primary = {
    bienvenue: { label: "Commencer", onClick: () => go(1) },
    banque: { label: account?.bank_id ? "Continuer" : "Plus tard", onClick: () => go(2) },
    raccourci: { label: "Je le configurerai plus tard", onClick: () => go(3), variant: "secondary" },
    palier: { label: tier === "amateur" ? "Commencer gratuitement" : `Choisir ${TIER_LIMITS[tier].label}`, onClick: () => finish("done") },
  }[name];

  return (
    <div className="fin-ob" role="dialog" aria-modal="true" aria-label="Bienvenue dans Finelio">
      <div className="fin-backdrop" aria-hidden="true" />
      <header className="fin-ob-head">
        <div className="fin-ob-progress" aria-label={`Étape ${step + 1} sur ${STEPS.length}`}>
          {STEPS.map((s, i) => <span key={s} className={i <= step ? "is-on" : ""} />)}
        </div>
        {!last ? <button type="button" className="fin-ob-skip" onClick={() => finish("skip")}>Passer</button> : null}
      </header>

      <main key={name} className={`fin-ob-body fin-screen-enter fin-screen-enter--${step === 0 && dirRef.current === "push" ? "tab" : dirRef.current}`}>
        {name === "bienvenue" && <StepWelcome />}
        {name === "banque" && <StepBank account={account} onPick={(id) => { haptic("light"); onChangeAccountBank(account.id, id); }} />}
        {name === "raccourci" && <StepShortcut />}
        {name === "palier" && <StepTier tier={tier} onPick={(t) => { haptic("light"); setTier(t); }} error={error} />}
      </main>

      <footer className="fin-ob-foot">
        {name === "raccourci" ? (
          <Button variant="primary" block onClick={() => onDone("shortcut")}>Configurer le Raccourci</Button>
        ) : null}
        <Button variant={primary.variant || "primary"} block loading={busy} onClick={primary.onClick}>{primary.label}</Button>
        {step > 0 ? <button type="button" className="fin-ob-back" onClick={() => go(step - 1)}>Retour</button> : <span className="fin-ob-back" aria-hidden="true" />}
      </footer>
    </div>
  );
}
