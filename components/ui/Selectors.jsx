import { Amount } from "./Primitives";

export function StatTile({ label, value, direction, Icon, onClick, style }) {
  const color = direction === "expense" ? "var(--red)" : direction === "income" ? "var(--green)" : "var(--icon-secondary)";
  return (
    <div onClick={onClick} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-4)", borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--elev-raised)", cursor: onClick ? "pointer" : "default", ...style }}>
      <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        {Icon ? <Icon size={14} color={color} /> : null}
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>{label}</span>
      </span>
      <Amount value={value} direction={direction} size="lg" showSign={false} />
    </div>
  );
}

export function SegmentedControl({ options, value, onChange, style }) {
  return (
    <div role="tablist" style={{ display: "grid", gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: "var(--space-1)", padding: "var(--space-1)", borderRadius: "var(--radius-control)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", ...style }}>
      {options.map((opt) => {
        const on = opt === value;
        return (
          <button key={opt} type="button" onClick={() => onChange(opt)} style={{ height: 36, border: "none", borderRadius: "var(--radius-sm)", background: on ? "var(--surface-highlight)" : "transparent", boxShadow: on ? "var(--elev-raised-sm)" : "none", color: on ? "var(--text-primary)" : "var(--text-tertiary)", fontFamily: "var(--font-core)", fontSize: "var(--size-subhead)", fontWeight: on ? "var(--weight-semibold)" : "var(--weight-medium)", cursor: "pointer", transition: "var(--transition-tactile)" }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function AccountPill({ value, options, onChange }) {
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
      <span style={{ position: "absolute", top: 4, bottom: 4, left: `calc(${pas * index}% + 4px)`, width: `calc(${pas}% - 8px)`, borderRadius: "var(--radius-round)", background: "var(--surface-highlight)", boxShadow: "var(--elev-raised-sm)", transition: "left var(--duration-base) var(--ease-standard)" }} />
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} style={{ position: "relative", flex: 1, minWidth: 0, border: "none", background: "transparent", color: o.value === value ? "var(--text-primary)" : "var(--text-tertiary)", fontFamily: "var(--font-core)", fontSize: "var(--size-subhead)", fontWeight: o.value === value ? "var(--weight-semibold)" : "var(--weight-medium)", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
      <button type="button" onClick={onOpenMore} style={cran(isMore)}>{isMore ? value : "Mois…"}</button>
    </div>
  );
}
