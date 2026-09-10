import { useState } from "react";
import { Target, ChevronDown, Trash2 } from "lucide-react";
import { Card, Divider, Amount, ProgressBar } from "./ui/Primitives";
import { ListRow } from "./ui/ListRow";
import { NavBar } from "./ui/Navigation";
import { Sheet, Field, fieldInputStyle, fieldPickerStyle } from "./ui/Sheets";
import { fmtEUR, requiredMonthly } from "../lib/format";

function GoalForm({ goal, accounts, onClose, onSave, onDelete, openOptions, saving }) {
  const [title, setTitle] = useState(goal?.title || "");
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount != null ? String(goal.targetAmount) : "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate || "");
  const [compte, setCompte] = useState(goal?.compte || accounts[0] || "");
  const [error, setError] = useState("");

  function handleSave() {
    const amt = parseFloat(String(targetAmount).replace(",", "."));
    if (!title.trim()) { setError("Indique un titre."); return; }
    if (!amt || amt <= 0) { setError("Indique un montant cible valide."); return; }
    if (!targetDate) { setError("Indique une date cible."); return; }
    onSave({ id: goal?.id, title: title.trim(), targetAmount: amt, targetDate, compte });
  }

  return (
    <Sheet
      title={goal ? "Modifier l'objectif" : "Nouvel objectif"}
      onClose={onClose}
      footer={
        <>
          {error && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            {onDelete && <button onClick={onDelete} disabled={saving} style={{ width: 48, height: 48, borderRadius: "var(--radius-control)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Trash2 size={18} color="var(--red)" /></button>}
            <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1, boxShadow: "var(--elev-raised-sm)" }}>{saving ? "Enregistrement…" : "Confirmer"}</button>
          </div>
        </>
      }
    >
      <Field label="Titre"><input style={fieldInputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Épargne fin de BTS" /></Field>
      <Field label="Montant cible (€)"><input style={fieldInputStyle} value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} inputMode="decimal" placeholder="0.00" /></Field>
      <Field label="Date cible"><input style={fieldInputStyle} type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></Field>
      <Field label="Compte"><button style={fieldPickerStyle} onClick={() => openOptions({ title: "Compte", options: accounts, value: compte, onSelect: setCompte })}>{compte}<ChevronDown size={16} color="var(--text-tertiary)" /></button></Field>
    </Sheet>
  );
}

// `goals` doit déjà contenir currentBalance par objectif (calculé dans pages/index.js à partir des
// transactions, car GoalsScreen ne connaît pas l'historique des transactions lui-même).
export function GoalsScreen({ goals, accounts, onBack, onCreate, onUpdate, onDelete, openOptions, saving }) {
  const [editing, setEditing] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <NavBar back title="Objectifs" onBack={onBack} />

      <Card padding="md">
        {goals.length === 0 && <div style={{ padding: "8px 0", fontSize: 14, color: "var(--text-tertiary)", textAlign: "center" }}>Aucun objectif pour l'instant.</div>}
        {goals.map((g, i) => {
          const pct = Math.min(100, (g.currentBalance / g.targetAmount) * 100);
          const monthly = requiredMonthly(g.targetAmount, g.currentBalance, g.targetDate);
          const reached = g.currentBalance >= g.targetAmount;
          return (
            <div key={g.id}>
              {i > 0 ? <Divider /> : null}
              <div style={{ padding: "var(--space-3) 0" }}>
                <ListRow
                  Icon={Target}
                  title={g.title}
                  subtitle={`${g.compte} · objectif le ${new Date(g.targetDate + "T00:00:00").toLocaleDateString("fr-FR")}`}
                  onClick={() => setEditing(g)}
                  trailing={<Amount value={fmtEUR(g.targetAmount)} showSign={false} direction="neutral" />}
                />
                <div style={{ marginTop: 10 }}>
                  <ProgressBar value={pct} tone="income" />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "var(--text-tertiary)" }}>
                    <span>{fmtEUR(g.currentBalance)} sur {fmtEUR(g.targetAmount)}</span>
                    <span>{reached ? "Objectif atteint 🎉" : `${fmtEUR(monthly)} / mois à verser`}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </Card>

      <button
        onClick={() => setEditing({})}
        style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "var(--elev-raised-sm)" }}
      >
        Ajouter un objectif
      </button>

      {editing && (
        <GoalForm
          goal={editing.id ? editing : null}
          accounts={accounts}
          saving={saving}
          openOptions={openOptions}
          onClose={() => setEditing(null)}
          onSave={(g) => { (editing.id ? onUpdate(editing.id, g) : onCreate(g)).then(() => setEditing(null)); }}
          onDelete={editing.id ? () => onDelete(editing.id).then(() => setEditing(null)) : null}
        />
      )}
    </div>
  );
}
