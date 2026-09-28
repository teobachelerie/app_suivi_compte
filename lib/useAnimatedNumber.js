import { useEffect, useRef, useState } from "react";

// Fait défiler un nombre de sa valeur affichée vers la nouvelle valeur (ease-out), plutôt que de
// le faire sauter d'un coup. Repart de la valeur réellement affichée si la cible change en cours de
// route (pas de saut brutal), et saute directement à la cible si l'utilisateur a demandé de
// réduire les animations dans les réglages de son téléphone.
export function useAnimatedNumber(target, duration = 500) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !Number.isFinite(target)) {
      fromRef.current = target;
      setValue(target);
      return undefined;
    }
    const from = fromRef.current;
    if (from === target) return undefined;
    // Le départ est pris sur l'horodatage de la première image (et non sur performance.now()) : on
    // n'utilise ainsi que l'horloge de requestAnimationFrame, cohérente avec elle-même par construction.
    let startTs = null;
    function tick(now) {
      if (startTs === null) startTs = now;
      const t = Math.min(1, Math.max(0, (now - startTs) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      const next = t >= 1 ? target : from + (target - from) * eased;
      fromRef.current = next;
      setValue(next);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}
