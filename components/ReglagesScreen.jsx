import React, { useState, useEffect, useRef } from "react";
import { Sun, Moon, ChevronRight, LogOut, Key, Trash2, Copy, Check, Download, Upload, Tag, FileDown, Wallet, Zap, User, SlidersHorizontal, Award, X } from "lucide-react";
import { Card, Divider, Switch } from "./ui/Primitives";
import { ListRow, ManagedRow, AddRow } from "./ui/ListRow";
import { BottomSheet, useSheetClose } from "./ui/BottomSheet";
import { TextField } from "./ui/TextField";
import { BankBadge } from "./AccountCardStack";
import { NavBar } from "./ui/Navigation";
import { Button } from "./ui/Button";
import { fieldInputStyle } from "./ui/Sheets";
import { DEFAULT_PAYMENTS, SHORTCUT_URL_DEPENSE, SHORTCUT_URL_REVENU, BANK_PRESETS, TIER_LIMITS } from "../lib/constants";
import { api } from "../lib/api";
import { transactionsToCSV, downloadFile } from "../lib/export";
import { categoryColor, categoryIcon } from "../lib/format";
import { supabaseClient } from "../lib/supabaseClient";
import { describeAuthError } from "../lib/authErrors";
import { haptic, isHapticsEnabled, setHapticsEnabled } from "../lib/haptics";

const sectionLabelStyle = { color: "var(--text-tertiary)", font: "var(--text-caption-font)", display: "block", marginBottom: "var(--space-3)" };

// Teintes proposées pour les catégories : assez saturées pour se distinguer, assez douces pour
// rester lisibles en thème sombre comme clair. Aucune ne reprend l'orange de marque.
const CATEGORY_PALETTE = ["#E5484D", "#F76B15", "#FFB224", "#E2C044", "#8DB600", "#46A758", "#12A594", "#00A2C7", "#3E63DD", "#6E56CF", "#AB4ABA", "#D6409F"];

function BankOptions({ value, onSelect }) {
  const close = useSheetClose();
  const options = [{ id: null, name: "Aucune banque" }, ...BANK_PRESETS];
  return (
    <div role="listbox">
      {options.map((b) => (
        <button key={b.id || "none"} type="button" role="option" aria-selected={value === b.id} className="fin-option" onClick={() => { onSelect(b.id); close?.(); }}>
          {b.id ? <BankBadge bankId={b.id} bankPresets={BANK_PRESETS} /> : <span className="fin-mrow__ghost" />}
          <span style={{ flex: 1, minWidth: 0 }}>{b.name}</span>
          {value === b.id ? <Check size={18} color="var(--accent-orange)" aria-hidden="true" /> : null}
        </button>
      ))}
    </div>
  );
}

function ColorOptions({ value, onSelect }) {
  const close = useSheetClose();
  const current = String(value || "").toLowerCase();
  return (
    <>
      <div className="fin-palette">
        {CATEGORY_PALETTE.map((c) => (
          <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={current === c.toLowerCase()} style={{ background: c }} onClick={() => { onSelect(c); close?.(); }} />
        ))}
      </div>
      <label className="fin-option" style={{ position: "relative" }}>
        <span style={{ width: 24, height: 24, borderRadius: "50%", background: value, border: "1px solid var(--border-token)", flexShrink: 0 }} />
        <span style={{ flex: 1 }}>Autre couleur…</span>
        <input type="color" value={value} onChange={(e) => onSelect(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
      </label>
    </>
  );
}

function SheetCancel({ disabled }) {
  const close = useSheetClose();
  return <Button variant="ghost" block disabled={disabled} onClick={() => close?.()}>Annuler</Button>;
}

function ConfirmButtons({ confirmLabel, onConfirm }) {
  const close = useSheetClose();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <Button variant="danger" block onClick={() => { onConfirm(); close?.(); }}><Trash2 size={18} aria-hidden="true" /> {confirmLabel}</Button>
      <SheetCancel />
    </div>
  );
}

// Changement du mot de passe, connecté : nouveau mot de passe saisi deux fois (une faute de frappe
// bloquerait la prochaine connexion). Lien par email en secours, pour qui préfère passer par là.
function PasswordSheet({ email, onClose }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const blocker = password.length < 6 ? "Au moins 6 caractères" : password !== confirm ? "Les deux mots de passe doivent être identiques" : "";

  async function save() {
    setBusy(true); setError("");
    try {
      const { error: err } = await supabaseClient.auth.updateUser({ password });
      if (err) throw err;
      setDone("Mot de passe changé. Il servira dès ta prochaine connexion.");
      setPassword(""); setConfirm("");
    } catch (e) { setError(describeAuthError(e).text); } finally { setBusy(false); }
  }
  async function sendLink() {
    setBusy(true); setError("");
    try {
      const { error: err } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (err) throw err;
      setDone(`Lien envoyé à ${email}. Ouvre-le sur cet iPhone pour choisir un nouveau mot de passe.`);
    } catch (e) { setError(describeAuthError(e).text); } finally { setBusy(false); }
  }

  return (
    <BottomSheet
      title="Changer le mot de passe"
      onClose={onClose}
      footer={
        <>
          {error ? <div className="fin-error" role="alert" style={{ marginTop: 0, marginBottom: "var(--space-3)" }}>{error}</div> : null}
          <Button variant="primary" block loading={busy} disabled={Boolean(blocker)} onClick={save}>Enregistrer</Button>
          {blocker && (password || confirm) ? <div className="fin-tx-hint">{blocker}</div> : null}
        </>
      }
    >
      {done ? <div role="status" style={{ marginBottom: "var(--space-4)", color: "var(--accent-amber)", fontSize: 15, fontWeight: 600 }}>{done}</div> : null}
      <TextField label="Nouveau mot de passe" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <TextField label="Confirme-le" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <Button variant="ghost" block disabled={busy} onClick={sendLink}>Recevoir plutôt un lien par email</Button>
    </BottomSheet>
  );
}

function ApiKeysSection() {
  const [keys, setKeys] = useState(null); // null = pas encore chargé
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreated, setJustCreated] = useState(null); // { label, token } — affiché une seule fois
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/api-keys").then(setKeys).catch((e) => setError(e.message));
  }, []);

  async function handleCreate() {
    setCreating(true);
    setError("");
    try {
      const { token } = await api("/api/api-keys", { method: "POST", body: { label: label.trim() || null } });
      setJustCreated({ label: label.trim() || "Sans nom", token });
      setLabel("");
      const updated = await api("/api/api-keys");
      setKeys(updated);
    } catch (e) { setError(e.message); } finally { setCreating(false); }
  }

  async function handleDelete(id) {
    try {
      await api(`/api/api-keys/${id}`, { method: "DELETE" });
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (e) { setError(e.message); }
  }

  function handleCopy() {
    navigator.clipboard?.writeText(justCreated.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Trois étapes numérotées, dans l'ordre où on les fait vraiment : sans clé, le raccourci
  // installé ne sert à rien, donc la clé vient en premier.
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div>
        <StepTitle n={1}>Crée ta clé personnelle</StepTitle>
        {justCreated ? (
          <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Copie-la maintenant : elle ne sera plus jamais affichée.</span>
            <code style={{ fontSize: 12, background: "var(--surface-inset)", padding: "10px 12px", borderRadius: "var(--radius-sm)", overflowX: "auto", whiteSpace: "nowrap" }}>{justCreated.token}</code>
            <Button block onClick={handleCopy}>{copied ? <><Check size={16} aria-hidden="true" /> Copiée</> : <><Copy size={16} aria-hidden="true" /> Copier la clé</>}</Button>
          </Card>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <input style={fieldInputStyle} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom de l'appareil (facultatif)" aria-label="Nom de la clé" />
            <Button loading={creating} onClick={handleCreate} style={{ flexShrink: 0 }}>Créer</Button>
          </div>
        )}
      </div>

      <div>
        <StepTitle n={2}>Installe les raccourcis</StepTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <a href={SHORTCUT_URL_DEPENSE} target="_blank" rel="noopener noreferrer" style={shortcutLinkStyle}>
            <Download size={18} color="var(--icon-primary)" />
            <span style={{ flex: 1, color: "var(--text-primary)", fontSize: 15, fontWeight: 600 }}>Ajouter une dépense</span>
            <ChevronRight size={16} color="var(--text-tertiary)" />
          </a>
          <a href={SHORTCUT_URL_REVENU} target="_blank" rel="noopener noreferrer" style={shortcutLinkStyle}>
            <Download size={18} color="var(--icon-primary)" />
            <span style={{ flex: 1, color: "var(--text-primary)", fontSize: 15, fontWeight: 600 }}>Ajouter un revenu</span>
            <ChevronRight size={16} color="var(--text-tertiary)" />
          </a>
        </div>
      </div>

      <div>
        <StepTitle n={3}>Colle ta clé dans chaque raccourci</StepTitle>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text-secondary)" }}>
          Dans l'app Raccourcis, touche « … » sur le raccourci, puis le tout premier bloc : remplace le texte factice par ta clé.
        </div>
      </div>

      <div>
        <span style={sectionLabelStyle}>TES CLÉS</span>
        <Card padding="md">
          {keys === null && <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Chargement…</div>}
          {keys?.length === 0 && <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Aucune clé pour l'instant.</div>}
          {keys?.map((k, i) => (
            <React.Fragment key={k.id}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                Icon={Key}
                title={k.label || "Sans nom"}
                subtitle={k.last_used_at ? `Dernière utilisation : ${new Date(k.last_used_at).toLocaleDateString("fr-FR")}` : "Jamais utilisée"}
                trailing={<button type="button" aria-label={`Supprimer la clé ${k.label || "sans nom"}`} onClick={() => handleDelete(k.id)} style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer" }}><Trash2 size={16} color="var(--red)" /></button>}
              />
            </React.Fragment>
          ))}
        </Card>
        {error && <div style={{ color: "var(--red)", fontSize: 13, marginTop: 8 }}>{error}</div>}
      </div>
    </div>
  );
}

const shortcutLinkStyle = { display: "flex", alignItems: "center", gap: "var(--space-3)", textDecoration: "none", padding: "var(--space-4)", borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", border: "1px solid var(--border-token)" };

function StepTitle({ n, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "var(--space-3)" }}>
      <span aria-hidden="true" style={{ width: 24, height: 24, flexShrink: 0, borderRadius: "50%", background: "var(--accent-orange)", color: "var(--on-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>{n}</span>
      <span style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 600 }}>{`Étape ${n} · `}{children}</span>
    </div>
  );
}

function ToggleRow({ Icon, label, checked, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 48 }}>
      <Icon size={18} color="var(--icon-secondary)" style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 15 }}>{label}</span>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

function MenuRow({ Icon, title, subtitle, onClick, mkRef }) {
  return (
    <ListRow
      ref={mkRef}
      Icon={Icon}
      title={title}
      subtitle={subtitle}
      onClick={onClick}
      trailing={<ChevronRight size={16} color="var(--grey-3)" />}
    />
  );
}

export function ReglagesScreen(props) {
  const {
    categories, coreAccounts, savingsAccounts, accountNames,
    onDeleteCategory, onAddCategory, onRenameCategory, newCatName, setNewCatName,
    onAddAccount, onDeleteAccount, onRenameAccount, onChangeAccountBank, newAccName, setNewAccName,
    themeMode, onToggleTheme,
    defaultPayment, defaultAccount, onChangeDefaultPayment, onChangeDefaultAccount,
    showAccountFilter, onToggleShowAccountFilter, groupBudgetByAccount, onToggleGroupBudgetByAccount,
    categoryRules, onCreateCategoryRule, onDeleteCategoryRule,
    onChangeCategoryColor,
    transactions, plan, openOptions, userEmail, onSignOut, onDeleteUserAccount, getMenuRef, onImportComplete,
  } = props;

  const [section, setSection] = useState(null); // null = menu principal
  const [hapticsOn, setHapticsOn] = useState(true);
  useEffect(() => { setHapticsOn(isHapticsEnabled()); }, []); // lu côté client uniquement (localStorage)
  const isLight = themeMode === "light";
  const [newRuleKeyword, setNewRuleKeyword] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState(categories[0]?.name || "");
  const categoryNames = categories.map((c) => c.name);
  const [bankSheetFor, setBankSheetFor] = useState(null); // compte dont on choisit la banque
  const [colorSheetFor, setColorSheetFor] = useState(null); // catégorie dont on choisit la couleur
  const [pendingDelete, setPendingDelete] = useState(null); // { kind, id, name } en attente de confirmation
  const [passwordSheet, setPasswordSheet] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const bankName = (id) => BANK_PRESETS.find((b) => b.id === id)?.name || "Choisir la banque";
  // Icône de la catégorie sur une pastille teintée de sa couleur, avec un point de la couleur pure :
  // la couleur se lit sans gros rond criard, et toucher l'icône ouvre le choix de couleur.
  const CategorySwatch = ({ category }) => {
    const color = categoryColor(categories, category.name);
    return (
      <button
        type="button"
        className="fin-cat-swatch"
        aria-label={`Couleur de ${category.name}`}
        onClick={() => setColorSheetFor(category)}
        style={{ "--swatch": color, background: `color-mix(in srgb, ${color} 22%, var(--surface-highlight))` }}
      >
        <img src={categoryIcon(categories, category.name)} alt="" width={20} height={20} />
      </button>
    );
  };

  const exportableTransactions = (() => {
    if (!plan?.limits.exportMonths) return transactions;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - plan.limits.exportMonths);
    return transactions.filter((t) => new Date(t.date) >= cutoff);
  })();

  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const importInputRef = useRef(null);
  const [expandedCatFamily, setExpandedCatFamily] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { imported, errors } | { error }
  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de resélectionner le même fichier après une correction
    if (!file) return;
    setImporting(true); setImportResult(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rows = Array.isArray(parsed) ? parsed : parsed.transactions;
      if (!Array.isArray(rows)) throw new Error("Le fichier ne contient pas une liste de transactions reconnaissable.");
      const result = await api("/api/transactions/import", { method: "POST", body: { transactions: rows } });
      setImportResult(result);
      if (result.imported > 0 && onImportComplete) onImportComplete();
    } catch (e) {
      setImportResult({ imported: 0, errors: [e.message] });
    } finally {
      setImporting(false);
    }
  }
  async function confirmDeleteAccount() {
    setDeleting(true); setDeleteError("");
    try { await onDeleteUserAccount(); } catch (e) { setDeleteError(e.message); setDeleting(false); }
  }
  async function startCheckout(tier) {
    setBillingLoading(true); setBillingError("");
    try {
      const { url } = await api("/api/billing/checkout", { method: "POST", body: { tier } });
      window.location.href = url;
    } catch (e) { setBillingError(e.message); setBillingLoading(false); }
  }
  async function openPortal() {
    setBillingLoading(true); setBillingError("");
    try {
      const { url } = await api("/api/billing/portal", { method: "POST" });
      window.location.href = url;
    } catch (e) { setBillingError(e.message); setBillingLoading(false); }
  }

  if (section) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <NavBar back title={section} onBack={() => setSection(null)} />

        {section === "Comptes" && (
          <>
            <div>
              <span style={sectionLabelStyle}>COMPTES PRINCIPAUX</span>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>Les deux cartes de l'accueil. Touche la carte pour choisir la banque.</div>
              <Card padding="sm">
                {coreAccounts.map((a) => (
                  <ManagedRow
                    key={a.id}
                    leading={<button type="button" className="fin-mrow__icon" style={{ width: 44 }} aria-label={`Banque de ${a.name}`} onClick={() => setBankSheetFor(a)}><BankBadge bankId={a.bank_id} bankPresets={BANK_PRESETS} /></button>}
                    name={a.name}
                    subtitle={bankName(a.bank_id)}
                    onClick={() => setBankSheetFor(a)}
                    onRename={(newName) => onRenameAccount(a.id, newName)}
                    onDelete={() => setPendingDelete({ kind: "compte", id: a.id, name: a.name })}
                  />
                ))}
              </Card>
            </div>

            <div>
              <span style={sectionLabelStyle}>ÉPARGNE</span>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>Livrets et comptes d'épargne, affichés à part sur le tableau de bord.</div>
              <Card padding="sm">
                {savingsAccounts.map((a) => (
                  <ManagedRow
                    key={a.id}
                    leading={<button type="button" className="fin-mrow__icon" style={{ width: 44 }} aria-label={`Banque de ${a.name}`} onClick={() => setBankSheetFor(a)}><BankBadge bankId={a.bank_id} bankPresets={BANK_PRESETS} /></button>}
                    name={a.name}
                    subtitle={bankName(a.bank_id)}
                    onClick={() => setBankSheetFor(a)}
                    onRename={(newName) => onRenameAccount(a.id, newName)}
                    onDelete={() => setPendingDelete({ kind: "compte", id: a.id, name: a.name })}
                  />
                ))}
                <AddRow placeholder="Nouveau livret" leading={<span className="fin-mrow__icon" style={{ width: 44 }}><span className="fin-mrow__ghost">+</span></span>} onAdd={(name) => onAddAccount(name)} />
              </Card>
            </div>
          </>
        )}

        {section === "Catégories" && (
          <>
            <div>
              <span style={sectionLabelStyle}>CATÉGORIES</span>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>Touche une famille pour voir ses sous-catégories, et son icône pour changer de couleur.</div>
              <Card padding="sm">
                {categories.filter((c) => !c.parent_id).map((fam) => {
                  const children = categories.filter((c) => c.parent_id === fam.id);
                  const isOpen = expandedCatFamily === fam.id;
                  return (
                    <React.Fragment key={fam.id}>
                      <ManagedRow
                        leading={<CategorySwatch category={fam} />}
                        name={fam.name}
                        subtitle={children.length > 0 ? `${children.length} sous-catégorie${children.length > 1 ? "s" : ""}` : null}
                        onClick={children.length > 0 ? () => setExpandedCatFamily(isOpen ? null : fam.id) : undefined}
                        trailingExtra={children.length > 0 ? <ChevronRight size={16} color="var(--grey-3)" aria-hidden="true" style={{ flexShrink: 0, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform var(--duration-micro) var(--ease-standard)" }} /> : null}
                        onRename={(newName) => onRenameCategory(fam.id, newName)}
                        onDelete={() => setPendingDelete({ kind: "catégorie", id: fam.id, name: fam.name })}
                      />
                      {isOpen && children.map((c) => (
                        <ManagedRow
                          key={c.id}
                          indent={20}
                          leading={<CategorySwatch category={c} />}
                          name={c.name}
                          onRename={(newName) => onRenameCategory(c.id, newName)}
                          onDelete={() => setPendingDelete({ kind: "catégorie", id: c.id, name: c.name })}
                        />
                      ))}
                    </React.Fragment>
                  );
                })}
                <AddRow placeholder="Nouvelle catégorie" leading={<span className="fin-mrow__ghost fin-mrow__ghost--square">+</span>} onAdd={(name) => onAddCategory(name)} />
              </Card>
            </div>

            <div>
              <span style={sectionLabelStyle}>CATÉGORISATION AUTOMATIQUE</span>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>Si le titre d'une dépense contient ce mot, la catégorie se remplit toute seule.</div>
              <Card padding="sm">
                {(categoryRules || []).map((r) => (
                  <div key={r.id} className="fin-mrow">
                    <span className="fin-mrow__main" style={{ cursor: "default" }}>
                      <span className="fin-mrow__title">« {r.keyword} »</span>
                      <span className="fin-mrow__sub">→ {r.category}</span>
                    </span>
                    <button type="button" className="fin-mrow__icon" aria-label={`Supprimer la règle ${r.keyword}`} onClick={() => onDeleteCategoryRule(r.id)}><Trash2 size={17} color="var(--red)" /></button>
                  </div>
                ))}
                <AddRow
                  placeholder="Mot-clé (ex. Netflix)"
                  leading={<span className="fin-mrow__ghost fin-mrow__ghost--square">+</span>}
                  extra={
                    <button type="button" className="fin-chip" style={{ maxWidth: 110, flexShrink: 0 }} onMouseDown={(e) => e.preventDefault()} onClick={() => openOptions({ title: "Catégorie", options: categoryNames, value: newRuleCategory, onSelect: setNewRuleCategory })}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{newRuleCategory}</span>
                    </button>
                  }
                  onAdd={(keyword) => onCreateCategoryRule({ keyword, category: newRuleCategory })}
                />
              </Card>
            </div>
          </>
        )}

        {section === "Raccourci iOS" && (
          <>
            <ApiKeysSection />
            <div>
              <span style={sectionLabelStyle}>VALEURS PAR DÉFAUT</span>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>Utilisées quand le raccourci ne précise rien, modifiables à chaque saisie.</div>
              <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <ListRow title="Moyen de paiement" subtitle={null} onClick={() => openOptions({ title: "Moyen de paiement par défaut", options: DEFAULT_PAYMENTS, value: defaultPayment, onSelect: onChangeDefaultPayment })} trailing={<span style={{ color: "var(--text-tertiary)", fontSize: 15, display: "flex", alignItems: "center", gap: 4 }}>{defaultPayment}<ChevronRight size={16} /></span>} />
                <Divider inset={0} />
                <ListRow title="Compte" onClick={() => openOptions({ title: "Compte par défaut", options: accountNames, value: defaultAccount || accountNames[0], onSelect: onChangeDefaultAccount })} trailing={<span style={{ color: "var(--text-tertiary)", fontSize: 15, display: "flex", alignItems: "center", gap: 4 }}>{defaultAccount || accountNames[0] || "Aucun"}<ChevronRight size={16} /></span>} />
              </Card>
            </div>
          </>
        )}

        {section === "Export" && (
          <div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>
              {plan?.limits.exportMonths
                ? `Palier ${plan.limits.label} : export limité aux ${plan.limits.exportMonths} derniers mois. Passe à un palier supérieur pour l'historique complet.`
                : "Toutes tes transactions, à garder de ton côté, indépendamment de l'app."}
            </div>
            <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <ListRow
                Icon={FileDown}
                title="Exporter en CSV"
                onClick={() => downloadFile(transactionsToCSV(exportableTransactions), `transactions-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv")}
                trailing={<ChevronRight size={16} color="var(--grey-3)" />}
              />
              <Divider />
              <ListRow
                Icon={FileDown}
                title="Exporter en JSON"
                onClick={() => downloadFile(JSON.stringify(exportableTransactions, null, 2), `transactions-${new Date().toISOString().slice(0, 10)}.json`, "application/json")}
                trailing={<ChevronRight size={16} color="var(--grey-3)" />}
              />
            </Card>

            <div style={{ marginTop: "var(--space-4)" }}>
              <span style={sectionLabelStyle}>IMPORTER</span>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>
                Fichier JSON au même format que l'export. Chaque catégorie et chaque compte doit déjà exister exactement sous ce nom — sinon l'import entier est rejeté, avec le détail des lignes à corriger, rien n'est importé à moitié.
              </div>
              <input ref={importInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} style={{ display: "none" }} />
              <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <ListRow
                  Icon={Upload}
                  title={importing ? "Import en cours…" : "Importer un fichier JSON"}
                  onClick={() => !importing && importInputRef.current?.click()}
                  trailing={<ChevronRight size={16} color="var(--grey-3)" />}
                />
              </Card>
              {importResult && (
                <Card padding="md" style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {importResult.imported > 0 ? (
                    <span style={{ fontSize: 14, color: "var(--green)", fontWeight: 600 }}>{importResult.imported} transaction{importResult.imported > 1 ? "s" : ""} importée{importResult.imported > 1 ? "s" : ""}.</span>
                  ) : (
                    <span style={{ fontSize: 14, color: "var(--red)", fontWeight: 600 }}>Rien n'a été importé — {importResult.errors.length} erreur{importResult.errors.length > 1 ? "s" : ""} à corriger :</span>
                  )}
                  {importResult.errors?.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto" }}>
                      {importResult.errors.map((err, i) => (
                        <span key={i} style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{err}</span>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        )}

        {section === "Abonnement" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>PALIER ACTUEL</span>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{plan?.limits.label || "…"}</div>
                {plan?.currentPeriodEnd && (
                  <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>
                    {plan.cancelAtPeriodEnd
                      ? `Annulation effective le ${new Date(plan.currentPeriodEnd).toLocaleDateString("fr-FR")}`
                      : `Renouvellement le ${new Date(plan.currentPeriodEnd).toLocaleDateString("fr-FR")}`}
                  </div>
                )}
              </div>
              {billingError && <div style={{ color: "var(--red)", fontSize: 13 }}>{billingError}</div>}
              {(plan?.tier === "confirme" || plan?.tier === "investisseur") && plan?.stripeStatus && (
                <button onClick={openPortal} disabled={billingLoading} style={{ background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", color: "var(--text-primary)", border: "none", borderRadius: "var(--radius-control)", padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: billingLoading ? 0.6 : 1 }}>
                  Gérer mon abonnement
                </button>
              )}
              {(plan?.tier === "confirme" || plan?.tier === "investisseur") && !plan?.stripeStatus && (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Palier accordé manuellement, rien à gérer ici.</div>
              )}
            </Card>

            {["amateur", "confirme", "investisseur"].map((tierKey) => {
              const t = TIER_LIMITS[tierKey];
              const isCurrent = plan?.tier === tierKey;
              const tierOrder = ["amateur", "confirme", "investisseur"];
              const isDowngrade = plan && tierOrder.indexOf(tierKey) < tierOrder.indexOf(plan.tier);
              const rows = [
                { label: "Comptes", value: t.accounts === null ? "Illimités" : String(t.accounts) },
                { label: "Objectifs", value: t.goals === null ? "Illimités" : String(t.goals) },
                { label: "Export de l'historique", value: t.exportMonths === null ? "Complet" : `${t.exportMonths} derniers mois` },
                { label: "Couleurs de catégorie personnalisées", value: t.customColors },
                { label: "Catégorisation automatique", value: t.autoRules },
              ];
              return (
                <Card key={tierKey} padding="lg" style={{ display: "flex", flexDirection: "column", gap: 14, border: isCurrent ? "2px solid var(--accent-bg)" : "2px solid transparent" }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ font: "700 19px var(--font-display)", color: "var(--text-primary)" }}>{t.label}</span>
                    <span style={{ font: "600 16px var(--font-core)", color: "var(--text-secondary)" }}>{t.price === 0 ? "Gratuit" : `${t.price.toFixed(2).replace(".", ",")} €/mois`}</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {rows.map((r) => (
                      <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                        {typeof r.value === "boolean" ? (
                          r.value ? <Check size={16} color="var(--green)" style={{ flexShrink: 0 }} /> : <X size={16} color="var(--grey-3)" style={{ flexShrink: 0 }} />
                        ) : (
                          <Check size={16} color="var(--green)" style={{ flexShrink: 0 }} />
                        )}
                        <span style={{ color: typeof r.value === "boolean" && !r.value ? "var(--text-tertiary)" : "var(--text-primary)", flex: 1 }}>{r.label}</span>
                        {typeof r.value !== "boolean" && <span style={{ color: "var(--text-tertiary)", fontWeight: 600 }}>{r.value}</span>}
                      </div>
                    ))}
                  </div>

                  {isCurrent ? (
                    <div style={{ textAlign: "center", padding: "12px 0", fontSize: 14, fontWeight: 600, color: "var(--text-tertiary)" }}>Palier actuel</div>
                  ) : isDowngrade ? (
                    <div style={{ textAlign: "center", padding: "12px 0", fontSize: 13, color: "var(--text-tertiary)" }}>Rétrograder via "Gérer mon abonnement" ci-dessus</div>
                  ) : (
                    <button onClick={() => startCheckout(tierKey)} disabled={billingLoading || tierKey === "amateur"} style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: tierKey === "amateur" ? "default" : "pointer", opacity: billingLoading ? 0.6 : 1 }}>
                      {tierKey === "amateur" ? "Palier de départ" : `Passer à ${t.label}`}
                    </button>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {section === "Compte" && (
          <>
            <Card padding="sm">
              <div className="fin-mrow">
                <span className="fin-mrow__main" style={{ cursor: "default" }}>
                  <span className="fin-mrow__sub">Connecté avec</span>
                  <span className="fin-mrow__title">{userEmail}</span>
                </span>
              </div>
              <div className="fin-mrow">
                <button type="button" className="fin-mrow__main" onClick={() => setPasswordSheet(true)}>
                  <span className="fin-mrow__title">Changer le mot de passe</span>
                </button>
                <ChevronRight size={16} color="var(--grey-3)" aria-hidden="true" />
              </div>
              <div className="fin-mrow">
                <button type="button" className="fin-mrow__main" onClick={onSignOut}>
                  <span className="fin-mrow__title" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><LogOut size={16} aria-hidden="true" /> Se déconnecter</span>
                </button>
              </div>
            </Card>

            <div>
              <span style={sectionLabelStyle}>ZONE DE DANGER</span>
              <Card padding="sm">
                <div className="fin-mrow">
                  <button type="button" className="fin-mrow__main" onClick={() => { setDeleteError(""); setDeleteConfirmText(""); setConfirmingDelete(true); }}>
                    <span className="fin-mrow__title" style={{ color: "var(--red)", display: "inline-flex", alignItems: "center", gap: 8 }}><Trash2 size={16} aria-hidden="true" /> Supprimer mon compte</span>
                    <span className="fin-mrow__sub">Efface toutes tes données, après confirmation</span>
                  </button>
                </div>
              </Card>
            </div>
          </>
        )}

        {bankSheetFor && (
          <BottomSheet title={`Banque · ${bankSheetFor.name}`} onClose={() => setBankSheetFor(null)}>
            <BankOptions
              value={bankSheetFor.bank_id || null}
              onSelect={(id) => onChangeAccountBank(bankSheetFor.id, id)}
            />
          </BottomSheet>
        )}

        {colorSheetFor && (
          <BottomSheet title={`Couleur · ${colorSheetFor.name}`} onClose={() => setColorSheetFor(null)}>
            <ColorOptions
              value={categoryColor(categories, colorSheetFor.name)}
              onSelect={(c) => onChangeCategoryColor(colorSheetFor.id, c)}
            />
          </BottomSheet>
        )}

        {pendingDelete && (
          <BottomSheet
            title={`Supprimer « ${pendingDelete.name} » ?`}
            onClose={() => setPendingDelete(null)}
            footer={
              <ConfirmButtons
                confirmLabel={`Supprimer ${pendingDelete.kind === "compte" ? "le compte" : "la catégorie"}`}
                onConfirm={() => (pendingDelete.kind === "compte" ? onDeleteAccount(pendingDelete.id) : onDeleteCategory(pendingDelete.id))}
              />
            }
          >
            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.5 }}>
              {pendingDelete.kind === "compte"
                ? "Le compte disparaît de tes listes. Les raccourcis iOS qui l'utilisent par son nom ne le trouveront plus."
                : "La catégorie disparaît de tes listes. Les raccourcis iOS qui l'utilisent par son nom ne la trouveront plus."}
            </p>
          </BottomSheet>
        )}

        {confirmingDelete && (
          <BottomSheet
            title="Supprimer ton compte ?"
            onClose={() => !deleting && setConfirmingDelete(false)}
            footer={
              <>
                {deleteError ? <div className="fin-error" role="alert" style={{ marginTop: 0, marginBottom: "var(--space-3)" }}>{deleteError}</div> : null}
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  <Button variant="danger" block loading={deleting} disabled={deleteConfirmText.trim().toUpperCase() !== "SUPPRIMER"} onClick={confirmDeleteAccount}>
                    <Trash2 size={18} aria-hidden="true" /> Supprimer définitivement
                  </Button>
                  <SheetCancel disabled={deleting} />
                </div>
              </>
            }
          >
            <p style={{ margin: "0 0 var(--space-4)", color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.5 }}>
              Toutes tes transactions, comptes, catégories, objectifs et abonnements suivis seront effacés. Ton abonnement payant, s'il y en a un, sera annulé. C'est irréversible.
            </p>
            <TextField
              label="Pour confirmer, écris SUPPRIMER"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </BottomSheet>
        )}

        {passwordSheet && <PasswordSheet email={userEmail} onClose={() => setPasswordSheet(false)} />}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <NavBar large title="Réglages" />
      {/* Les réglages oui/non se changent ici même : un sous-écran pour un seul interrupteur était une étape de trop. */}
      <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <ToggleRow Icon={isLight ? Sun : Moon} label="Mode clair" checked={isLight} onChange={onToggleTheme} />
        <Divider inset={0} />
        <ToggleRow Icon={SlidersHorizontal} label="Retours haptiques" checked={hapticsOn} onChange={(v) => { setHapticsOn(v); setHapticsEnabled(v); if (v) haptic("light"); }} />
        <Divider inset={0} />
        <ToggleRow Icon={Wallet} label="Filtrer l'activité par compte" checked={showAccountFilter} onChange={onToggleShowAccountFilter} />
        <Divider inset={0} />
        <ToggleRow Icon={Tag} label="Grouper le budget par compte" checked={groupBudgetByAccount} onChange={onToggleGroupBudgetByAccount} />
      </Card>
      <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <MenuRow Icon={Wallet} title="Comptes" onClick={() => setSection("Comptes")} mkRef={getMenuRef?.("Comptes")} />
        <Divider inset={0} />
        <MenuRow Icon={Tag} title="Catégories" onClick={() => setSection("Catégories")} mkRef={getMenuRef?.("Catégories")} />
        <Divider inset={0} />
        <MenuRow Icon={Zap} title="Raccourci iOS" onClick={() => setSection("Raccourci iOS")} mkRef={getMenuRef?.("Raccourci iOS")} />
        <Divider inset={0} />
        <MenuRow Icon={FileDown} title="Export" onClick={() => setSection("Export")} />
        <Divider inset={0} />
        <MenuRow Icon={Award} title="Abonnement" subtitle={plan?.limits.label} onClick={() => setSection("Abonnement")} />
      </Card>
      <Card padding="md">
        <MenuRow Icon={User} title="Compte" subtitle={userEmail} onClick={() => setSection("Compte")} />
      </Card>
    </div>
  );
}
