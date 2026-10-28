import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown, ChevronLeft, Delete, Plus, Trash2, Wallet, X } from "lucide-react";
import { BottomSheet, useSheetClose } from "./ui/BottomSheet";
import { Button } from "./ui/Button";
import { Chip } from "./ui/Chip";
import { categoryIconUrl, fmtEUR, todayInParis, toLocalISODate } from "../lib/format";
import { DEFAULT_PAYMENTS, MONTHS_SHORT_FR } from "../lib/constants";
import { haptic } from "../lib/haptics";

// Saisie d'une transaction en un seul écran (benchmark UX du 28 octobre 2026, docs/BENCHMARK-UX.md) :
// montant et pavé visibles d'emblée, catégorie, compte et date en pastilles déjà remplies, le reste
// replié sous « Plus d'options ». Le même écran sert à l'ajout et à l'édition.

const TYPES = [
  { value: "Dépense", label: "Dépense" },
  { value: "Gain", label: "Revenu" },
  { value: "Virement", label: "Virement" },
];
const OPERATORS = { "+": (a, b) => a + b, "−": (a, b) => a - b, "×": (a, b) => a * b, "÷": (a, b) => (b === 0 ? a : a / b) };
const KEYS = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", ",", "0", "⌫", "+"];
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const parseAmount = (s) => parseFloat(String(s).replace(",", ".")) || 0;
const round2 = (n) => Math.round(n * 100) / 100;

// Calculatrice à deux opérandes (un seul opérateur en attente) : suffit pour « deux achats » ou
// « une note partagée en deux », sans analyseur d'expression.
function useCalculator(initial) {
  const [display, setDisplay] = useState(initial > 0 ? String(round2(initial)).replace(".", ",") : "0");
  const [pending, setPending] = useState(null); // { value, op } | null
  const current = () => parseAmount(display);
  return {
    display,
    digit: (d) => setDisplay((cur) => {
      if (cur === "0") return d;
      const decimals = cur.split(",")[1];
      if (decimals !== undefined && decimals.length >= 2) return cur; // centimes au plus
      return cur.length < 10 ? cur + d : cur;
    }),
    comma: () => setDisplay((cur) => (cur.includes(",") ? cur : cur + ",")),
    back: () => setDisplay((cur) => (cur.length > 1 ? cur.slice(0, -1) : "0")),
    operator: (op) => {
      setPending((prev) => ({ value: prev ? OPERATORS[prev.op](prev.value, current()) : current(), op }));
      setDisplay("0");
    },
    result: () => round2(pending ? OPERATORS[pending.op](pending.value, current()) : current()),
    pending: !!pending,
    expression: pending ? `${String(round2(pending.value)).replace(".", ",")} ${pending.op} ${display}` : null,
  };
}

function dateLabel(iso, todayIso) {
  if (iso === todayIso) return "Aujourd'hui";
  const d = new Date(`${iso}T00:00:00`);
  const t = new Date(`${todayIso}T00:00:00`);
  const diff = Math.round((t - d) / 86400000);
  if (diff === 1) return "Hier";
  if (diff === 2) return "Avant-hier";
  const base = `${d.getDate()} ${MONTHS_SHORT_FR[d.getMonth()]}`;
  return d.getFullYear() === t.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

// « Compte courant » -> « Courant » : même nom court que sur les cartes de l'accueil, pour tenir
// deux pastilles sur une ligne. La valeur enregistrée reste le nom complet (contrat des Raccourcis).
function shortAccount(name) {
  const short = String(name || "").replace(/^compte\s+/i, "");
  return short ? short[0].toUpperCase() + short.slice(1) : name;
}

function shiftDays(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

// Familles et sous-catégories, indexées par nom (les noms servent d'identifiants, voir CLAUDE.md).
function useTaxonomy(categories) {
  return useMemo(() => {
    const byId = new Map(categories.map((c) => [c.id, c]));
    const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
    const families = new Map(); // nom de famille -> { icon, subs: [] }
    for (const c of categories) {
      if (c.parent_id) {
        const parent = byId.get(c.parent_id);
        const name = parent ? parent.name : c.name;
        if (!families.has(name)) families.set(name, { icon: parent?.icon || c.icon, subs: [] });
        families.get(name).subs.push(c);
      } else if (!families.has(c.name)) {
        families.set(c.name, { icon: c.icon, subs: [] });
      }
    }
    const familyOf = (name) => {
      const c = byName.get(String(name || "").toLowerCase());
      if (!c) return null;
      return c.parent_id ? byId.get(c.parent_id)?.name || c.name : c.name;
    };
    const iconOf = (name) => categoryIconUrl(byName.get(String(name || "").toLowerCase())?.icon);
    return { families, familyOf, iconOf };
  }, [categories]);
}

const isIncomeCategory = (tax, name) => tax.familyOf(name) === "Revenus";

function CategoryTile({ icon, label, selected, onClick }) {
  return (
    <button type="button" className="fin-cat-tile" aria-pressed={selected} onClick={onClick}>
      <span className="fin-cat-tile__icon">{icon ? <img src={icon} alt="" width={24} height={24} /> : null}</span>
      <span className="fin-cat-tile__label">{label}</span>
    </button>
  );
}

// Grille des catégories : familles, puis sous-catégories de la famille touchée (la famille elle-même
// reste choisissable en tête, sous son nom simple). Les revenus n'ont qu'une famille : on montre
// directement ses sous-catégories.
function CategoryGrid({ tax, type, value, recents, onPick }) {
  const close = useSheetClose();
  const [family, setFamily] = useState(null);
  const pick = (name) => { haptic("light"); onPick(name); close?.(); };

  if (type === "Gain") {
    const rev = tax.families.get("Revenus");
    return (
      <div className="fin-cat-grid">
        {rev ? <CategoryTile icon={categoryIconUrl(rev.icon)} label="Revenus" selected={value === "Revenus"} onClick={() => pick("Revenus")} /> : null}
        {(rev?.subs || []).map((c) => <CategoryTile key={c.id} icon={categoryIconUrl(c.icon)} label={c.name} selected={value === c.name} onClick={() => pick(c.name)} />)}
      </div>
    );
  }

  if (family) {
    const f = tax.families.get(family);
    return (
      <>
        <button type="button" className="fin-link-back" onClick={() => setFamily(null)}>
          <ChevronLeft size={18} aria-hidden="true" /> Toutes les catégories
        </button>
        <div className="fin-cat-grid">
          <CategoryTile icon={categoryIconUrl(f.icon)} label={family} selected={value === family} onClick={() => pick(family)} />
          {f.subs.map((c) => <CategoryTile key={c.id} icon={categoryIconUrl(c.icon)} label={c.name} selected={value === c.name} onClick={() => pick(c.name)} />)}
        </div>
      </>
    );
  }

  const familyNames = [...tax.families.keys()].filter((n) => n !== "Revenus");
  return (
    <>
      {recents.length ? (
        <>
          <div className="fin-section-label">Récentes</div>
          <div className="fin-cat-grid" style={{ marginBottom: "var(--space-4)" }}>
            {recents.map((name) => <CategoryTile key={name} icon={tax.iconOf(name)} label={name} selected={value === name} onClick={() => pick(name)} />)}
          </div>
          <div className="fin-section-label">Toutes</div>
        </>
      ) : null}
      <div className="fin-cat-grid">
        {familyNames.map((name) => <CategoryTile key={name} icon={categoryIconUrl(tax.families.get(name).icon)} label={name} onClick={() => setFamily(name)} />)}
      </div>
    </>
  );
}

function OptionList({ options, value, onPick }) {
  const close = useSheetClose();
  return (
    <div role="listbox">
      {options.map((o) => (
        <button key={o} type="button" role="option" aria-selected={o === value} className="fin-option" onClick={() => { haptic("light"); onPick(o); close?.(); }}>
          <span style={{ flex: 1 }}>{o}</span>
          {o === value ? <span style={{ color: "var(--accent-orange)", fontWeight: 600 }} aria-hidden="true">✓</span> : null}
        </button>
      ))}
    </div>
  );
}

function DatePicker({ value, todayIso, onPick }) {
  const close = useSheetClose();
  const quick = [0, 1, 2].map((n) => shiftDays(todayIso, -n));
  return (
    <div>
      <OptionList options={quick.map((d) => dateLabel(d, todayIso))} value={dateLabel(value, todayIso)} onPick={(label) => onPick(quick[quick.findIndex((d) => dateLabel(d, todayIso) === label)])} />
      <label className="fin-label" htmlFor="tx-date-other" style={{ marginTop: "var(--space-4)" }}>Autre date</label>
      <input id="tx-date-other" type="date" className="fin-input" value={value} max={todayIso} onChange={(e) => { if (e.target.value) { onPick(e.target.value); close?.(); } }} />
    </div>
  );
}

function Pill({ icon, Icon, label, placeholder, onClick, disabled }) {
  return (
    <button type="button" className="fin-pill" onClick={onClick} disabled={disabled} data-empty={!label || undefined}>
      {icon ? <img src={icon} alt="" width={20} height={20} /> : Icon ? <Icon size={17} aria-hidden="true" /> : null}
      <span className="fin-pill__label">{label || placeholder}</span>
      {!disabled ? <ChevronDown size={15} aria-hidden="true" className="fin-pill__chevron" /> : null}
    </button>
  );
}

export function TransactionSheet({ tx, categories, accounts, transactions, categoryRules, defaultAccount, defaultPayment, saving, onClose, onSave, onDelete }) {
  const editing = !!tx?.id;
  const tax = useTaxonomy(categories);
  const todayIso = useMemo(() => toLocalISODate(todayInParis()), []);
  const accountNames = useMemo(() => accounts.map((a) => a.name), [accounts]);
  const firstAccount = defaultAccount && accountNames.includes(defaultAccount) ? defaultAccount : accountNames[0] || "";

  // Dernières catégories utilisées par type, de la plus récente à la plus ancienne (sans doublon).
  const recentByType = useMemo(() => {
    const out = { Dépense: [], Gain: [] };
    const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
    for (const t of sorted) {
      const list = out[t.type];
      if (list && t.category && !list.includes(t.category) && list.length < 4) list.push(t.category);
    }
    return out;
  }, [transactions]);

  const [type, setType] = useState(tx?.type || "Dépense");
  // Un virement n'a pas de catégorie : rien à préremplir (sans ce garde-fou, ouvrir un virement plantait).
  const [category, setCategory] = useState(() => tx?.category || recentByType[tx?.type]?.[0] || (tx ? null : recentByType["Dépense"][0]) || null);
  const [categoryTouched, setCategoryTouched] = useState(editing);
  const [title, setTitle] = useState(tx?.title || "");
  const [compte, setCompte] = useState(tx?.compte || firstAccount);
  const [compteDestination, setCompteDestination] = useState(tx?.compteDestination || accountNames.find((n) => n !== (tx?.compte || firstAccount)) || firstAccount);
  const [payment, setPayment] = useState(tx?.payment && tx.payment !== "Virement" ? tx.payment : defaultPayment || "Carte bancaire");
  const [date, setDate] = useState(tx?.date || todayIso);
  const [tags, setTags] = useState(tx?.tags || []);
  const [tagDraft, setTagDraft] = useState("");
  const [notes, setNotes] = useState(tx?.notes || "");
  const [splitMode, setSplitMode] = useState(!!tx?.splits?.length);
  const [splits, setSplits] = useState(tx?.splits?.length ? tx.splits.map((s) => ({ category: s.category, amount: String(s.amount).replace(".", ",") })) : []);
  const [showMore, setShowMore] = useState(!!(tx?.notes || tx?.tags?.length || tx?.splits?.length));
  const [typing, setTyping] = useState(false); // un champ texte a le focus : le clavier iOS remplace le pavé
  const [sheet, setSheet] = useState(null); // { kind: "category" | "compte" | "destination" | "date", splitIndex? }
  const [closing, setClosing] = useState(false);
  const calc = useCalculator(tx?.amount || 0);
  const amount = calc.result();
  const isVirement = type === "Virement";

  const requestClose = useCallback(() => {
    if (closing) return;
    if (prefersReducedMotion()) { onClose(); return; }
    setClosing(true);
    window.setTimeout(onClose, 220);
  }, [closing, onClose]);

  // Échap ferme l'écran (sauf si une feuille de choix est ouverte : elle se ferme d'abord).
  useEffect(() => {
    const onKey = (e) => {
      if (sheet || typing) return;
      if (e.key === "Escape") requestClose();
      else if (/^[0-9]$/.test(e.key)) calc.digit(e.key);
      else if (e.key === "," || e.key === ".") calc.comma();
      else if (e.key === "Backspace") calc.back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sheet, typing, requestClose, calc]);

  function changeType(next) {
    haptic("light");
    setType(next);
    if (next === "Virement") return;
    // La catégorie doit rester cohérente avec le type : un revenu ne garde pas « Courses ».
    if (!category || isIncomeCategory(tax, category) !== (next === "Gain")) {
      setCategory(recentByType[next]?.[0] || (next === "Gain" ? "Revenus" : null));
      setCategoryTouched(false);
    }
    if (next !== "Dépense") setSplitMode(false);
  }

  function handleTitle(v) {
    setTitle(v);
    if (categoryTouched || isVirement || !(categoryRules || []).length) return;
    const match = categoryRules.find((r) => v.toLowerCase().includes(r.keyword.toLowerCase()));
    if (match && isIncomeCategory(tax, match.category) === (type === "Gain")) setCategory(match.category);
  }

  // Titres déjà utilisés dans la catégorie choisie, du plus fréquent au moins fréquent.
  const titleSuggestions = useMemo(() => {
    if (isVirement || !category) return [];
    const counts = new Map();
    for (const t of transactions) {
      if (t.category !== category || !t.title) continue;
      const key = t.title.trim();
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).filter((t) => t.toLowerCase() !== title.trim().toLowerCase()).slice(0, 5);
  }, [transactions, category, title, isVirement]);

  const knownTags = useMemo(() => {
    const counts = new Map();
    for (const t of transactions) for (const tag of t.tags || []) counts.set(tag, (counts.get(tag) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 8);
  }, [transactions]);

  function toggleTag(tag) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }
  function commitTagDraft() {
    const clean = tagDraft.replace(/,/g, " ").trim();
    if (clean && !tags.includes(clean)) setTags((prev) => [...prev, clean]);
    setTagDraft("");
  }

  function startSplit() {
    haptic("light");
    setSplitMode(true);
    setSplits([{ category: category || "", amount: amount ? String(amount).replace(".", ",") : "" }, { category: "", amount: "" }]);
  }
  const updateSplit = (i, patch) => setSplits((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const cleanSplits = splits.map((s) => ({ category: s.category, amount: round2(parseAmount(s.amount)) })).filter((s) => s.amount > 0 && s.category);
  const splitsSum = round2(cleanSplits.reduce((s, x) => s + x.amount, 0));

  // Une seule raison affichée à la fois, sous le bouton : l'utilisateur sait toujours quoi faire.
  let blocker = null;
  if (amount <= 0) blocker = "Saisis un montant";
  else if (isVirement && compte === compteDestination) blocker = "Choisis deux comptes différents";
  else if (!isVirement && splitMode && cleanSplits.length < 2) blocker = "Ajoute au moins deux parts";
  else if (!isVirement && splitMode && Math.abs(splitsSum - amount) > 0.009) blocker = `Les parts font ${fmtEUR(splitsSum)} sur ${fmtEUR(amount)}`;
  else if (!isVirement && !splitMode && !category) blocker = "Choisis une catégorie";

  function save() {
    if (blocker || saving) return;
    const base = { id: tx?.id, amount, date, tags, emoji: null, notes: notes.trim() || null };
    if (isVirement) {
      onSave({ ...base, title: title.trim() || `${compte} → ${compteDestination}`, category: null, compte, compteDestination, type, payment: "Virement", splits: null });
      return;
    }
    const mainCategory = splitMode ? cleanSplits.reduce((a, b) => (b.amount > a.amount ? b : a)).category : category;
    onSave({ ...base, title: title.trim() || mainCategory, category: mainCategory, compte, compteDestination: null, type, payment, splits: splitMode ? cleanSplits : null });
  }

  function press(k) {
    haptic("light");
    if (k === "⌫") calc.back();
    else if (k === ",") calc.comma();
    else if (OPERATORS[k]) calc.operator(k);
    else calc.digit(k);
  }

  const showKeypad = !typing;
  const amountColor = type === "Gain" ? "var(--green)" : type === "Dépense" ? "var(--red)" : "var(--text-primary)";
  const sign = type === "Gain" ? "+" : type === "Dépense" ? "−" : "";
  const recents = recentByType[type === "Gain" ? "Gain" : "Dépense"] || [];
  const focusProps = { onFocus: () => setTyping(true), onBlur: () => setTyping(false) };

  return (
    <div className={`fin-tx-root${closing ? " is-closing" : ""}`} role="dialog" aria-modal="true" aria-label={editing ? "Modifier la transaction" : "Nouvelle transaction"}>
      <div className="fin-tx-head">
        <button type="button" className="fin-icon-btn" aria-label="Fermer" onClick={requestClose}><X size={20} /></button>
        <div className="fin-seg" role="tablist" aria-label="Type d'opération">
          {TYPES.map((t) => (
            <button key={t.value} type="button" role="tab" aria-selected={type === t.value} onClick={() => changeType(t.value)}>{t.label}</button>
          ))}
        </div>
        {editing && onDelete ? (
          <button type="button" className="fin-icon-btn fin-icon-btn--danger" aria-label="Supprimer la transaction" onClick={onDelete}><Trash2 size={19} /></button>
        ) : <span style={{ width: 44, flexShrink: 0 }} aria-hidden="true" />}
      </div>

      <div className="fin-tx-body">
        <button type="button" className="fin-tx-amount" onClick={() => document.activeElement?.blur()} aria-label={`Montant : ${fmtEUR(amount)}`}>
          <span className="fin-tx-amount__expr">{calc.expression || " "}</span>
          <span className="fin-tx-amount__value ds-tabular" style={{ color: amount > 0 ? amountColor : "var(--text-tertiary)" }}>
            {amount > 0 && sign ? <span aria-hidden="true">{sign}</span> : null}{calc.pending ? String(amount).replace(".", ",") : calc.display}&nbsp;€
          </span>
        </button>

        {/* Ligne 1 : ce qui change à chaque saisie (catégorie, ou comptes d'un virement). Ligne 2 : le contexte. */}
        <div className={`fin-pill-row${isVirement ? " fin-pill-row--pair" : ""}`}>
          {isVirement ? (
            <>
              <Pill Icon={Wallet} label={shortAccount(compte)} onClick={() => setSheet({ kind: "compte" })} />
              <ArrowRight size={16} color="var(--text-tertiary)" aria-label="vers" style={{ flexShrink: 0 }} />
              <Pill Icon={Wallet} label={shortAccount(compteDestination)} onClick={() => setSheet({ kind: "destination" })} />
            </>
          ) : (
            <Pill icon={splitMode ? null : tax.iconOf(category)} label={splitMode ? "Plusieurs catégories" : category} placeholder="Choisir une catégorie" disabled={splitMode} onClick={() => setSheet({ kind: "category" })} />
          )}
        </div>
        <div className="fin-pill-row fin-pill-row--secondary">
          {!isVirement && accountNames.length > 1 ? <Pill Icon={Wallet} label={shortAccount(compte)} onClick={() => setSheet({ kind: "compte" })} /> : null}
          <Pill Icon={CalendarDays} label={dateLabel(date, todayIso)} onClick={() => setSheet({ kind: "date" })} />
        </div>

        <input
          className="fin-input fin-tx-title"
          value={title}
          onChange={(e) => handleTitle(e.target.value)}
          placeholder={isVirement ? `${compte} → ${compteDestination}` : category ? `Titre (par défaut : ${category})` : "Titre"}
          aria-label="Titre"
          enterKeyHint="done"
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          {...focusProps}
        />
        {titleSuggestions.length ? (
          <div className="fin-chip-row" aria-label="Titres déjà utilisés">
            {titleSuggestions.map((s) => <Chip key={s} onClick={() => { haptic("light"); setTitle(s); }}>{s}</Chip>)}
          </div>
        ) : null}

        <button type="button" className="fin-link-more" aria-expanded={showMore} onClick={() => setShowMore((v) => !v)}>
          {showMore ? "Moins d'options" : "Plus d'options"}
          <ChevronDown size={16} aria-hidden="true" style={{ transform: showMore ? "rotate(180deg)" : "none", transition: "transform var(--duration-micro) var(--ease-standard)" }} />
        </button>

        {showMore ? (
          <div className="fin-tx-more">
            {!isVirement ? (
              <>
                <div className="fin-section-label">Moyen de paiement</div>
                <div className="fin-chip-row">
                  {DEFAULT_PAYMENTS.filter((p) => p !== "Virement" || payment === "Virement").map((p) => (
                    <Chip key={p} selected={payment === p} onClick={() => { haptic("light"); setPayment(p); }}>{p}</Chip>
                  ))}
                </div>
              </>
            ) : null}

            <div className="fin-section-label">Tags</div>
            <div className="fin-chip-row">
              {[...new Set([...tags, ...knownTags])].map((tag) => (
                <Chip key={tag} selected={tags.includes(tag)} onClick={() => { haptic("light"); toggleTag(tag); }}>{tag}</Chip>
              ))}
            </div>
            <input
              className="fin-input"
              value={tagDraft}
              onChange={(e) => {
                // Une virgule valide le tag en cours, comme la touche Entrée.
                const v = e.target.value;
                if (!v.includes(",")) { setTagDraft(v); return; }
                const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
                setTags((prev) => [...prev, ...parts.filter((p) => !prev.includes(p))]);
                setTagDraft("");
              }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commitTagDraft(); } }}
              placeholder="Nouveau tag"
              aria-label="Nouveau tag"
              enterKeyHint="done"
              {...focusProps}
              onBlur={() => { commitTagDraft(); setTyping(false); }}
            />

            {type === "Dépense" ? (
              <>
                <div className="fin-section-label">Répartition</div>
                {!splitMode ? (
                  <button type="button" className="fin-link-more" style={{ marginTop: 0 }} onClick={startSplit}>
                    <Plus size={16} aria-hidden="true" /> Répartir sur plusieurs catégories
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                    {splits.map((s, i) => (
                      <div key={i} style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                        <div style={{ flex: 1, minWidth: 0 }}><Pill icon={tax.iconOf(s.category)} label={s.category} placeholder="Catégorie" onClick={() => setSheet({ kind: "category", splitIndex: i })} /></div>
                        <input className="fin-input ds-tabular" style={{ width: 96, flexShrink: 0 }} value={s.amount} inputMode="decimal" placeholder="0,00" aria-label={`Montant de la part ${i + 1}`} onChange={(e) => updateSplit(i, { amount: e.target.value })} {...focusProps} />
                        <button type="button" className="fin-icon-btn" aria-label={`Retirer la part ${i + 1}`} onClick={() => setSplits((prev) => prev.filter((_, idx) => idx !== i))}><X size={16} /></button>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <button type="button" className="fin-link-more" style={{ marginTop: 0 }} onClick={() => setSplits((prev) => [...prev, { category: "", amount: "" }])}><Plus size={16} aria-hidden="true" /> Ajouter une part</button>
                      <button type="button" className="fin-link-more" style={{ marginTop: 0 }} onClick={() => { setSplitMode(false); setSplits([]); }}>Annuler la répartition</button>
                    </div>
                    <div className="fin-help ds-tabular">Total des parts : {fmtEUR(splitsSum)} sur {fmtEUR(amount)}</div>
                  </div>
                )}
              </>
            ) : null}

            <div className="fin-section-label">Remarques</div>
            <textarea className="fin-input" style={{ minHeight: 72, resize: "none", paddingTop: 12 }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Une note libre (facultatif)" aria-label="Remarques" {...focusProps} />
          </div>
        ) : null}
      </div>

      <div className="fin-tx-foot">
        {showKeypad ? (
          <div className="fin-keypad">
            {KEYS.map((k) => (
              <button key={k} type="button" className={`fin-key${OPERATORS[k] ? " fin-key--op" : ""}`} aria-label={k === "⌫" ? "Effacer" : k} onClick={() => press(k)}>
                {k === "⌫" ? <Delete size={20} aria-hidden="true" /> : k}
              </button>
            ))}
          </div>
        ) : null}
        <Button block loading={saving} disabled={!!blocker} onClick={save}>{editing ? "Enregistrer les modifications" : "Enregistrer"}</Button>
        <div className="fin-tx-hint" aria-live="polite">{blocker || " "}</div>
      </div>

      {sheet?.kind === "category" ? (
        <BottomSheet title="Catégorie" zIndex={120} onClose={() => setSheet(null)}>
          <CategoryGrid
            tax={tax}
            type={type}
            value={sheet.splitIndex != null ? splits[sheet.splitIndex]?.category : category}
            recents={recents}
            onPick={(name) => {
              if (sheet.splitIndex != null) updateSplit(sheet.splitIndex, { category: name });
              else { setCategory(name); setCategoryTouched(true); }
            }}
          />
        </BottomSheet>
      ) : null}
      {sheet?.kind === "compte" || sheet?.kind === "destination" ? (
        <BottomSheet title={sheet.kind === "destination" ? "Vers le compte" : isVirement ? "Depuis le compte" : "Compte"} zIndex={120} onClose={() => setSheet(null)}>
          <OptionList options={accountNames} value={sheet.kind === "destination" ? compteDestination : compte} onPick={sheet.kind === "destination" ? setCompteDestination : setCompte} />
        </BottomSheet>
      ) : null}
      {sheet?.kind === "date" ? (
        <BottomSheet title="Date" zIndex={120} onClose={() => setSheet(null)}>
          <DatePicker value={date} todayIso={todayIso} onPick={setDate} />
        </BottomSheet>
      ) : null}
    </div>
  );
}
