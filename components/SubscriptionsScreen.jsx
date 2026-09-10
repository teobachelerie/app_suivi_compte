import { useState } from "react";
import { RefreshCw, ChevronDown, Trash2 } from "lucide-react";
import { Card, Divider, Amount, Switch } from "./ui/Primitives";
import { ListRow } from "./ui/ListRow";
import { NavBar } from "./ui/Navigation";
import { Sheet, Field, fieldInputStyle, fieldPickerStyle } from "./ui/Sheets";
import { fmtEUR } from "../lib/format";

function SubscriptionForm({ sub, categories, accounts, defaultPayment, defaultAccount, onClose, onSave, onDelete, openOptions, saving }) {
  const [title, setTitle] = useState(sub?.title || "");
  const [amount, setAmount] = useState(sub?.amount != null ? String(sub.amount) : "");
  const [category, setCategory] = useState(sub?.category || categories[0] || "");
  const [compte, setCompte] = useState(sub?.compte || defaultAccount || accounts[0] || "");
  const [payment, setPayment] = useState(sub?.payment || defaultPayment || "Carte bancaire");
  const [billingDay, setBillingDay] = useState(sub?.billingDay || 1);
  const [error, setError] = useState("");
  const DAYS = Array.from({ length: 28 }, (_, i) => String(i + 1));

  function handleSave() {
    const amt = parseFloat(String(amount).replace(",", "."));
    if (!title.trim()) { setError("Indique un titre."); return; }
    if (!amt || amt <= 0) { setError("Indique un montant valide."); return; }
    onSave({ id: sub?.id, title: title.trim(), amount: amt, category, compte, payment, billingDay: parseInt(billingDay, 10) });
  }

  return (
    <Sheet
      title={sub ? "Modifier l'abonnement" : "Nouvel abonnement"}
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
      <Field label="Titre"><input style={fieldInputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Netflix" /></Field>
      <Field label="Montant (€)"><input style={fieldInputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" /></Field>
      <Field label="Jour du mois"><button style={fieldPickerStyle} onClick={() => openOptions({ title: "Jour du mois", options: DAYS, value: String(billingDay), onSelect: (v) => setBillingDay(v) })}>Le {billingDay}<ChevronDown size={16} color="var(--text-tertiary)" /></button></Field>
      <Field label="Catégorie"><button style={fieldPickerStyle} onClick={() => openOptions({ title: "Catégorie", options: categories, value: category, onSelect: setCategory })}>{category}<ChevronDown size={16} color="var(--text-tertiary)" /></button></Field>
      <Field label="Compte"><button style={fieldPickerStyle} onClick={() => openOptions({ title: "Compte", options: accounts, value: compte, onSelect: setCompte })}>{compte}<ChevronDown size={16} color="var(--text-tertiary)" /></button></Field>
      <Field label="Moyen de paiement"><button style={fieldPickerStyle} onClick={() => openOptions({ title: "Moyen de paiement", options: ["Carte bancaire", "Virement", "Liquide"], value: payment, onSelect: setPayment })}>{payment}<ChevronDown size={16} color="var(--text-tertiary)" /></button></Field>
    </Sheet>
  );
}

export function SubscriptionsScreen({ subscriptions, categories, accounts, defaultPayment, defaultAccount, onBack, onCreate, onUpdate, onDelete, openOptions, saving }) {
  const [editing, setEditing] = useState(null); // subscription en cours d'édition, ou {} pour "nouveau"
  const total = subscriptions.filter((s) => s.active).reduce((s, x) => s + x.amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <NavBar back title="Abonnements" onBack={onBack} />

      <Card depth="raised-lg" padding="lg" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>TOTAL MENSUEL · ABONNEMENTS ACTIFS</span>
        <Amount value={fmtEUR(total)} direction="expense" size="xl" showSign={false} />
      </Card>

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
          openOptions={openOptions}
          onClose={() => setEditing(null)}
          onSave={(s) => { (editing.id ? onUpdate(editing.id, s) : onCreate(s)).then(() => setEditing(null)); }}
          onDelete={editing.id ? () => onDelete(editing.id).then(() => setEditing(null)) : null}
        />
      )}
    </div>
  );
}
