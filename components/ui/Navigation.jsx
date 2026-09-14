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
    <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", padding: "0 var(--space-4) calc(env(safe-area-inset-bottom, 0px) + 20px)", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--accent-bg)", borderRadius: "var(--radius-round)", padding: 6, boxShadow: "var(--elev-raised-lg)", pointerEvents: "auto" }}>
        {items.map((it) => {
          const on = it.value === value;
          return (
            <button
              key={it.value}
              type="button"
              onClick={() => onChange(it.value)}
              style={{
                display: "flex", alignItems: "center", gap: on ? 8 : 0,
                padding: on ? "11px 18px 11px 14px" : "11px 14px",
                borderRadius: "var(--radius-round)",
                border: "none",
                background: on ? "var(--surface-base)" : "transparent",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                transition: "background var(--duration-base) var(--ease-standard), padding var(--duration-base) var(--ease-standard)",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              <it.Icon size={20} color={on ? "var(--text-primary)" : "var(--accent-text)"} style={{ opacity: on ? 1 : 0.65, flexShrink: 0 }} />
              <span
                style={{
                  display: "inline-block",
                  maxWidth: on ? 100 : 0,
                  opacity: on ? 1 : 0,
                  overflow: "hidden",
                  transition: "max-width var(--duration-base) var(--ease-standard), opacity var(--duration-micro) var(--ease-standard)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-core)",
                  fontSize: "var(--size-footnote)",
                  fontWeight: "var(--weight-semibold)",
                }}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
