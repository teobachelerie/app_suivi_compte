import { ChevronRight } from "lucide-react";
import { Amount } from "./Primitives";

// Tuile chiffrée. Cliquable : rendue en <button> avec un chevron, pour qu'on devine qu'elle
// ouvre le détail (avant, rien ne l'indiquait).
export function StatTile({ label, value, direction, Icon, onClick, style }) {
  const color = direction === "expense" ? "var(--expense)" : direction === "income" ? "var(--income)" : "var(--icon-secondary)";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} className={onClick ? "fin-pressable" : undefined} onClick={onClick} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", width: "100%", padding: "var(--space-4)", border: "none", borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--elev-raised)", color: "inherit", font: "inherit", textAlign: "left", cursor: onClick ? "pointer" : "default", WebkitTapHighlightColor: "transparent", ...style }}>
      <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", width: "100%" }}>
        {Icon ? <Icon size={14} color={color} /> : null}
        <span style={{ flex: 1, color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>{label}</span>
        {onClick ? <ChevronRight size={16} color="var(--text-tertiary)" aria-hidden="true" /> : null}
      </span>
      <Amount value={value} direction={direction} size="lg" showSign={false} />
    </Tag>
  );
}

export function SegmentedControl({ options, value, onChange, style }) {
  return (
    <div role="tablist" style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: "var(--space-1)", padding: "var(--space-1)", borderRadius: "var(--radius-control)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", ...style }}>
      {options.map((opt) => {
        const on = opt === value;
        return (
          <button key={opt} type="button" onClick={() => onChange(opt)} style={{ height: 36, padding: "0 14px", border: "none", borderRadius: "var(--radius-sm)", background: on ? "var(--surface-highlight)" : "transparent", boxShadow: on ? "var(--elev-raised-sm)" : "none", color: on ? "var(--text-primary)" : "var(--text-tertiary)", fontFamily: "var(--font-core)", fontSize: "var(--size-subhead)", fontWeight: on ? "var(--weight-semibold)" : "var(--weight-medium)", cursor: "pointer", transition: "var(--transition-tactile)", whiteSpace: "nowrap" }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function AccountPill({ value, options, onChange, activeColor, getRef }) {
  if (!options || options.length < 2) {
    return (
      <div style={{ display: "flex", height: 52, alignItems: "center", padding: "0 var(--space-5)", borderRadius: "var(--radius-round)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset)" }}>
        <span style={{ fontFamily: "var(--font-core)", fontSize: "var(--size-subhead)", fontWeight: "var(--weight-semibold)" }}>{options?.[0]?.label || "…"}</span>
      </div>
    );
  }
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const pas = 100 / options.length;
  return (
    <div style={{ position: "relative", display: "flex", height: 52, padding: 4, borderRadius: "var(--radius-round)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset)" }}>
      <span style={{ position: "absolute", top: 4, bottom: 4, left: `calc(${pas * index}% + 4px)`, width: `calc(${pas}% - 8px)`, borderRadius: "var(--radius-round)", background: activeColor || "var(--surface-highlight)", boxShadow: "var(--elev-raised-sm)", transition: "left var(--duration-base) var(--ease-standard), background var(--duration-base) var(--ease-standard)" }} />
      {options.map((o) => (
        <button key={o.value} ref={getRef?.(o.value)} type="button" onClick={() => onChange(o.value)} style={{ position: "relative", flex: 1, minWidth: 0, border: "none", background: "transparent", color: o.value === value ? (activeColor ? "#FFFFFF" : "var(--text-primary)") : "var(--text-tertiary)", fontFamily: "var(--font-core)", fontSize: "var(--size-subhead)", fontWeight: o.value === value ? "var(--weight-semibold)" : "var(--weight-medium)", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PeriodChips({ value, onChange, onOpenMore }) {
  const chips = [
    { value: "1 mois", label: "Ce mois" },
    { value: "3 mois", label: "3 mois" },
    { value: "6 mois", label: "6 mois" },
  ];
  const isMore = !chips.some((c) => c.value === value);
  const cran = (on) => ({ height: 36, border: "none", borderRadius: "var(--radius-sm)", background: on ? "var(--surface-highlight)" : "transparent", boxShadow: on ? "var(--elev-raised-sm)" : "none", color: on ? "var(--text-primary)" : "var(--text-tertiary)", fontFamily: "var(--font-core)", fontSize: "var(--size-footnote)", fontWeight: on ? "var(--weight-semibold)" : "var(--weight-medium)", cursor: "pointer", transition: "var(--transition-tactile)" });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "var(--space-1)", padding: "var(--space-1)", borderRadius: "var(--radius-control)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)" }}>
      {chips.map((c) => (
        <button key={c.value} type="button" onClick={() => onChange(c.value)} style={cran(value === c.value)}>{c.label}</button>
      ))}
      <button type="button" onClick={onOpenMore} aria-label={isMore ? undefined : "Autre période"} style={cran(isMore)}>{isMore ? value : "Autre…"}</button>
    </div>
  );
}
