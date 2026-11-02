import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { haptic } from "../lib/haptics";

// Tutoriel après la configuration : met en lumière les vrais éléments de l'accueil, un par un.
// « Arrêter » est visible à chaque étape (et la croix, et Échap) : on peut sortir à tout moment.
// Les cibles sont repérées par l'attribut data-tour (ou un sélecteur), pas par des refs passées à
// travers toute l'app. Relançable depuis Réglages.
const STEPS = [
  { target: '[data-tour="cartes"]', title: "Tes comptes", text: "Touche une carte pour afficher ce compte. Patrimoine regroupe tout." },
  { target: '[data-tour="periode"]', title: "La période", text: "Ce mois, 3 mois, 6 mois… Tous les montants de l'accueil suivent." },
  { target: '[data-tour="tuiles"]', title: "Revenus et dépenses", text: "Touche une tuile pour le détail, jour par jour, catégorie par catégorie." },
  { target: 'button[aria-label="Ajouter une opération"]', title: "Ajouter", text: "Une dépense, un revenu ou un virement, en trois secondes. C'est le bouton le plus utile." },
  { target: "nav .fin-glass", title: "Les onglets", text: "Activité pour chercher, Budgets pour tes plafonds, Réglages pour tes comptes et le Raccourci." },
];
const PAD = 8; // marge de lumière autour de l'élément

function measure(sel) {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  // La découpe reprend l'arrondi de l'élément (rond pour le bouton « + », carte pour le reste).
  const radius = Math.min((parseFloat(getComputedStyle(el).borderTopLeftRadius) || 16) + PAD, (r.height + PAD * 2) / 2);
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2, radius };
}

export function Tutorial({ onClose }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  // Amène la cible à l'écran (si elle n'est pas fixe), puis mesure une fois le défilement fini.
  useLayoutEffect(() => {
    const el = document.querySelector(s.target);
    if (!el) { setRect(null); return undefined; }
    const fixed = getComputedStyle(el).position === "fixed" || el.closest("nav");
    if (!fixed) el.scrollIntoView({ block: "center", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    setRect(measure(s.target));
    const t = setTimeout(() => setRect(measure(s.target)), 380);
    const onResize = () => setRect(measure(s.target));
    window.addEventListener("resize", onResize);
    return () => { clearTimeout(t); window.removeEventListener("resize", onResize); };
  }, [s.target]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function next() {
    haptic("light");
    if (last) onClose(); else setStep(step + 1);
  }

  // La carte d'explication se place sous la cible, ou au-dessus si la cible est dans le bas de l'écran.
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const below = !rect || rect.top + rect.height < vh * 0.55;
  const cardStyle = rect
    ? below ? { top: Math.min(rect.top + rect.height + 12, vh - 230) } : { bottom: Math.max(vh - rect.top + 12, 16) }
    : { top: "40%" };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fin-tuto" role="dialog" aria-modal="true" aria-label="Tutoriel">
      {/* Voile avec une découpe autour de la cible ; toucher le voile ne fait rien (on choisit Suivant ou Arrêter). */}
      <div className="fin-tuto__veil" />
      {rect ? <div className="fin-tuto__hole" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: rect.radius }} /> : null}
      <div key={step} className="fin-tuto__card" style={cardStyle}>
        <div className="fin-tuto__top">
          <span className="fin-tuto__count ds-tabular">{step + 1} / {STEPS.length}</span>
          <button type="button" className="fin-tuto__close" aria-label="Arrêter le tutoriel" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="fin-tuto__title">{s.title}</div>
        <p className="fin-tuto__text">{s.text}</p>
        <div className="fin-tuto__actions">
          <button type="button" className="fin-tuto__stop" onClick={onClose}>Arrêter</button>
          <div style={{ flex: 1 }} />
          {step > 0 ? <button type="button" className="fin-tuto__prev" onClick={() => setStep(step - 1)}>Précédent</button> : null}
          <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" onClick={next}>{last ? "Terminer" : "Suivant"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
