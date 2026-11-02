import { useEffect, useState } from "react";

// État partagé de l'animation de lancement : les compteurs de l'accueil attendent sa fin pour
// partir de 0 sous les yeux de l'utilisateur, au lieu de finir de compter derrière elle.
let done = false;
const listeners = new Set();

export function markIntroDone() {
  if (done) return;
  done = true;
  listeners.forEach((fn) => fn());
  listeners.clear();
}

export function useIntroDone() {
  const [isDone, setIsDone] = useState(done);
  useEffect(() => {
    if (done) { setIsDone(true); return undefined; }
    const fn = () => setIsDone(true);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  return isDone;
}
