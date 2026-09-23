import { useState, useMemo } from "react";
import { ChevronLeft, Delete } from "lucide-react";
import { Field, fieldInputStyle, fieldPickerStyle } from "./ui/Sheets";
import { categoryIconUrl } from "../lib/format";

const OPERATORS = { "+": (a, b) => a + b, "−": (a, b) => a - b, "×": (a, b) => a * b, "÷": (a, b) => (b === 0 ? a : a / b) };

// Calculatrice à deux opérandes (un seul opérateur en attente à la fois) — largement suffisant
// pour les cas réels ("addition rapide de deux achats", "partager une note en deux"), sans la
// complexité d'un vrai analyseur d'expression.
function useCalculator() {
  const [display, setDisplay] = useState("0");
  const [pending, setPending] = useState(null); // { value, op } | null

  function pressDigit(d) {
    setDisplay((cur) => (cur === "0" ? d : cur.length < 12 ? cur + d : cur));
  }
  function pressComma() {
    setDisplay((cur) => (cur.includes(",") ? cur : cur + ","));
  }
  function pressBackspace() {
    setDisplay((cur) => (cur.length > 1 ? cur.slice(0, -1) : "0"));
  }
  function currentValue() {
    return parseFloat(display.replace(",", ".")) || 0;
  }
  function pressOperator(op) {
    setPending((prev) => {
      const value = prev ? OPERATORS[prev.op](prev.value, currentValue()) : currentValue();
      return { value, op };
    });
    setDisplay("0");
  }
  function result() {
    return pending ? OPERATORS[pending.op](pending.value, currentValue()) : currentValue();
  }
  function expressionLabel() {
    return pending ? `${pending.value.toString().replace(".", ",")} ${pending.op} ${display}` : null;
  }
  return { display, pressDigit, pressComma, pressBackspace, pressOperator, result, expressionLabel };
}

function CategoryTile({ cat, onClick }) {
  const url = categoryIconUrl(cat.icon);
  return (
    <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: "4px 0" }}>
      <span style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--elev-raised-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {url ? <img src={url} alt="" width={28} height={28} /> : <span style={{ fontSize: 20 }}>•</span>}
      </span>
      <span style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.2 }}>{cat.name}</span>
    </button>
  );
}

export function AddTransactionWizard({ categories, accounts, categoryRules, defaultAccount, defaultPayment, onClose, onSave, saving }) {
  const [step, setStep] = useState("type"); // type -> category (sauf Virement) -> amount -> details
  const [type, setType] = useState(null);
  const [category, setCategory] = useState(null);
  const [title, setTitle] = useState("");
  const [compte, setCompte] = useState(defaultAccount || accounts[0]?.name || "");
  const [compteDestination, setCompteDestination] = useState(accounts.find((a) => a.name !== defaultAccount)?.name || accounts[0]?.name || "");
  const [payment, setPayment] = useState(defaultPayment || "Carte bancaire");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [tagsText, setTagsText] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const calc = useCalculator();

  // Familles pertinentes selon le type : "Revenus" pour un gain, tout le reste pour une dépense.
  const leafCategories = useMemo(() => categories.filter((c) => c.parent_id || !c.tier), [categories]);
  const families = useMemo(() => {
    const byParent = new Map();
    for (const c of leafCategories) {
      const parent = categories.find((p) => p.id === c.parent_id);
      const familyName = parent ? parent.name : c.name; // catégorie historique sans famille = sa propre famille
      if (!byParent.has(familyName)) byParent.set(familyName, []);
      byParent.get(familyName).push(c);
    }
    const entries = [...byParent.entries()];
    if (type === "Gain") return entries.filter(([name]) => name === "Revenus");
    return entries.filter(([name]) => name !== "Revenus");
  }, [leafCategories, categories, type]);

  function chooseType(t) {
    setType(t);
    setStep(t === "Virement" ? "amount" : "category");
  }
  function chooseCategory(name) {
    setCategory(name);
    setStep("amount");
  }
  function confirmAmount() {
    const amt = calc.result();
    if (!amt || amt <= 0) { setError("Le montant doit être supérieur à zéro."); return; }
    setError("");
    setStep("details");
  }
  function goBack() {
    if (step === "category") setStep("type");
    else if (step === "amount") setStep(type === "Virement" ? "type" : "category");
    else if (step === "details") setStep("amount");
    else onClose();
  }

  function handleConfirm() {
    const amt = calc.result();
    const tags = tagsText.split(",").map((s) => s.trim()).filter(Boolean);
    if (type === "Virement") {
      if (compte === compteDestination) { setError("Les comptes source et cible doivent être différents."); return; }
      onSave({
        title: title.trim() || `${compte} → ${compteDestination}`, amount: amt, category: "Virement automatique",
        compte, compteDestination, type, payment: "Virement", date, tags, splits: null, emoji: null, notes: notes.trim() || null,
      });
    } else {
      if (!title.trim()) { setError("Indique un titre."); return; }
      onSave({
        title: title.trim(), amount: amt, category, compte, compteDestination: null, type, payment, date, tags,
        splits: null, emoji: null, notes: notes.trim() || null,
      });
    }
  }

  const STEP_TITLES = { type: "Nouvelle opération", category: "Catégorie", amount: "Montant", details: "Détails" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--surface-base)", zIndex: 100, display: "flex", flexDirection: "column", fontFamily: "var(--font-core)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "calc(env(safe-area-inset-top, 0px) + var(--space-4)) var(--gutter-screen) var(--space-3)" }}>
        <button onClick={goBack} style={{ background: "var(--surface-raised)", boxShadow: "var(--elev-raised-sm)", border: "none", width: 40, height: 40, borderRadius: "var(--radius-round)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ChevronLeft size={20} color="var(--text-primary)" />
        </button>
        <span style={{ font: "600 17px var(--font-core)", color: "var(--text-primary)" }}>{STEP_TITLES[step]}</span>
      </div>

      {step === "type" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 14, padding: "0 var(--gutter-screen)" }}>
          {["Dépense", "Gain", "Virement"].map((t) => (
            <button key={t} onClick={() => chooseType(t)} style={{ background: "var(--surface-raised)", boxShadow: "var(--elev-raised-sm)", border: "none", borderRadius: "var(--radius-lg)", padding: "20px", fontSize: 17, fontWeight: 600, color: t === "Gain" ? "var(--green)" : t === "Dépense" ? "var(--red)" : "var(--text-primary)", cursor: "pointer" }}>
              {t === "Virement" ? "Virement entre mes comptes" : t}
            </button>
          ))}
        </div>
      )}

      {step === "category" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "0 var(--gutter-screen) var(--space-6)" }}>
          {families.map(([familyName, subs]) => (
            <div key={familyName} style={{ marginBottom: "var(--space-5)" }}>
              <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)", display: "block", marginBottom: 10 }}>{familyName.toUpperCase()}</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", rowGap: 14 }}>
                {subs.map((c) => (
                  <CategoryTile key={c.id} cat={c} onClick={() => chooseCategory(c.name)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === "amount" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
            {calc.expressionLabel() && <span style={{ fontSize: 15, color: "var(--text-tertiary)" }}>{calc.expressionLabel()}</span>}
            <span style={{ font: "600 48px var(--font-display)", color: "var(--text-primary)" }}>{calc.display} €</span>
            {category && <span style={{ fontSize: 14, color: "var(--text-tertiary)" }}>{category}</span>}
            {error && <span style={{ fontSize: 13, color: "var(--red)" }}>{error}</span>}
          </div>
          <div style={{ padding: "0 var(--gutter-screen) calc(env(safe-area-inset-bottom, 0px) + var(--space-4))" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
              {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", ",", "0", "⌫", "+"].map((k) => {
                const isOp = ["+", "−", "×", "÷"].includes(k);
                const isBack = k === "⌫";
                return (
                  <button
                    key={k}
                    onClick={() => (isBack ? calc.pressBackspace() : isOp ? calc.pressOperator(k) : k === "," ? calc.pressComma() : calc.pressDigit(k))}
                    style={{
                      height: 56, borderRadius: "var(--radius-control)", border: "none", fontSize: 20, fontWeight: 600, cursor: "pointer",
                      background: isOp ? "var(--accent-bg)" : "var(--surface-raised)", color: isOp ? "var(--accent-text)" : "var(--text-primary)",
                      boxShadow: "var(--elev-raised-sm)",
                    }}
                  >
                    {isBack ? <Delete size={18} style={{ margin: "0 auto" }} /> : k}
                  </button>
                );
              })}
            </div>
            <button onClick={confirmAmount} style={{ width: "100%", background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "16px 0", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
              Suivant
            </button>
          </div>
        </div>
      )}

      {step === "details" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "0 var(--gutter-screen)" }}>
          <div style={{ textAlign: "center", padding: "var(--space-4) 0", font: "600 28px var(--font-display)", color: type === "Gain" ? "var(--green)" : type === "Virement" ? "var(--text-primary)" : "var(--red)" }}>
            {calc.result().toFixed(2).replace(".", ",")} €
          </div>
          <Field label="Titre"><input autoFocus style={fieldInputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === "Virement" ? `ex. ${compte} → ${compteDestination}` : "ex. J'ai acheté une bougie"} /></Field>
          <Field label={type === "Virement" ? "Compte source" : "Compte"}>
            <select style={fieldPickerStyle} value={compte} onChange={(e) => setCompte(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </Field>
          {type === "Virement" ? (
            <Field label="Compte cible">
              <select style={fieldPickerStyle} value={compteDestination} onChange={(e) => setCompteDestination(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Moyen de paiement">
              <select style={fieldPickerStyle} value={payment} onChange={(e) => setPayment(e.target.value)}>
                {["Carte bancaire", "Virement", "Liquide"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          )}
          <Field label="Date"><input type="date" style={fieldInputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Tags (séparés par une virgule)"><input style={fieldInputStyle} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="ex. vacances, cadeau" /></Field>
          <Field label="Remarques (facultatif)"><textarea style={{ ...fieldInputStyle, minHeight: 70, resize: "vertical" }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Une note libre sur cette opération" /></Field>
          {error && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}
          <button onClick={handleConfirm} disabled={saving} style={{ width: "100%", background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "16px 0", fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1, marginBottom: "var(--space-6)" }}>
            {saving ? "Enregistrement…" : "Confirmer"}
          </button>
        </div>
      )}
    </div>
  );
}
