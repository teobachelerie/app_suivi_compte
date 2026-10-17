import { useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { BottomSheet, useSheetClose } from "./BottomSheet";

// Remplace le <select> natif : même apparence que TextField, et la liste s'ouvre dans une feuille
// du bas (identique sur tous les appareils, utilisable au pouce). `options` : chaînes ou
// { value, label, icon? } où icon est l'URL d'une image.
const normalize = (o) => (typeof o === "string" ? { value: o, label: o } : { label: o.value, ...o });

function OptionList({ options, value, onChange }) {
  const close = useSheetClose();
  return (
    <div role="listbox">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="option"
            aria-selected={selected}
            className="fin-option"
            onClick={() => { onChange(o.value); close?.(); }}
          >
            {o.icon ? <img src={o.icon} alt="" width={24} height={24} style={{ flexShrink: 0 }} /> : null}
            <span style={{ flex: 1, minWidth: 0 }}>{o.label}</span>
            {selected ? <Check size={18} color="var(--accent-orange)" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  );
}

export function PickerField({ label, title, value, options, onChange, placeholder = "Choisir", error, disabled = false, zIndex = 60 }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const items = options.map(normalize);
  const current = items.find((o) => o.value === value);
  return (
    <div style={{ marginBottom: "var(--space-4)" }}>
      {label ? <label className="fin-label" htmlFor={id}>{label}</label> : null}
      <button
        id={id}
        type="button"
        className="fin-input"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-describedby={error ? `${id}-error` : undefined}
        disabled={disabled}
        onClick={() => setOpen(true)}
        style={{ cursor: disabled ? "default" : "pointer" }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", minWidth: 0, color: current ? "var(--text-primary)" : "var(--text-tertiary)" }}>
          {current?.icon ? <img src={current.icon} alt="" width={20} height={20} /> : null}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{current ? current.label : placeholder}</span>
        </span>
        <ChevronDown size={18} color="var(--text-tertiary)" aria-hidden="true" style={{ flexShrink: 0 }} />
      </button>
      {error ? <div id={`${id}-error`} className="fin-error" role="alert">{error}</div> : null}
      {open ? (
        <BottomSheet title={title || label} zIndex={zIndex} onClose={() => setOpen(false)}>
          <OptionList options={items} value={value} onChange={onChange} />
        </BottomSheet>
      ) : null}
    </div>
  );
}
