// Traduit une erreur Supabase Auth en message lisible, SANS jamais perdre l'information réelle :
// `text` est ce qu'on montre en grand (français, actionnable), `detail` est le message/code brut
// de Supabase en petit, pour qu'une personne qui signale un problème puisse le recopier tel quel.
export function describeAuthError(err) {
  const code = err?.code || "";
  const message = String(err?.message || "");
  const low = message.toLowerCase();
  const raw = [message, code ? `(${code})` : ""].filter(Boolean).join(" ");

  if (code === "invalid_credentials" || low.includes("invalid login credentials")) {
    return { kind: "invalid", text: "Email ou mot de passe incorrect.", detail: "" };
  }
  if (code === "email_not_confirmed" || low.includes("email not confirmed")) {
    return { kind: "unconfirmed", text: "Ton email n'est pas encore confirmé. Ouvre le lien reçu par email (pense aux spams), ou demande un nouvel envoi.", detail: raw };
  }
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || err?.status === 429 || low.includes("rate limit")) {
    return { kind: "rate", text: "Trop de tentatives. Patiente quelques minutes avant de réessayer.", detail: raw };
  }
  if (code === "weak_password" || low.includes("password should be")) {
    return { kind: "weak", text: "Mot de passe trop faible. Choisis-en un plus long ou plus varié.", detail: raw };
  }
  if (code === "user_already_exists" || low.includes("already registered")) {
    return { kind: "exists", text: "Un compte existe déjà avec cet email. Connecte-toi.", detail: raw };
  }
  if (err?.name === "AuthRetryableFetchError" || low.includes("failed to fetch") || low.includes("network")) {
    return { kind: "network", text: "Impossible de joindre le serveur. Vérifie ta connexion internet.", detail: raw };
  }
  // Cas inconnu : on montre le message Supabase tel quel, jamais un texte générique qui le cache.
  return { kind: "other", text: message || "Une erreur est survenue.", detail: code ? `Code : ${code}` : "" };
}
