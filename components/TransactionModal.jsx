import { useState } from "react";
import { ChevronDown, Trash2, Plus, X } from "lucide-react";
import { Sheet, Field, fieldInputStyle, fieldPickerStyle } from "./ui/Sheets";
import { SegmentedControl } from "./ui/Selectors";
import { DEFAULT_PAYMENTS } from "../lib/constants";
import { toLocalISODate, fmtEUR } from "../lib/format";

export function TransactionModal({ tx, categories, accounts, categoryRules, onClose, onSave, onDelete, openOptions, saving, defaultPayment, defaultAccount }) {
  const [title, setTitle] = useState(tx?.title || "");
  const [amount, setAmount] = useState(tx?.amount != null ? String(tx.amount) : "");
  const [category, setCategory] = useState(tx?.category || categories[0] || "");
  const [categoryTouched, setCategoryTouched] = useState(!!tx); // en édition, ne pas re-suggérer par-dessus le choix déjà fait
  const [compte, setCompte] = useState(tx?.compte || defaultAccount || accounts[0] || "");
  const [type, setType] = useState(tx?.type || "Dépense");
  const [payment, setPayment] = useState(tx?.payment || defaultPayment || "Carte bancaire");
  const [date, setDate] = useState(tx?.date || toLocalISODate(new Date()));
  const [tagsText, setTagsText] = useState((tx?.tags || []).join(", "));
  const [emoji, setEmoji] = useState(tx?.emoji || "");
  const [splitMode, setSplitMode] = useState(!!tx?.splits?.length);
  const [splits, setSplits] = useState(tx?.splits?.length ? tx.splits : [{ category: category, amount: "" }]);
  const [error, setError] = useState("");

  function handleTitleChange(v) {
    setTitle(v);
    if (categoryTouched || (categoryRules || []).length === 0) return;
    const match = categoryRules.find((r) => v.toLowerCase().includes(r.keyword.toLowerCase()));
    if (match) setCategory(match.category);
  }

  function updateSplit(i, patch) {
    setSplits((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addSplit() {
    setSplits((prev) => [...prev, { category: categories[0] || "", amount: "" }]);
  }
  function removeSplit(i) {
    setSplits((prev) => prev.filter((_, idx) => idx !== i));
  }
  const splitsSum = splits.reduce((s, x) => s + (parseFloat(String(x.amount).replace(",", ".")) || 0), 0);

  function handleSave() {
    const amt = parseFloat(String(amount).replace(",", "."));
    if (!title.trim()) { setError("Indique un titre."); return; }
    if (!amt || amt <= 0) { setError("Indique un montant valide."); return; }
    const tags = tagsText.split(",").map((s) => s.trim()).filter(Boolean);

    if (splitMode) {
      const cleanSplits = splits.map((s) => ({ category: s.category, amount: parseFloat(String(s.amount).replace(",", ".")) || 0 })).filter((s) => s.amount > 0);
      if (cleanSplits.length < 2) { setError("Ajoute au moins deux parts pour fractionner."); return; }
      if (Math.abs(cleanSplits.reduce((s, x) => s + x.amount, 0) - amt) > 0.01) { setError("La somme des parts doit être égale au montant total."); return; }
      const mainCategory = cleanSplits.reduce((a, b) => (b.amount > a.amount ? b : a)).category;
      onSave({ id: tx?.id, title: title.trim(), amount: amt, category: mainCategory, compte, type, payment, date, tags, splits: cleanSplits, emoji: emoji.trim() || null });
    } else {
      onSave({ id: tx?.id, title: title.trim(), amount: amt, category, compte, type, payment, date, tags, splits: null, emoji: emoji.trim() || null });
    }
  }

  return (
    <Sheet
      title={tx ? "Modifier" : "Nouvelle transaction"}
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
      <SegmentedControl options={["Dépense", "Gain"]} value={type} onChange={setType} style={{ marginBottom: 16 }} />
      <Field label="Titre"><input style={fieldInputStyle} value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="ex. J'ai acheté une bougie" /></Field>
      <Field label="Montant (€)"><input style={fieldInputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" /></Field>

      {!splitMode && (
        <Field label="Catégorie">
          <button style={fieldPickerStyle} onClick={() => { setCategoryTouched(true); openOptions({ title: "Catégorie", options: categories, value: category, onSelect: setCategory }); }}>
            {category}<ChevronDown size={16} color="var(--text-tertiary)" />
          </button>
        </Field>
      )}

      {type === "Dépense" && (
        <button
          onClick={() => setSplitMode((v) => !v)}
          style={{ background: "none", border: "none", padding: "0 0 16px 0", color: "var(--text-secondary)", fontSize: 13, textDecoration: "underline", cursor: "pointer" }}
        >
          {splitMode ? "Annuler le fractionnement" : "Fractionner en plusieurs catégories"}
        </button>
      )}

      {splitMode && (
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {splits.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button style={{ ...fieldPickerStyle, flex: 1, marginBottom: 0 }} onClick={() => openOptions({ title: "Catégorie", options: categories, value: s.category, onSelect: (v) => updateSplit(i, { category: v }) })}>
                {s.category}<ChevronDown size={16} color="var(--text-tertiary)" />
              </button>
              <input style={{ ...fieldInputStyle, width: 90, marginBottom: 0 }} value={s.amount} onChange={(e) => updateSplit(i, { amount: e.target.value })} inputMode="decimal" placeholder="0.00" />
              {splits.length > 1 && <button onClick={() => removeSplit(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={16} color="var(--text-tertiary)" /></button>}
            </div>
          ))}
          <button onClick={addSplit} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", padding: "4px 0" }}>
            <Plus size={14} /> Ajouter une part
          </button>
          <div style={{ fontSize: 12, color: Math.abs(splitsSum - (parseFloat(String(amount).replace(",", ".")) || 0)) > 0.01 ? "var(--red)" : "var(--text-tertiary)" }}>
            Total des parts : {fmtEUR(splitsSum)}
          </div>
        </div>
      )}

      <Field label="Emoji (facultatif)"><input style={fieldInputStyle} value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🍕" /></Field>
      <Field label="Compte"><button style={fieldPickerStyle} onClick={() => openOptions({ title: "Compte", options: accounts, value: compte, onSelect: setCompte })}>{compte}<ChevronDown size={16} color="var(--text-tertiary)" /></button></Field>
      <Field label="Moyen de paiement"><button style={fieldPickerStyle} onClick={() => openOptions({ title: "Moyen de paiement", options: DEFAULT_PAYMENTS, value: payment, onSelect: setPayment })}>{payment}<ChevronDown size={16} color="var(--text-tertiary)" /></button></Field>
      <Field label="Date"><input type="date" style={fieldInputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Tags (séparés par une virgule)"><input style={fieldInputStyle} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="ex. vacances, cadeau" /></Field>
    </Sheet>
  );
}
