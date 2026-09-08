import React from "react";
import { Sun, Moon, ChevronRight } from "lucide-react";
import { Card, Divider, Switch } from "./ui/Primitives";
import { ListRow, EditableRow } from "./ui/ListRow";
import { NavBar } from "./ui/Navigation";
import { fieldInputStyle } from "./ui/Sheets";
import { DEFAULT_PAYMENTS } from "../lib/constants";

export function ReglagesScreen({ categories, coreAccounts, savingsAccounts, accountNames, onDeleteCategory, onAddCategory, onRenameCategory, newCatName, setNewCatName, onAddAccount, onDeleteAccount, onRenameAccount, newAccName, setNewAccName, themeMode, onToggleTheme, defaultPayment, defaultAccount, onChangeDefaultPayment, onChangeDefaultAccount, openOptions }) {
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
    </div>
  );
}
