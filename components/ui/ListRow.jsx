import { useState, useEffect } from "react";
import { ChevronRight, Check, Pencil, Trash2 } from "lucide-react";

export function ListRow({ Icon, title, subtitle, trailing, chevron = false, onClick, style }) {
  const [pressed, setPressed] = useState(false);
  const interactive = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      onPointerDown={() => interactive && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", minHeight: "var(--hit-min)", padding: "var(--space-3) 0", borderRadius: "var(--radius-sm)", opacity: pressed ? 0.55 : 1, cursor: interactive ? "pointer" : "default", transition: "opacity var(--duration-micro) var(--ease-standard)", ...style }}
    >
      {Icon ? (
        <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, flex: "0 0 auto", borderRadius: "var(--radius-sm)", background: "var(--surface-raised)", boxShadow: "var(--elev-raised-sm)" }}>
          <Icon size={18} color="var(--icon-primary)" />
        </span>
      ) : null}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", color: "var(--text-primary)", fontFamily: "var(--font-core)", fontSize: "var(--size-callout)", fontWeight: "var(--weight-medium)", letterSpacing: "var(--tracking-body)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        {subtitle ? <span style={{ display: "block", marginTop: 2, color: "var(--text-tertiary)", fontFamily: "var(--font-core)", fontSize: "var(--size-footnote)" }}>{subtitle}</span> : null}
      </span>
      {trailing}
      {chevron ? <ChevronRight size={16} color="var(--grey-3)" /> : null}
    </div>
  );
}

export function EditableRow({ name, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  useEffect(() => { if (!editing) setValue(name); }, [name, editing]);

  function commit() {
    const v = value.trim();
    setEditing(false);
    if (v && v !== name) onRename(v); else setValue(name);
  }

  if (editing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "var(--space-2) 0" }}>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setValue(name); setEditing(false); } }}
          onBlur={commit}
          style={{ flex: 1, background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", border: "none", borderRadius: "var(--radius-sm)", padding: "10px 12px", color: "var(--text-primary)", fontSize: 15, fontFamily: "var(--font-core)" }}
        />
        <button onMouseDown={(e) => e.preventDefault()} onClick={commit} style={{ background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}><Check size={18} color="var(--green)" /></button>
      </div>
    );
  }
  return (
    <ListRow
      title={name}
      onClick={() => setEditing(true)}
      trailing={
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={(e) => { e.stopPropagation(); setEditing(true); }} style={{ background: "transparent", border: "none", cursor: "pointer" }} aria-label="Renommer"><Pencil size={15} color="var(--text-tertiary)" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ background: "transparent", border: "none", cursor: "pointer" }} aria-label="Supprimer"><Trash2 size={16} color="var(--red)" /></button>
        </div>
      }
    />
  );
}
