import { useEffect } from "react";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  // Safari iOS n'applique :active que si un écouteur touchstart existe dans la page. Sans lui,
  // tout le retour à l'appui (boutons, touches, puces) défini en CSS reste invisible sur iPhone.
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });
    return () => document.removeEventListener("touchstart", noop);
  }, []);
  return <Component {...pageProps} />;
}
