import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

const DURATION = 420; // ms : défilement et déplacement de la découpe, ensemble
const ease = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

export function Tutorial({ onClose }) {
  const [step, setStep] = useState(0);
  const [cardRect, setCardRect] = useState(null); // position finale de la cible : place la carte
  const holeRef = useRef(null);
  const holeRectRef = useRef(null); // position affichée de la découpe, à l'image près
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  function paintHole(r) {
    holeRectRef.current = r;
    const h = holeRef.current;
    if (!h || !r) return;
    h.style.top = `${r.top}px`; h.style.left = `${r.left}px`;
    h.style.width = `${r.width}px`; h.style.height = `${r.height}px`;
    h.style.borderRadius = `${r.radius}px`;
    h.style.opacity = "1";
  }

  // Changement d'étape : le tutoriel fait défiler la page lui-même, image par image, et recalcule la
  // découpe sur la position réelle de la cible à chaque image. Elle reste donc collée à l'élément
  // pendant tout le mouvement (avant : défilement du navigateur d'un côté, mesure à 380 ms de
  // l'autre, d'où un décalage visible). La carte est placée d'emblée à la position finale.
  useLayoutEffect(() => {
    const el = document.querySelector(s.target);
    if (!el) { setCardRect(null); return undefined; }
    const scroller = document.getElementById("__next");
    const fixed = getComputedStyle(el).position === "fixed" || el.closest("nav");
    const startScroll = scroller ? scroller.scrollTop : 0;
    let endScroll = startScroll;
    if (!fixed && scroller) {
      const r = el.getBoundingClientRect();
      const wanted = startScroll + r.top + r.height / 2 - window.innerHeight * 0.42;
      endScroll = Math.max(0, Math.min(wanted, scroller.scrollHeight - scroller.clientHeight));
    }
    const now = measure(s.target);
    const final = now && { ...now, top: now.top - (endScroll - startScroll) };
    setCardRect(final);

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const from = holeRectRef.current; // null à la première étape : la découpe suit alors la cible telle quelle
    if (reduce || !final) {
      if (scroller) scroller.scrollTop = endScroll;
      paintHole(measure(s.target));
      return undefined;
    }
    let raf = 0;
    let t0 = null;
    const frame = (ts) => {
      if (t0 === null) t0 = ts;
      const k = ease(Math.min(1, (ts - t0) / DURATION));
      if (scroller && endScroll !== startScroll) scroller.scrollTop = lerp(startScroll, endScroll, k);
      const live = measure(s.target);
      if (live) paintHole(from ? { top: lerp(from.top, live.top, k), left: lerp(from.left, live.left, k), width: lerp(from.width, live.width, k), height: lerp(from.height, live.height, k), radius: lerp(from.radius, live.radius, k) } : live);
      if (k < 1) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onResize = () => { const r = measure(s.target); paintHole(r); setCardRect(r); };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, [s.target]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const rect = cardRect;
  const below = !rect || rect.top + rect.height < vh * 0.55;
  const cardStyle = rect
    ? below ? { top: Math.min(rect.top + rect.height + 12, vh - 230) } : { bottom: Math.max(vh - rect.top + 12, 16) }
    : { top: "40%" };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fin-tuto" role="dialog" aria-modal="true" aria-label="Tutoriel">
      {/* Voile avec une découpe autour de la cible ; toucher le voile ne fait rien (on choisit Suivant ou Arrêter). */}
      <div className="fin-tuto__veil" />
      {/* Positionnée image par image depuis l'effet (style direct, sans rendu React à chaque image). */}
      <div ref={holeRef} className="fin-tuto__hole" style={{ opacity: 0 }} />
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
