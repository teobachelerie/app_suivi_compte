import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Feuille du bas : entrée et sortie animées (tokens de durée), fermeture par le fond, la croix,
// Échap ou un glissé vers le bas sur l'en-tête. Reste au-dessus du clavier iOS (visual viewport).
//
// Fermeture : tous les chemins passent par requestClose(), qui joue l'animation de sortie puis
// appelle onClose. Si l'utilisateur a demandé de réduire les animations, onClose est appelé tout
// de suite. Un enfant qui doit fermer la feuille (ex. choix d'une option) appelle useSheetClose().

const SheetCloseContext = createContext(null);
export const useSheetClose = () => useContext(SheetCloseContext);

// Feuilles ouvertes, de la plus ancienne à la plus récente : Échap ne ferme que la dernière.
const openSheets = [];
let scrollLocks = 0;

function lockPageScroll() {
  scrollLocks += 1;
  const scroller = document.getElementById("__next");
  if (scroller) scroller.style.overflowY = "hidden";
}
function unlockPageScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  const scroller = document.getElementById("__next");
  if (scroller && scrollLocks === 0) scroller.style.overflowY = "";
}
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// En dessous de ce seuil, l'écart entre la fenêtre et le viewport visuel n'est pas un clavier.
const KEYBOARD_MIN_INSET = 80;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 0.6; // px par ms

// `tall` : la feuille prend presque tout l'écran (listes longues, ex. choix de catégorie).
export function BottomSheet({ title, onClose, footer, zIndex = 50, tall = false, children }) {
  const rootRef = useRef(null);
  const panelRef = useRef(null);
  const scrimRef = useRef(null);
  const closingRef = useRef(false);
  const finishedRef = useRef(false);
  const dragRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [closing, setClosing] = useState(false);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onCloseRef.current?.();
  }, []);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    if (prefersReducedMotion()) { finish(); return; }
    setClosing(true);
    window.setTimeout(finish, 400); // filet de sécurité si animationend n'arrive pas
  }, [finish]);

  function handleAnimationEnd(e) {
    if (e.animationName === "fin-sheet-out" && e.target === panelRef.current) finish();
  }

  // Échap, blocage du défilement de la page, focus.
  useEffect(() => {
    const token = {};
    openSheets.push(token);
    const onKey = (e) => {
      if (e.key === "Escape" && openSheets[openSheets.length - 1] === token) requestClose();
    };
    document.addEventListener("keydown", onKey);
    lockPageScroll();
    const previouslyFocused = document.activeElement;
    panelRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = openSheets.indexOf(token);
      if (i > -1) openSheets.splice(i, 1);
      unlockPageScroll();
      if (previouslyFocused && typeof previouslyFocused.focus === "function") previouslyFocused.focus({ preventScroll: true });
    };
  }, [requestClose]);

  // Clavier iOS : la feuille remonte au-dessus du clavier et se raccourcit.
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return undefined;
    const update = () => {
      const root = rootRef.current;
      const panel = panelRef.current;
      if (!root || !panel) return;
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      if (inset > KEYBOARD_MIN_INSET) {
        root.style.paddingBottom = `${inset}px`;
        panel.style.maxHeight = `${Math.max(240, vv.height - 24)}px`;
      } else {
        root.style.paddingBottom = "";
        panel.style.maxHeight = "";
      }
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  // Glissé vers le bas sur l'en-tête (pas sur le contenu, pour ne pas gêner le défilement).
  function onPointerDown(e) {
    if (closingRef.current || e.target.closest("button")) return;
    dragRef.current = { startY: e.clientY, startT: performance.now(), dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    rootRef.current.classList.add("is-dragged"); // coupe l'animation d'entrée, qui écraserait le transform en ligne
    panelRef.current.style.transition = "none";
  }
  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    d.dy = Math.max(0, e.clientY - d.startY);
    panelRef.current.style.transform = `translateY(${d.dy}px)`;
  }
  function onPointerUp() {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    const panel = panelRef.current;
    const velocity = d.dy / Math.max(performance.now() - d.startT, 1);
    const ms = prefersReducedMotion() ? 0 : 200;
    if (d.dy > DISMISS_DISTANCE || (velocity > DISMISS_VELOCITY && d.dy > 30)) {
      closingRef.current = true;
      panel.style.transition = `transform ${ms}ms var(--ease-standard)`;
      panel.style.transform = "translateY(100%)";
      if (scrimRef.current) {
        scrimRef.current.style.animation = "none";
        scrimRef.current.style.transition = `opacity ${ms}ms var(--ease-standard)`;
        scrimRef.current.style.opacity = "0";
      }
      window.setTimeout(finish, ms + 10);
    } else {
      panel.style.transition = `transform ${ms}ms var(--ease-out)`;
      panel.style.transform = "translateY(0)";
      window.setTimeout(() => {
        panel.style.transition = "";
        panel.style.transform = "";
      }, ms + 10);
    }
  }

  // Rendue à la racine du document : à l'intérieur d'un parent animé (transformé), iOS laissait
  // une traînée floue en haut de l'écran après la fermeture.
  if (typeof document === "undefined") return null;
  return createPortal(
    <SheetCloseContext.Provider value={requestClose}>
      <div ref={rootRef} className={`fin-sheet-root${closing ? " is-closing" : ""}`} style={{ zIndex }} onAnimationEnd={handleAnimationEnd}>
        <div ref={scrimRef} className="fin-sheet-scrim" onClick={requestClose} />
        <div ref={panelRef} className={`fin-sheet-panel${tall ? " fin-sheet-panel--tall" : ""}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
          <div className="fin-sheet-head" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
            <div className="fin-sheet-grabber" />
            <div className="fin-sheet-title">
              <h2>{title}</h2>
              <button type="button" className="fin-sheet-close" aria-label="Fermer" onClick={requestClose}>
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="fin-sheet-body">{children}</div>
          {footer ? <div className="fin-sheet-foot">{footer}</div> : null}
        </div>
      </div>
    </SheetCloseContext.Provider>,
    document.body,
  );
}
