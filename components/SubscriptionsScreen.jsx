import { useState } from "react";
import { RefreshCw, Trash2, X } from "lucide-react";
import { Card, Divider, Amount, Switch } from "./ui/Primitives";
import { ListRow } from "./ui/ListRow";
import { NavBar } from "./ui/Navigation";
import { BottomSheet } from "./ui/BottomSheet";
import { Button } from "./ui/Button";
import { TextField } from "./ui/TextField";
import { PickerField } from "./ui/PickerField";
import { fmtEUR } from "../lib/format";

const DAYS = Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: `Le ${i + 1} du mois` }));
const PAYMENTS = ["Carte bancaire", "Virement", "Liquide"];

function SubscriptionForm({ sub, categories, accounts, defaultPayment, defaultAccount, onClose, onSave, onDelete, saving }) {
  const [title, setTitle] = useState(sub?.title || "");
  const [amount, setAmount] = useState(sub?.amount != null ? String(sub.amount).replace(".", ",") : "");
  const [category, setCategory] = useState(sub?.category || categories[0] || "");
  const [compte, setCompte] = useState(sub?.compte || defaultAccount || accounts[0] || "");
  const [payment, setPayment] = useState(sub?.payment || defaultPayment || "Carte bancaire");
  const [billingDay, setBillingDay] = useState(Number(sub?.billingDay) || 1);

  // Bouton grisé avec une seule raison dessous, comme la saisie d'une transaction.
  const amt = parseFloat(String(amount).replace(/\s/g, "").replace(",", "."));
  let blocker = null;
  if (!title.trim()) blocker = "Donne un nom à l'abonnement";
  else if (!(amt > 0)) blocker = "Indique le montant mensuel";

  function handleSave() {
    if (blocker || saving) return;
    onSave({ id: sub?.id, title: title.trim(), amount: amt, category, compte, payment, billingDay: parseInt(billingDay, 10) });
  }

  return (
    <BottomSheet
      title={sub ? "Modifier l'abonnement" : "Nouvel abonnement"}
      onClose={onClose}
      footer={
        <>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            {onDelete && (
              <Button variant="danger" icon onClick={onDelete} disabled={saving} aria-label="Supprimer l'abonnement">
                <Trash2 size={20} aria-hidden="true" />
              </Button>
            )}
            <Button block loading={saving} disabled={!!blocker} onClick={handleSave}>{sub ? "Enregistrer" : "Ajouter l'abonnement"}</Button>
          </div>
          <div className="fin-tx-hint" aria-live="polite">{blocker || " "}</div>
        </>
      }
    >
      <TextField label="Nom" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Netflix" />
      <TextField label="Montant par mois" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="ex. 13,49" suffix="€" />
      <PickerField label="Prélevé" title="Jour de prélèvement" value={billingDay} options={DAYS} onChange={setBillingDay} />
      <PickerField label="Catégorie" value={category} options={categories} onChange={setCategory} />
      {accounts.length > 1 ? <PickerField label="Compte" value={compte} options={accounts} onChange={setCompte} /> : null}
      <PickerField label="Moyen de paiement" value={payment} options={PAYMENTS} onChange={setPayment} />
    </BottomSheet>
  );
}

export function SubscriptionsScreen({ subscriptions, categories, accounts, defaultPayment, defaultAccount, onBack, onCreate, onUpdate, onDelete, saving, suggestions = [], onAddSuggestion, onDismissSuggestion }) {
  const [editing, setEditing] = useState(null); // subscription en cours d'édition, ou {} pour "nouveau"
  const [addingKey, setAddingKey] = useState(null); // récurrence en cours d'ajout (désactive son bouton)
  const total = subscriptions.filter((s) => s.active).reduce((s, x) => s + x.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <NavBar back title="Abonnements" onBack={onBack} />

      <Card depth="raised-lg" padding="lg" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>TOTAL MENSUEL · ABONNEMENTS ACTIFS</span>
        <Amount value={fmtEUR(total)} direction="expense" size="xl" showSign={false} />
      </Card>

      {suggestions.length > 0 && (
        <div>
          <span style={{ display: "block", color: "var(--text-tertiary)", font: "var(--text-caption-font)", marginBottom: "var(--space-2)" }}>RÉCURRENCES DÉTECTÉES</span>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: "var(--space-3)" }}>
            Ces dépenses reviennent chaque mois à un montant stable. Ajoute-les pour les suivre comme abonnements.
          </div>
          <Card padding="md">
            {suggestions.map((sg, i) => (
              <div key={sg.key}>
                {i > 0 ? <Divider /> : null}
                <ListRow
                  Icon={RefreshCw}
                  title={sg.title}
                  subtitle={`${fmtEUR(sg.amount)} · vers le ${sg.billingDay} · ${sg.occurrences} fois`}
                  trailing={
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        disabled={addingKey === sg.key}
                        onClick={async () => { setAddingKey(sg.key); try { await onAddSuggestion(sg); } finally { setAddingKey(null); } }}
                        style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-round)", padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: addingKey === sg.key ? 0.6 : 1 }}
                      >
                        {addingKey === sg.key ? "…" : "Ajouter"}
                      </button>
                      <button onClick={() => onDismissSuggestion(sg.key)} aria-label="Ignorer" style={{ background: "none", border: "none", padding: 6, cursor: "pointer", display: "flex" }}>
                        <X size={16} color="var(--text-tertiary)" />
                      </button>
                    </div>
                  }
                />
              </div>
            ))}
          </Card>
        </div>
      )}

      <Card padding="md">
        {subscriptions.length === 0 && <div style={{ padding: "8px 0", fontSize: 14, color: "var(--text-tertiary)", textAlign: "center" }}>Aucun abonnement pour l'instant.</div>}
        {subscriptions.map((s, i) => (
          <div key={s.id}>
            {i > 0 ? <Divider /> : null}
            <ListRow
              Icon={RefreshCw}
              title={s.title}
              subtitle={`Le ${s.billingDay} · ${s.category}`}
              onClick={() => setEditing(s)}
              trailing={
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Amount value={fmtEUR(s.amount)} direction={s.active ? "expense" : "neutral"} showSign={false} style={{ opacity: s.active ? 1 : 0.4 }} />
                  <Switch checked={s.active} onChange={(v) => onUpdate(s.id, { active: v })} />
                </div>
              }
            />
          </div>
        ))}
      </Card>

      <button
        onClick={() => setEditing({})}
        style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "var(--elev-raised-sm)" }}
      >
        Ajouter un abonnement
      </button>

      {editing && (
        <SubscriptionForm
          sub={editing.id ? editing : null}
          categories={categories}
          accounts={accounts}
          defaultPayment={defaultPayment}
          defaultAccount={defaultAccount}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={(s) => { (editing.id ? onUpdate(editing.id, s) : onCreate(s)).then(() => setEditing(null)); }}
          onDelete={editing.id ? () => onDelete(editing.id).then(() => setEditing(null)) : null}
        />
      )}
    </div>
  );
}
