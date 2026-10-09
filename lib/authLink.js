// Lecture du lien sur lequel l'utilisateur a cliqué dans son email (réinitialisation de mot de passe).
//
// supabase-js lit le fragment d'URL (#access_token=...&type=recovery) tout seul, puis l'EFFACE de la
// barre d'adresse — mais seulement après un appel réseau (vérifié dans auth-js 2.116). Ce module est
// évalué à l'import, bien avant, donc il voit encore le fragment. Il doit rester importé en premier
// dans pages/index.js.
export function parseAuthHash(hash) {
  const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  return {
    isRecovery: params.get("type") === "recovery" && !!params.get("access_token"),
    // Lien expiré, déjà utilisé, ou invalide : Supabase renvoie error / error_code dans le fragment.
    hasError: params.has("error") || params.has("error_code"),
    errorCode: params.get("error_code") || "",
  };
}

const parsed = parseAuthHash(typeof window !== "undefined" ? window.location.hash : "");
export const RECOVERY_LINK = parsed.isRecovery;
export const LINK_ERROR = parsed.hasError
  ? { kind: "link", text: "Ce lien a expiré ou a déjà été utilisé. Demande-en un nouveau.", detail: parsed.errorCode ? `Code : ${parsed.errorCode}` : "" }
  : null;
