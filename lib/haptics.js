// Retours haptiques discrets. Deux voies, aucune ne doit jamais faire échouer l'app :
//  - Android/Chrome : navigator.vibrate (jamais implémenté par Safari sur iPhone).
//  - iPhone (Safari 17.4+, iPhone 7 et suivants) : basculer un <input type="checkbox" switch> caché
//    déclenche le moteur haptique du système. C'est un contournement, pas une API officielle : il
//    peut cesser de fonctionner avec une future version d'iOS, d'où le try/catch partout.
// L'utilisateur peut tout désactiver dans Réglages → Affichage.

const STORAGE_KEY = "finelio-haptics";

export function isHapticsEnabled() {
  if (typeof window === "undefined") return true;
  try { return window.localStorage.getItem(STORAGE_KEY) !== "off"; } catch { return true; }
}

export function setHapticsEnabled(on) {
  try { window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off"); } catch { /* sans effet */ }
}

let switchLabel = null;

function getSwitchLabel() {
  if (typeof document === "undefined") return null;
  if (switchLabel && document.body.contains(switchLabel)) return switchLabel;
  const wrap = document.createElement("div");
  wrap.setAttribute("aria-hidden", "true");
  // Hors écran mais bien présent et rendu : un élément en display:none ne déclencherait rien.
  Object.assign(wrap.style, { position: "fixed", left: "-9999px", top: "0", width: "1px", height: "1px", opacity: "0", overflow: "hidden" });
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.id = "finelio-haptic-switch";
  input.tabIndex = -1;
  const label = document.createElement("label");
  label.htmlFor = input.id;
  wrap.appendChild(input);
  wrap.appendChild(label);
  document.body.appendChild(wrap);
  switchLabel = label;
  return label;
}

function tick() {
  const label = getSwitchLabel();
  if (label) label.click();
}

// Motifs : "light" (sélection, navigation), "medium" (changement d'état marquant),
// "success" (enregistrement, objectif atteint), "warning" (suppression, plafond dépassé).
const ANDROID_PATTERNS = { light: 8, medium: 16, success: [12, 45, 22], warning: [24, 45, 24] };
const IOS_TICKS = { light: 1, medium: 1, success: 2, warning: 2 };

export function haptic(kind = "light") {
  if (!isHapticsEnabled()) return;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ANDROID_PATTERNS[kind] ?? ANDROID_PATTERNS.light);
      return;
    }
    const n = IOS_TICKS[kind] ?? 1;
    tick();
    for (let i = 1; i < n; i++) setTimeout(() => { try { tick(); } catch { /* sans effet */ } }, i * 75);
  } catch { /* le retour haptique est un bonus, jamais une source d'erreur */ }
}
