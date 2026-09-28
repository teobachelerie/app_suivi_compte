import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Sheet, Field, fieldInputStyle, fieldPickerStyle } from "./ui/Sheets";

// Feuille de création / modification d'un plafond mensuel. `budget` = plafond existant (la
// catégorie est alors figée, seul le montant change) ou null pour un nouveau plafond, auquel cas
// seules les familles qui n'en ont pas encore (`availableFamilies`) sont proposées.
export function BudgetSheet({ budget, availableFamilies, onClose, onSave, onDelete, saving }) {
  const [category, setCategory] = useState(budget?.category || availableFamilies[0] || "");
  const [limit, setLimit] = useState(budget ? String(budget.monthlyLimit) : "");
  const [error, setError] = useState("");
  const nothingToAdd = !budget && availableFamilies.length === 0;

  function handleSave() {
    const amount = parseFloat(String(limit).replace(",", "."));
    if (!category) { setError("Choisis une catégorie."); return; }
    if (!(amount > 0)) { setError("Indique un plafond supérieur à zéro."); return; }
    onSave({ category, monthlyLimit: amount });
  }

  return (
    <Sheet
      title={budget ? "Modifier le plafond" : "Nouveau plafond"}
      onClose={onClose}
      footer={
        <>
          {error && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            {onDelete && (
              <button onClick={onDelete} disabled={saving} aria-label="Supprimer le plafond" style={{ width: 48, height: 48, borderRadius: "var(--radius-control)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <Trash2 size={18} color="var(--red)" />
              </button>
            )}
            <button onClick={handleSave} disabled={saving || nothingToAdd} style={{ flex: 1, background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: saving || nothingToAdd ? 0.6 : 1 }}>
              {saving ? "Enregistrement…" : "Confirmer"}
            </button>
          </div>
        </>
      }
    >
      {nothingToAdd ? (
        <div style={{ fontSize: 14, color: "var(--text-tertiary)", padding: "8px 0" }}>Toutes tes catégories ont déjà un plafond.</div>
      ) : (
        <>
          <Field label="Catégorie">
            {budget ? (
              <div style={{ ...fieldInputStyle, display: "flex", alignItems: "center", opacity: 0.7 }}>{budget.category}</div>
            ) : (
              <select style={fieldPickerStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
                {availableFamilies.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
          </Field>
          <Field label="Plafond par mois (€)">
            <input style={fieldInputStyle} value={limit} onChange={(e) => setLimit(e.target.value)} inputMode="decimal" placeholder="ex. 300" autoFocus />
          </Field>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            Compte toutes les dépenses de la famille (sous-catégories comprises), sur tous tes comptes, pour le mois en cours.
          </div>
        </>
      )}
    </Sheet>
  );
}
