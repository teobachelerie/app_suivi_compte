import { ArrowLeft } from "lucide-react";

// Avec un bouton retour, seule la flèche reste à l'écran pendant le défilement (position fixe, à
// l'endroit exact où elle est en haut de page) : le titre défile normalement et aucune bande ne
// masque le contenu. Une case vide de même taille garde le titre à sa place. Voir .fin-back-floating.
export function NavBar({ title, subtitle, back = false, onBack, action, large = false, style }) {
  return (
    <header style={{ display: "flex", alignItems: large ? "flex-end" : "center", gap: "var(--space-3)", minHeight: 56, padding: large ? "var(--space-2) 0 var(--space-2)" : "var(--space-2) 0", ...style }}>
      {back ? (
        <>
          <span aria-hidden="true" style={{ width: 36, height: 36, flexShrink: 0 }} />
          <button type="button" className="fin-back-floating" onClick={onBack} aria-label="Retour">
            <ArrowLeft size={16} color="var(--icon-primary)" />
          </button>
        </>
      ) : null}
      <div style={{ flex: 1, minWidth: 0, textAlign: large || back ? "left" : "center" }}>
        {/* Sous-ligne grise en Garamond italique, comme dans la D.A. */}
        {subtitle ? <div className="fin-sub-serif" style={{ fontSize: 17, lineHeight: 1.2 }}>{subtitle}</div> : null}
        <div style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)", fontSize: large ? "var(--size-title-1)" : "var(--size-headline)", fontWeight: large ? "var(--weight-black)" : "var(--weight-heavy)", letterSpacing: large ? "-0.035em" : "-0.02em", lineHeight: "var(--leading-snug)" }}>{title}</div>
      </div>
      {action}
    </header>
  );
}

export function TabBar({ items, value, onChange, trailing, getRef }) {
  return (
    <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 10, padding: "0 var(--space-4) 20px", zIndex: 30, pointerEvents: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--surface-raised)", borderRadius: "var(--radius-round)", padding: 7, boxShadow: "var(--elev-raised-lg)", pointerEvents: "auto" }}>
        {items.map((it) => {
          const on = it.value === value;
          return (
            <button
              key={it.value}
              ref={getRef?.(it.value)}
              type="button"
              onClick={() => onChange(it.value)}
              style={{
                display: "flex", alignItems: "center", gap: on ? 9 : 0,
                padding: on ? "13px 20px 13px 16px" : "13px 16px",
                borderRadius: "var(--radius-round)",
                border: "none",
                background: on ? "var(--accent-bg)" : "transparent",
                boxShadow: on ? "var(--elev-raised-sm)" : "none",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                transition: "background var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard), padding var(--duration-base) var(--ease-standard)",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              <it.Icon size={22} color={on ? "var(--accent-text)" : "var(--text-tertiary)"} style={{ flexShrink: 0 }} />
              <span
                style={{
                  display: "inline-block",
                  maxWidth: on ? 100 : 0,
                  opacity: on ? 1 : 0,
                  overflow: "hidden",
                  transition: "max-width var(--duration-base) var(--ease-standard), opacity var(--duration-micro) var(--ease-standard)",
                  color: "var(--accent-text)",
                  fontFamily: "var(--font-core)",
                  fontSize: "var(--size-subhead)",
                  fontWeight: "var(--weight-bold)",
                }}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
      {trailing && <div style={{ pointerEvents: "auto" }}>{trailing}</div>}
    </nav>
  );
}
