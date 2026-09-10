import { useState } from "react";
import { supabaseClient } from "../lib/supabaseClient";
import { Card } from "./ui/Primitives";
import { fieldInputStyle } from "./ui/Sheets";

export function AuthScreen() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error: err } = await supabaseClient.auth.signUp({ email, password });
        if (err) throw err;
        setInfo("Compte créé. Si une confirmation par email est activée, vérifie ta boîte de réception avant de te connecter.");
        setMode("login");
      } else {
        const { error: err } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) {
      setError(err.message === "Invalid login credentials" ? "Email ou mot de passe incorrect." : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ background: "var(--surface-base)", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--gutter-screen)", fontFamily: "var(--font-core)" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <div style={{ font: "600 28px var(--font-display)", color: "var(--text-primary)" }}>Cap Finances</div>
          <div style={{ color: "var(--text-tertiary)", fontSize: 14, marginTop: 4 }}>Suivi de dépenses</div>
        </div>

        <Card depth="raised-lg" padding="lg" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div style={{ display: "flex", gap: "var(--space-1)", padding: "var(--space-1)", borderRadius: "var(--radius-control)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)" }}>
            {["login", "signup"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(""); setInfo(""); }}
                style={{ flex: 1, height: 36, border: "none", borderRadius: "var(--radius-sm)", background: mode === m ? "var(--surface-highlight)" : "transparent", boxShadow: mode === m ? "var(--elev-raised-sm)" : "none", color: mode === m ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: mode === m ? 600 : 500, fontSize: 14, cursor: "pointer" }}
              >
                {m === "login" ? "Se connecter" : "Créer un compte"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={fieldInputStyle} />
            <input type="password" required autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} style={fieldInputStyle} minLength={6} />

            {error && <div style={{ color: "var(--red)", fontSize: 13 }}>{error}</div>}
            {info && <div style={{ color: "var(--green)", fontSize: 13 }}>{info}</div>}

            <button type="submit" disabled={busy} style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1, boxShadow: "var(--elev-raised-sm)" }}>
              {busy ? "…" : mode === "signup" ? "Créer mon compte" : "Se connecter"}
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
