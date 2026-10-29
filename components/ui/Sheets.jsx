import { Check } from "lucide-react";
import { BottomSheet, useSheetClose } from "./BottomSheet";

// Restes de l'ancien système de feuilles, gardés pour les écrans pas encore migrés (Réglages,
// simulateur PEA, connexion). OptionSheet garde son API mais s'appuie désormais sur BottomSheet :
// toutes les listes de choix s'ouvrent du bas, au pouce, avec la même animation et le même
// glissé pour fermer. Les nouveaux écrans utilisent PickerField directement.

function OptionList({ options, value, onSelect }) {
  const close = useSheetClose();
  return (
    <div role="listbox">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="option"
          aria-selected={o === value}
          className="fin-option"
          onClick={() => { onSelect(o); close?.(); }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>{o}</span>
          {o === value ? <Check size={18} color="var(--accent-orange)" aria-hidden="true" /> : null}
        </button>
      ))}
    </div>
  );
}

// onSelect est appelé tout de suite ; onClose à la fin de l'animation de sortie.
export function OptionSheet({ title, options, value, onSelect, onClose }) {
  return (
    <BottomSheet title={title} zIndex={60} onClose={onClose}>
      <OptionList options={options} value={value} onSelect={onSelect} />
    </BottomSheet>
  );
}

export function Field({ label, children }) {
  return (
    <div style={{ marginBottom: "var(--space-4)" }}>
      <div className="fin-label">{label}</div>
      {children}
    </div>
  );
}

// Même rendu que .fin-input (globals.css). 16 px minimum : en dessous, Safari iOS zoome au focus.
export const fieldInputStyle = { width: "100%", minHeight: 52, background: "var(--surface-raised)", border: "1px solid var(--border-token)", borderRadius: "var(--radius-control)", padding: "0 16px", color: "var(--text-primary)", fontSize: 16, boxSizing: "border-box", fontFamily: "var(--font-core)", outline: "none" };
export const fieldPickerStyle = { ...fieldInputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: "pointer", textAlign: "left" };
