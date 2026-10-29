import { useState, useEffect } from "react";
import { Target, Trash2, Check } from "lucide-react";
import { Card, Divider, Amount, ProgressBar } from "./ui/Primitives";
import { ListRow } from "./ui/ListRow";
import { NavBar } from "./ui/Navigation";
import { BottomSheet } from "./ui/BottomSheet";
import { Button } from "./ui/Button";
import { TextField } from "./ui/TextField";
import { PickerField } from "./ui/PickerField";
import { fmtEUR, requiredMonthly } from "../lib/format";
import { haptic } from "../lib/haptics";

function GoalForm({ goal, accounts, onClose, onSave, onDelete, saving }) {
  const [title, setTitle] = useState(goal?.title || "");
  const [targetAmount, setTargetAmount] = useState(goal?.targetAmount != null ? String(goal.targetAmount).replace(".", ",") : "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate || "");
  const [compte, setCompte] = useState(goal?.compte || accounts[0] || "");

  // Même règle que la saisie d'une transaction : le bouton reste grisé et une seule raison
  // s'affiche dessous, plutôt qu'une erreur après coup.
  const amt = parseFloat(String(targetAmount).replace(/\s/g, "").replace(",", "."));
  let blocker = null;
  if (!title.trim()) blocker = "Donne un nom à l'objectif";
  else if (!(amt > 0)) blocker = "Indique le montant à atteindre";
  else if (!targetDate) blocker = "Choisis une date cible";

  function handleSave() {
    if (blocker || saving) return;
    onSave({ id: goal?.id, title: title.trim(), targetAmount: amt, targetDate, compte });
  }

  return (
    <BottomSheet
      title={goal ? "Modifier l'objectif" : "Nouvel objectif"}
      onClose={onClose}
      footer={
        <>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            {onDelete && (
              <Button variant="danger" icon onClick={onDelete} disabled={saving} aria-label="Supprimer l'objectif">
                <Trash2 size={20} aria-hidden="true" />
              </Button>
            )}
            <Button block loading={saving} disabled={!!blocker} onClick={handleSave}>{goal ? "Enregistrer" : "Créer l'objectif"}</Button>
          </div>
          <div className="fin-tx-hint" aria-live="polite">{blocker || " "}</div>
        </>
      }
    >
      <TextField label="Nom" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Voyage au Japon" />
      <TextField label="Montant à atteindre" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} inputMode="decimal" placeholder="ex. 3 000" suffix="€" />
      <TextField label="Date cible" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      {accounts.length > 1 ? <PickerField label="Compte" value={compte} options={accounts} onChange={setCompte} /> : null}
    </BottomSheet>
  );
}


const BURST_COLORS = ["#ffbb2e", "#ff802e", "#e53f1a"];

// Barre de progression d'un objectif. Quand il est atteint : la barre reste éclairée, et une petite
// gerbe de particules part de son extrémité UNE SEULE FOIS (mémorisée par objectif) avec un retour
// haptique — jamais à chaque ouverture de l'écran. Aucun effet si l'utilisateur a demandé de réduire
// les animations (les keyframes n'existent alors pas, voir globals.css).
function GoalProgress({ goal, pct, reached, monthly }) {
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!reached) return undefined;
    const key = `finelio-goal-celebrated-${goal.id}`;
    try {
      if (window.localStorage.getItem(key)) return undefined;
      window.localStorage.setItem(key, "1");
    } catch { return undefined; }
    setBurst(true);
    haptic("success");
    const timer = setTimeout(() => setBurst(false), 1300);
    return () => clearTimeout(timer);
  }, [reached, goal.id]);

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ position: "relative" }}>
        <div className={reached ? "fin-goal-glow" : ""} style={{ borderRadius: "var(--radius-round)" }}>
          <ProgressBar value={pct} tone="income" />
        </div>
        {burst && (
          <div aria-hidden="true" style={{ position: "absolute", right: 0, top: "50%", width: 0, height: 0, pointerEvents: "none" }}>
            {Array.from({ length: 12 }, (_, i) => {
              const angle = (i / 12) * Math.PI * 2;
              const dist = 26 + (i % 3) * 10;
              return (
                <span
                  key={i}
                  style={{
                    position: "absolute", width: 6, height: 6, marginLeft: -3, marginTop: -3, borderRadius: "50%",
                    background: BURST_COLORS[i % 3],
                    "--dx": `${Math.cos(angle) * dist}px`, "--dy": `${Math.sin(angle) * dist}px`,
                    animation: "fin-burst 850ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards",
                  }}
                />
              );
            })}
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, fontSize: 12, color: "var(--text-tertiary)" }}>
        <span>{fmtEUR(goal.currentBalance)} sur {fmtEUR(goal.targetAmount)}</span>
        {reached ? (
          <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--green)", fontWeight: 600 }}><Check size={13} /> Objectif atteint</span>
        ) : (
          <span>{fmtEUR(monthly)} / mois à verser</span>
        )}
      </div>
    </div>
  );
}

// `goals` doit déjà contenir currentBalance par objectif (calculé dans pages/index.js à partir des
// transactions, car GoalsScreen ne connaît pas l'historique des transactions lui-même).
export function GoalsScreen({ goals, accounts, onBack, onCreate, onUpdate, onDelete, saving }) {
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
                <GoalProgress goal={g} pct={pct} reached={reached} monthly={monthly} />
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
          onClose={() => setEditing(null)}
          onSave={(g) => { (editing.id ? onUpdate(editing.id, g) : onCreate(g)).then(() => setEditing(null)); }}
          onDelete={editing.id ? () => onDelete(editing.id).then(() => setEditing(null)) : null}
        />
      )}
    </div>
  );
}
