import { ArrowLeft } from "lucide-react";

export function NavBar({ title, subtitle, back = false, onBack, action, large = false, style }) {
  return (
    <header style={{ display: "flex", alignItems: large ? "flex-end" : "center", gap: "var(--space-3)", minHeight: 56, padding: large ? "var(--space-2) 0 var(--space-2)" : "var(--space-2) 0", ...style }}>
      {back ? (
        <button onClick={onBack} aria-label="Retour" style={{ width: 36, height: 36, border: "none", borderRadius: "var(--radius-sm)", background: "var(--surface-raised)", boxShadow: "var(--elev-raised-sm)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <ArrowLeft size={16} color="var(--icon-primary)" />
        </button>
      ) : null}
      <div style={{ flex: 1, minWidth: 0, textAlign: large || back ? "left" : "center" }}>
        {subtitle ? <div style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-core)", fontSize: "var(--size-footnote)", fontWeight: "var(--weight-medium)" }}>{subtitle}</div> : null}
        <div style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)", fontSize: large ? "var(--size-title-1)" : "var(--size-headline)", fontWeight: "var(--weight-semibold)", letterSpacing: large ? "var(--tracking-display)" : "var(--tracking-body)", lineHeight: "var(--leading-snug)" }}>{title}</div>
      </div>
      {action}
    </header>
  );
}

export function TabBar({ items, value, onChange }) {
  return (
    <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, display: "grid", gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, alignItems: "center", padding: "var(--space-3) var(--space-2) calc(env(safe-area-inset-bottom, 0px) + var(--space-3))", background: "var(--surface-base)", boxShadow: "0 -1px 0 var(--separator)", zIndex: 30 }}>
      {items.map((it) => {
        const on = it.value === value;
        return (
          <button key={it.value} type="button" onClick={() => onChange(it.value)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "var(--space-2) 0", border: "none", background: "transparent", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
            <it.Icon size={22} color={on ? "var(--icon-primary)" : "var(--grey-4)"} />
            <span style={{ color: on ? "var(--text-primary)" : "var(--text-tertiary)", fontFamily: "var(--font-core)", fontSize: "var(--size-caption)", fontWeight: on ? "var(--weight-semibold)" : "var(--weight-regular)" }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
