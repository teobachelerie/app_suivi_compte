import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { Sheet, Field, fieldInputStyle, fieldPickerStyle } from "./ui/Sheets";
import { SegmentedControl } from "./ui/Selectors";
import { DEFAULT_PAYMENTS } from "../lib/constants";
import { toLocalISODate } from "../lib/format";

export function TransactionModal({ tx, categories, accounts, onClose, onSave, onDelete, openOptions, saving, defaultPayment, defaultAccount }) {
  const [title, setTitle] = useState(tx?.title || "");
  const [amount, setAmount] = useState(tx?.amount != null ? String(tx.amount) : "");
  const [category, setCategory] = useState(tx?.category || categories[0] || "");
  const [compte, setCompte] = useState(tx?.compte || defaultAccount || accounts[0] || "");
  const [type, setType] = useState(tx?.type || "Dépense");
  const [payment, setPayment] = useState(tx?.payment || defaultPayment || "Carte bancaire");
  const [date, setDate] = useState(tx?.date || toLocalISODate(new Date()));
  const [error, setError] = useState("");

  function handleSave() {
    const amt = parseFloat(String(amount).replace(",", "."));
    if (!title.trim()) { setError("Indique un titre."); return; }
    if (!amt || amt <= 0) { setError("Indique un montant valide."); return; }
    onSave({ id: tx?.id, title: title.trim(), amount: amt, category, compte, type, payment, date });
  }

  return (
    <Sheet title={tx ? "Modifier" : "Nouvelle transaction"} onClose={onClose}>
      <SegmentedControl options={["Dépense", "Gain"]} value={type} onChange={setType} style={{ marginBottom: 16 }} />
      <Field label="Titre"><input style={fieldInputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. J'ai acheté une bougie" /></Field>
      <Field label="Montant (€)"><input style={fieldInputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" /></Field>
      <Field label="Catégorie"><button style={fieldPickerStyle} onClick={() => openOptions({ title: "Catégorie", options: categories, value: category, onSelect: setCategory })}>{category}<ChevronDown size={16} color="var(--text-tertiary)" /></button></Field>
      <Field label="Compte"><button style={fieldPickerStyle} onClick={() => openOptions({ title: "Compte", options: accounts, value: compte, onSelect: setCompte })}>{compte}<ChevronDown size={16} color="var(--text-tertiary)" /></button></Field>
      <Field label="Moyen de paiement"><button style={fieldPickerStyle} onClick={() => openOptions({ title: "Moyen de paiement", options: DEFAULT_PAYMENTS, value: payment, onSelect: setPayment })}>{payment}<ChevronDown size={16} color="var(--text-tertiary)" /></button></Field>
      <Field label="Date"><input type="date" style={fieldInputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      {error && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        {onDelete && <button onClick={onDelete} disabled={saving} style={{ width: 48, height: 48, borderRadius: "var(--radius-control)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Trash2 size={18} color="var(--red)" /></button>}
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1, boxShadow: "var(--elev-raised-sm)" }}>{saving ? "Enregistrement…" : "Confirmer"}</button>
      </div>
    </Sheet>
  );
}
