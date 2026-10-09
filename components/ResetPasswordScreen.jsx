import { useState } from "react";
import { supabaseClient } from "../lib/supabaseClient";
import { describeAuthError } from "../lib/authErrors";
import { Card } from "./ui/Primitives";
import { fieldInputStyle } from "./ui/Sheets";

// Affiché quand l'utilisateur arrive depuis le lien « mot de passe oublié » de son email : il est alors
// connecté par une session de récupération, et doit choisir un nouveau mot de passe. Le champ de
// confirmation évite qu'une faute de frappe le bloque de nouveau.
export function ResetPasswordScreen({ onDone, onCancel }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError({ text: "Le mot de passe doit faire au moins 6 caractères.", detail: "" }); return; }
    if (password !== confirm) { setError({ text: "Les deux mots de passe ne sont pas identiques.", detail: "" }); return; }
    setBusy(true);
    try {
      const { error: err } = await supabaseClient.auth.updateUser({ password });
      if (err) throw err;
      onDone();
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ background: "var(--surface-base)", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--gutter-screen)", fontFamily: "var(--font-core)" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <div style={{ font: "600 28px var(--font-display)", color: "var(--text-primary)" }}>Nouveau mot de passe</div>
          <div style={{ color: "var(--text-tertiary)", fontSize: 14, marginTop: 4 }}>Choisis-le deux fois pour éviter une faute de frappe.</div>
        </div>
        <Card depth="raised-lg" padding="lg" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <input type="password" required autoComplete="new-password" placeholder="Nouveau mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} style={fieldInputStyle} minLength={6} />
            <input type="password" required autoComplete="new-password" placeholder="Confirmer le mot de passe" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={fieldInputStyle} minLength={6} />
            {error && (
              <div role="alert" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ color: "var(--red)", fontSize: 13 }}>{error.text}</div>
                {error.detail && <div style={{ color: "var(--text-tertiary)", fontSize: 11, wordBreak: "break-word" }}>{error.detail}</div>}
              </div>
            )}
            <button type="submit" disabled={busy} style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1, boxShadow: "var(--elev-raised-sm)" }}>
              {busy ? "…" : "Enregistrer"}
            </button>
            <button type="button" onClick={onCancel} disabled={busy} style={{ background: "none", border: "none", padding: 0, color: "var(--text-tertiary)", fontSize: 13, cursor: "pointer" }}>
              Annuler
            </button>
          </form>
        </Card>
        <div style={{ color: "var(--text-tertiary)", fontSize: 12, textAlign: "center", marginTop: "var(--space-4)" }}>
          Si tu utilises Finelio installée sur ton écran d'accueil, reconnecte-toi ensuite dans l'app avec ce nouveau mot de passe.
        </div>
      </div>
    </div>
  );
}
