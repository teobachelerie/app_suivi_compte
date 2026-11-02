import { useEffect, useState } from "react";
import { markIntroDone } from "../lib/intro";

// Animation de lancement, dans la D.A : « Finelio » monte lettre par lettre en Inter Black, « en
// clair » arrive en serif italique dégradé, un trait orange se dessine dessous (l'équivalent de la comète
// de la vidéo de référence), puis le tout s'efface sur l'accueil. 1,3 s au total, une fois par
// ouverture de l'app (sessionStorage : préférence cosmétique, rien de critique si Safari l'efface).
// Animations réduites : pas d'intro du tout.
const SEEN_KEY = "finelio-intro-seen";
const TOTAL_MS = 1300;
const WORD = "Finelio";

// Décidé une seule fois par chargement de page : React relance les effets en mode strict
// (développement), et un second passage aurait lu « déjà vue » et sauté l'intro.
let shouldPlay = null;
function decide() {
  if (shouldPlay !== null) return shouldPlay;
  let seen = false;
  try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; sessionStorage.setItem(SEEN_KEY, "1"); } catch {}
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  shouldPlay = !seen && !reduce;
  return shouldPlay;
}

export function LaunchIntro() {
  const [phase, setPhase] = useState("pending"); // pending → playing → leaving → gone

  useEffect(() => {
    if (!decide()) { setPhase("gone"); markIntroDone(); return undefined; }
    setPhase("playing");
    const leave = setTimeout(() => setPhase("leaving"), TOTAL_MS - 350);
    // Les compteurs démarrent pendant le fondu de sortie : ils comptent quand l'accueil apparaît.
    const done = setTimeout(() => markIntroDone(), TOTAL_MS - 300);
    const gone = setTimeout(() => setPhase("gone"), TOTAL_MS);
    return () => { clearTimeout(leave); clearTimeout(done); clearTimeout(gone); };
  }, []);

  if (phase === "gone") return null;
  // Avant le premier effet (rendu serveur, première image) : fond plein, pour ne pas laisser voir
  // l'app une fraction de seconde avant l'intro.
  return (
    <div className={`fin-intro${phase === "leaving" ? " is-leaving" : ""}`} aria-hidden="true">
      <div className="fin-backdrop" />
      {phase !== "pending" && (
        <div className="fin-intro__mark">
          <div className="fin-intro__word">
            {WORD.split("").map((ch, i) => (
              <span key={i} style={{ animationDelay: `${i * 40}ms` }}>{ch}</span>
            ))}
          </div>
          <div className="fin-intro__tag">
            <span className="fin-strong-word">en clair</span>
            <svg className="fin-intro__stroke" viewBox="0 0 160 14" preserveAspectRatio="none">
              <defs>
                <linearGradient id="fin-intro-grad" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#EE7B26" />
                  <stop offset="1" stopColor="#B8541F" />
                </linearGradient>
              </defs>
              <path d="M3 9 C 40 3, 90 3, 157 7" fill="none" stroke="url(#fin-intro-grad)" strokeWidth="3.5" strokeLinecap="round" pathLength="1" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
