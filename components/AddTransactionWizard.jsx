import { useState, useMemo } from "react";
import { Delete, ShoppingBag } from "lucide-react";
import { Field, fieldInputStyle, fieldPickerStyle } from "./ui/Sheets";
import { SegmentedControl } from "./ui/Selectors";
import { categoryIconUrl } from "../lib/format";
import { CATEGORY_ICON } from "../lib/constants";

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

function CategoryTile({ icon, label, onClick }) {
  const url = categoryIconUrl(icon);
  const FallbackIcon = CATEGORY_ICON[label] || ShoppingBag;
  return (
    <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: "2px 0" }}>
      <span style={{ width: 42, height: 42, borderRadius: "var(--radius-md)", background: "var(--surface-raised)", boxShadow: "var(--elev-raised-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {url ? <img src={url} alt="" width={22} height={22} /> : <FallbackIcon size={18} color="var(--icon-primary)" />}
      </span>
      <span style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.15 }}>{label}</span>
    </button>
  );
}

// Feuille du bas pour choisir le type (Dépense/Revenu) puis la catégorie. Comportement voulu :
// - Dépenses/Revenus toujours visibles et cliquables, à tout moment.
// - Taper sur Dépenses (même si déjà actif) revient toujours à la grille des familles.
// - Taper sur Revenus bascule direct sur les sous-catégories de Revenus (une seule famille là-bas,
//   pas d'étape intermédiaire).
// - Taper une famille (ex. Loisirs) montre ses sous-catégories, plus la famille elle-même en haut
//   pour la choisir globalement si aucune sous-catégorie précise ne convient.
function CategoryPickerSheet({ categories, onPick, onVirement, onClose }) {
  const [activeType, setActiveType] = useState("Dépense"); // "Dépense" | "Gain"
  const [activeFamily, setActiveFamily] = useState(null); // null = grille des familles

  const leafCategories = useMemo(() => categories.filter((c) => c.parent_id || !c.tier), [categories]);
  const families = useMemo(() => {
    const byParent = new Map();
    for (const c of leafCategories) {
      const parent = categories.find((p) => p.id === c.parent_id);
      const familyName = parent ? parent.name : c.name; // catégorie historique sans famille = sa propre famille
      const familyIcon = parent ? parent.icon : c.icon;
      if (!byParent.has(familyName)) byParent.set(familyName, { icon: familyIcon, subs: [] });
      byParent.get(familyName).subs.push(c);
    }
    return byParent;
  }, [leafCategories, categories]);

  function chooseType(t) {
    setActiveType(t);
    setActiveFamily(null); // revient toujours à la vue de premier niveau du type choisi
  }

  const familyNames = [...families.keys()].filter((n) => n !== "Revenus");
  const revenusFamily = families.get("Revenus");
  const currentFamily = activeFamily ? families.get(activeFamily) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--surface-scrim)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, maxHeight: "62dvh", overflowY: "auto", background: "var(--surface-base)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", boxShadow: "var(--elev-overlay)", padding: "var(--space-4) var(--gutter-screen) calc(env(safe-area-inset-bottom, 0px) + var(--space-5))" }}>
        <div style={{ width: 36, height: 5, borderRadius: 3, background: "var(--grey-2)", margin: "0 auto var(--space-4)" }} />
        <SegmentedControl options={["Dépenses", "Revenus"]} value={activeType === "Gain" ? "Revenus" : "Dépenses"} onChange={(v) => chooseType(v === "Revenus" ? "Gain" : "Dépense")} style={{ marginBottom: "var(--space-4)" }} />

        {activeType === "Gain" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", rowGap: 10 }}>
            {(revenusFamily?.subs || []).map((c) => (
              <CategoryTile key={c.id} icon={c.icon} label={c.name} onClick={() => onPick("Gain", c.name)} />
            ))}
          </div>
        ) : !activeFamily ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", rowGap: 10 }}>
            {familyNames.map((name) => (
              <CategoryTile key={name} icon={families.get(name).icon} label={name} onClick={() => setActiveFamily(name)} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", rowGap: 10 }}>
            <CategoryTile icon={currentFamily.icon} label={activeFamily} onClick={() => onPick("Dépense", activeFamily)} />
            {currentFamily.subs.map((c) => (
              <CategoryTile key={c.id} icon={c.icon} label={c.name} onClick={() => onPick("Dépense", c.name)} />
            ))}
          </div>
        )}

        <button onClick={onVirement} style={{ display: "block", margin: "var(--space-3) auto 0", background: "none", border: "none", color: "var(--text-secondary)", fontSize: 13, textDecoration: "underline", cursor: "pointer" }}>
          Ou faire un virement entre mes comptes
        </button>
      </div>
    </div>
  );
}

export function AddTransactionWizard({ categories, accounts, categoryRules, defaultAccount, defaultPayment, onClose, onSave, saving }) {
  const [step, setStep] = useState("category"); // category -> amount -> details
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

  function handlePickCategory(t, catName) {
    setType(t);
    setCategory(catName);
    setStep("amount");
  }
  function handlePickVirement() {
    setType("Virement");
    setCategory(null);
    setStep("amount");
  }
  function confirmAmount() {
    const amt = calc.result();
    if (!amt || amt <= 0) { setError("Le montant doit être supérieur à zéro."); return; }
    setError("");
    setStep("details");
  }
  function goBackFromAmount() {
    setStep("category");
  }
  function goBackFromDetails() {
    setStep("amount");
  }

  function handleConfirm() {
    const amt = calc.result();
    const tags = tagsText.split(",").map((s) => s.trim()).filter(Boolean);
    if (type === "Virement") {
      if (compte === compteDestination) { setError("Les comptes source et cible doivent être différents."); return; }
      onSave({
        title: title.trim() || `${compte} → ${compteDestination}`, amount: amt, category: null,
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

  if (step === "category") {
    return <CategoryPickerSheet categories={categories} onPick={handlePickCategory} onVirement={handlePickVirement} onClose={onClose} />;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--surface-base)", zIndex: 100, display: "flex", flexDirection: "column", fontFamily: "var(--font-core)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "calc(env(safe-area-inset-top, 0px) + var(--space-4)) var(--gutter-screen) var(--space-3)" }}>
        <button onClick={step === "amount" ? goBackFromAmount : goBackFromDetails} style={{ background: "var(--surface-raised)", boxShadow: "var(--elev-raised-sm)", border: "none", width: 40, height: 40, borderRadius: "var(--radius-round)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 18 }}>
          ‹
        </button>
        <span style={{ font: "600 17px var(--font-core)", color: "var(--text-primary)" }}>{step === "amount" ? "Montant" : "Détails"}</span>
      </div>

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
