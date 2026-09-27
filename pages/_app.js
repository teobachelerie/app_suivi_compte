import { useEffect } from "react";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    // Sur certaines versions de Safari en PWA plein écran, 100dvh seul ne suffit pas toujours à
    // couvrir le vrai bas de l'écran (bug connu, indépendant de notre code). window.innerHeight
    // reflète la hauteur réellement utilisable, mesurée à chaque changement d'orientation ou de
    // barre d'interface — on l'expose en variable CSS que le fond/le halo utilisent en repli.
    function setAppHeight() {
      document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
    }
    setAppHeight();
    window.addEventListener("resize", setAppHeight);
    window.addEventListener("orientationchange", setAppHeight);
    return () => {
      window.removeEventListener("resize", setAppHeight);
      window.removeEventListener("orientationchange", setAppHeight);
    };
  }, []);

  return <Component {...pageProps} />;
}
