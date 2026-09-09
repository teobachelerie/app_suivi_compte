import React, { useState, useEffect } from "react";
import { Sun, Moon, ChevronRight, LogOut, Key, Trash2, Copy, Check, Download } from "lucide-react";
import { Card, Divider, Switch } from "./ui/Primitives";
import { ListRow, EditableRow } from "./ui/ListRow";
import { NavBar } from "./ui/Navigation";
import { fieldInputStyle } from "./ui/Sheets";
import { DEFAULT_PAYMENTS, SHORTCUT_URL_DEPENSE, SHORTCUT_URL_REVENU } from "../lib/constants";
import { api } from "../lib/api";

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

  const label_ = { color: "var(--text-tertiary)", font: "var(--text-caption-font)", display: "block", marginBottom: "var(--space-3)" };

  return (
    <div>
      <span style={label_}>RACCOURCIS IOS</span>
      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>
        1. Installe les deux raccourcis ci-dessous. 2. Crée ta clé plus bas. 3. Ouvre chaque raccourci installé, touche son tout premier bloc et colle ta clé à la place du texte factice.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: 16 }}>
        <a href={SHORTCUT_URL_DEPENSE} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", textDecoration: "none", padding: "var(--space-4)", borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--elev-raised-sm)" }}>
          <Download size={18} color="var(--icon-primary)" />
          <span style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 600 }}>Installer "Ajouter une dépense"</span>
        </a>
        <a href={SHORTCUT_URL_REVENU} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", textDecoration: "none", padding: "var(--space-4)", borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--elev-raised-sm)" }}>
          <Download size={18} color="var(--icon-primary)" />
          <span style={{ color: "var(--text-primary)", fontSize: 15, fontWeight: 600 }}>Installer "Ajouter un revenu"</span>
        </a>
      </div>

      {justCreated && (
        <Card padding="md" depth="inset" style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Clé "{justCreated.label}" créée — copie-la maintenant, elle ne sera plus jamais affichée :</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <code style={{ flex: 1, fontSize: 12, background: "var(--surface-raised)", padding: "8px 10px", borderRadius: "var(--radius-sm)", overflowX: "auto", whiteSpace: "nowrap" }}>{justCreated.token}</code>
            <button onClick={handleCopy} style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-sm)", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        </Card>
      )}

      <Card padding="md" style={{ marginBottom: 12 }}>
        {keys === null && <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Chargement…</div>}
        {keys?.length === 0 && <div style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Aucune clé pour l'instant.</div>}
        {keys?.map((k, i) => (
          <React.Fragment key={k.id}>
            {i > 0 ? <Divider /> : null}
            <ListRow
              Icon={Key}
              title={k.label || "Sans nom"}
              subtitle={k.last_used_at ? `Dernière utilisation : ${new Date(k.last_used_at).toLocaleDateString("fr-FR")}` : "Jamais utilisée"}
              trailing={<button onClick={() => handleDelete(k.id)} style={{ background: "transparent", border: "none", cursor: "pointer" }}><Trash2 size={16} color="var(--red)" /></button>}
            />
          </React.Fragment>
        ))}
      </Card>

      {error && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 8 }}>{error}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <input style={fieldInputStyle} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom (ex. iPhone)" />
        <button onClick={handleCreate} disabled={creating} style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "0 18px", fontWeight: 600, cursor: "pointer", boxShadow: "var(--elev-raised-sm)", opacity: creating ? 0.6 : 1 }}>Créer</button>
      </div>
    </div>
  );
}

export function ReglagesScreen({ categories, coreAccounts, savingsAccounts, accountNames, onDeleteCategory, onAddCategory, onRenameCategory, newCatName, setNewCatName, onAddAccount, onDeleteAccount, onRenameAccount, newAccName, setNewAccName, themeMode, onToggleTheme, defaultPayment, defaultAccount, onChangeDefaultPayment, onChangeDefaultAccount, openOptions, userEmail, onSignOut }) {
  const isLight = themeMode === "light";
  const label = { color: "var(--text-tertiary)", font: "var(--text-caption-font)", display: "block", marginBottom: "var(--space-3)" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <NavBar large title="Réglages" />

      <div>
        <span style={label}>APPARENCE</span>
        <Card padding="md" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>{isLight ? <Sun size={16} /> : <Moon size={16} />} Mode clair</span>
          <Switch checked={isLight} onChange={onToggleTheme} />
        </Card>
      </div>

      <div>
        <span style={label}>VALEURS PAR DÉFAUT DU RACCOURCI</span>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>Utilisées à chaque nouvelle dépense, modifiables au cas par cas.</div>
        <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <ListRow title="Moyen de paiement" subtitle={null} onClick={() => openOptions({ title: "Moyen de paiement par défaut", options: DEFAULT_PAYMENTS, value: defaultPayment, onSelect: onChangeDefaultPayment })} trailing={<span style={{ color: "var(--text-tertiary)", fontSize: 15, display: "flex", alignItems: "center", gap: 4 }}>{defaultPayment}<ChevronRight size={16} /></span>} />
          <Divider inset={0} />
          <ListRow title="Compte" onClick={() => openOptions({ title: "Compte par défaut", options: accountNames, value: defaultAccount, onSelect: onChangeDefaultAccount })} trailing={<span style={{ color: "var(--text-tertiary)", fontSize: 15, display: "flex", alignItems: "center", gap: 4 }}>{defaultAccount}<ChevronRight size={16} /></span>} />
        </Card>
      </div>

      <div>
        <span style={label}>CATÉGORIES</span>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>Touchez une catégorie ou l'icône crayon pour la renommer.</div>
        <Card padding="md" style={{ marginBottom: 12 }}>
          {categories.map((c, i) => (
            <React.Fragment key={c.id}>
              {i > 0 ? <Divider /> : null}
              <EditableRow name={c.name} onRename={(newName) => onRenameCategory(c.id, newName)} onDelete={() => onDeleteCategory(c.id)} />
            </React.Fragment>
          ))}
        </Card>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={fieldInputStyle} value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nouvelle catégorie" />
          <button onClick={onAddCategory} style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "0 18px", fontWeight: 600, cursor: "pointer", boxShadow: "var(--elev-raised-sm)" }}>Ajouter</button>
        </div>
      </div>

      <div>
        <span style={label}>COMPTES</span>
        <Card padding="md" style={{ marginBottom: 12 }}>
          {coreAccounts.map((a, i) => (
            <React.Fragment key={a.id}>
              {i > 0 ? <Divider /> : null}
              <EditableRow name={a.name} onRename={(newName) => onRenameAccount(a.id, newName)} onDelete={() => onDeleteAccount(a.id)} />
            </React.Fragment>
          ))}
        </Card>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={fieldInputStyle} value={newAccName} onChange={(e) => setNewAccName(e.target.value)} placeholder="Nouveau compte" />
          <button onClick={onAddAccount} style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "0 18px", fontWeight: 600, cursor: "pointer", boxShadow: "var(--elev-raised-sm)" }}>Ajouter</button>
        </div>
      </div>

      <div>
        <span style={label}>ÉPARGNE</span>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>Livrets et comptes d'épargne, affichés à part sur le tableau de bord.</div>
        <Card padding="md" style={{ marginBottom: 12 }}>
          {savingsAccounts.length === 0 && (
            <div style={{ padding: "4px 0", fontSize: 13, color: "var(--text-tertiary)" }}>Aucun livret pour l'instant.</div>
          )}
          {savingsAccounts.map((a, i) => (
            <React.Fragment key={a.id}>
              {i > 0 ? <Divider /> : null}
              <EditableRow name={a.name} onRename={(newName) => onRenameAccount(a.id, newName)} onDelete={() => onDeleteAccount(a.id)} />
            </React.Fragment>
          ))}
        </Card>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={fieldInputStyle} value={newAccName} onChange={(e) => setNewAccName(e.target.value)} placeholder="Nouveau livret (ex. Livret A)" />
          <button onClick={onAddAccount} style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "0 18px", fontWeight: 600, cursor: "pointer", boxShadow: "var(--elev-raised-sm)" }}>Ajouter</button>
        </div>
      </div>

      <ApiKeysSection />

      <div>
        <span style={label}>COMPTE</span>
        <Card padding="md" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</span>
          <button onClick={onSignOut} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "var(--red)", fontSize: 14, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            <LogOut size={15} /> Déconnexion
          </button>
        </Card>
      </div>
    </div>
  );
}
