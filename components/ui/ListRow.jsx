import { useState, useEffect, forwardRef } from "react";
import { ChevronRight, Check, Pencil, Trash2, Plus } from "lucide-react";

// `dense` : variante compacte des longues listes (Activité) — pastille et marges réduites,
// sous-titre sur une seule ligne, pour voir plus d'opérations à l'écran.
export const ListRow = forwardRef(function ListRow({ Icon, iconImage, iconColor, title, subtitle, trailing, chevron = false, onClick, style, dense = false }, ref) {
  const tile = dense ? 34 : 40;
  const [pressed, setPressed] = useState(false);
  const interactive = Boolean(onClick);
  return (
    <div
      ref={ref}
      onClick={onClick}
      onPointerDown={() => interactive && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)} // iOS annule le pointeur quand le doigt fait défiler : la ligne ne doit pas rester grisée
      style={{ display: "flex", alignItems: "center", gap: dense ? "var(--space-3)" : "var(--space-4)", minHeight: "var(--hit-min)", padding: dense ? "var(--space-2) 0" : "var(--space-3) 0", borderRadius: "var(--radius-sm)", opacity: pressed ? 0.55 : 1, cursor: interactive ? "pointer" : "default", transition: "opacity var(--duration-micro) var(--ease-standard)", ...style }}
    >
      {iconImage ? (
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: tile, height: tile, flex: "0 0 auto", borderRadius: "var(--radius-sm)", background: "var(--surface-raised)", boxShadow: "var(--elev-raised-sm)" }}>
          <img src={iconImage} alt="" width={dense ? 20 : 22} height={dense ? 20 : 22} style={{ display: "block" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
        </span>
      ) : Icon ? (
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: tile, height: tile, flex: "0 0 auto", borderRadius: "var(--radius-sm)", background: iconColor ? `color-mix(in srgb, ${iconColor} 18%, var(--surface-raised))` : "var(--surface-raised)", boxShadow: "var(--elev-raised-sm)" }}>
          <Icon size={18} color={iconColor || "var(--icon-primary)"} />
        </span>
      ) : null}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", color: "var(--text-primary)", fontFamily: "var(--font-core)", fontSize: "var(--size-callout)", fontWeight: "var(--weight-medium)", letterSpacing: "var(--tracking-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        {subtitle ? <span style={{ display: "block", marginTop: 2, color: "var(--text-tertiary)", fontFamily: "var(--font-core)", fontSize: "var(--size-footnote)", ...(dense ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } : null) }}>{subtitle}</span> : null}
      </span>
      {trailing}
      {chevron ? <ChevronRight size={16} color="var(--grey-3)" /> : null}
    </div>
  );
});

// Ligne d'une liste gérable (comptes, catégories) : élément de tête (mini-carte, icône), nom,
// sous-titre, puis crayon et corbeille. Le crayon passe le nom en champ texte sur place ; la
// coche ou Entrée valide, Échap annule. Sans onClick, toucher la ligne lance aussi le renommage.
export function ManagedRow({ leading, name, subtitle, onClick, onRename, onDelete, trailingExtra, indent = 0 }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  useEffect(() => { if (!editing) setValue(name); }, [name, editing]);

  function commit() {
    const v = value.trim();
    setEditing(false);
    if (v && v !== name) onRename(v); else setValue(name);
  }

  const lead = leading ? <span style={{ display: "inline-flex", flexShrink: 0 }}>{leading}</span> : null;
  if (editing) {
    return (
      <div className="fin-mrow" style={{ paddingLeft: indent }}>
        {lead}
        <input
          className="fin-mrow__input"
          autoFocus
          value={value}
          aria-label="Nouveau nom"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setValue(name); setEditing(false); } }}
          onBlur={commit}
        />
        <button type="button" className="fin-mrow__icon" aria-label="Valider le nom" onMouseDown={(e) => e.preventDefault()} onClick={commit}>
          <Check size={18} color="var(--accent-orange)" />
        </button>
      </div>
    );
  }
  return (
    <div className="fin-mrow" style={{ paddingLeft: indent }}>
      {lead}
      <button type="button" className="fin-mrow__main" onClick={onClick || (() => setEditing(true))}>
        <span className="fin-mrow__title">{name}</span>
        {subtitle ? <span className="fin-mrow__sub">{subtitle}</span> : null}
      </button>
      {trailingExtra}
      <button type="button" className="fin-mrow__icon" aria-label={`Renommer ${name}`} onClick={() => setEditing(true)}>
        <Pencil size={16} color="var(--text-tertiary)" />
      </button>
      <button type="button" className="fin-mrow__icon" aria-label={`Supprimer ${name}`} onClick={onDelete}>
        <Trash2 size={17} color="var(--red)" />
      </button>
    </div>
  );
}

// Dernière ligne d'une liste : un élément vide, déjà à sa place. Toucher le texte ouvre la saisie,
// et « Ajouter » prend la place du crayon et de la corbeille. `extra` s'affiche pendant la saisie
// (ex. choix de la catégorie d'une règle).
export function AddRow({ placeholder, onAdd, leading, extra, inputMode }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const trimmed = value.trim();

  function submit() {
    if (!trimmed) return;
    onAdd(trimmed);
    setValue("");
    setEditing(false);
  }

  return (
    <div className="fin-mrow">
      <span style={{ display: "inline-flex", flexShrink: 0 }}>{leading || <span className="fin-mrow__ghost"><Plus size={16} /></span>}</span>
      {editing ? (
        <>
          <input
            className="fin-mrow__input"
            autoFocus
            value={value}
            placeholder={placeholder}
            aria-label={placeholder}
            inputMode={inputMode}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setValue(""); setEditing(false); } }}
            onBlur={() => { if (!trimmed) setEditing(false); }}
          />
          {extra}
          <button type="button" className="fin-btn fin-btn--primary fin-btn--sm" disabled={!trimmed} onMouseDown={(e) => e.preventDefault()} onClick={submit}>
            Ajouter
          </button>
        </>
      ) : (
        <button type="button" className="fin-mrow__main fin-mrow__placeholder" onClick={() => setEditing(true)}>
          <span className="fin-mrow__title">{placeholder}</span>
        </button>
      )}
    </div>
  );
}
