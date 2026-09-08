import { useState } from "react";

export function Card({ depth = "raised", padding = "md", radius = "var(--radius-card)", children, style, ...rest }) {
  const pads = { none: 0, sm: "var(--space-4)", md: "var(--space-5)", lg: "var(--space-6)" };
  const shadow =
    depth === "flat" ? "var(--elev-flat)" :
    depth === "inset" ? "var(--elev-inset)" :
    depth === "raised-lg" ? "var(--elev-raised-lg)" : "var(--elev-raised)";
  return (
    <div
      style={{
        background: depth === "highlight" ? "var(--surface-highlight)" : "var(--surface-raised)",
        borderRadius: radius,
        padding: pads[padding] ?? padding,
        boxShadow: depth === "highlight" ? "var(--elev-raised)" : shadow,
        transition: "box-shadow var(--duration-base) var(--ease-standard)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Divider({ inset = 0, style }) {
  return <div style={{ height: 1, marginLeft: inset, background: "var(--separator)", ...style }} />;
}

export function Amount({ value, direction = "neutral", size = "md", showSign = true, style }) {
  const SIZES = {
    balance: { size: "var(--size-balance)", tracking: "var(--tracking-balance)" },
    xl: { size: "var(--size-display)", tracking: "var(--tracking-display)" },
    lg: { size: "var(--size-title-2)", tracking: "var(--tracking-title)" },
    md: { size: "var(--size-headline)", tracking: "var(--tracking-body)" },
    sm: { size: "var(--size-subhead)", tracking: "var(--tracking-body)" },
  };
  const s = SIZES[size] || SIZES.md;
  const color = direction === "expense" ? "var(--red)" : direction === "income" ? "var(--green)" : "var(--text-primary)";
  const sign = !showSign || direction === "neutral" ? "" : direction === "expense" ? "−" : "+";
  return (
    <span className="ds-tabular" style={{ color, fontFamily: "var(--font-numeric)", fontSize: s.size, fontWeight: "var(--weight-semibold)", letterSpacing: s.tracking, lineHeight: "var(--leading-tight)", whiteSpace: "nowrap", ...style }}>
      {sign}{value}
    </span>
  );
}

export function IconButton({ Icon, onClick, size = 44, label }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, border: "none", borderRadius: "var(--radius-sm)", background: "var(--surface-raised)", boxShadow: pressed ? "var(--elev-press)" : "var(--elev-raised-sm)", transform: pressed ? "scale(var(--press-scale))" : "none", transition: "var(--transition-tactile)", cursor: "pointer", flexShrink: 0 }}
    >
      <Icon size={Math.round(size * 0.42)} color="var(--icon-primary)" />
    </button>
  );
}

export function Switch({ checked, onChange }) {
  return (
    <span role="switch" aria-checked={checked} onClick={() => onChange(!checked)} style={{ position: "relative", display: "inline-block", width: 51, height: 31, flexShrink: 0, borderRadius: "var(--radius-round)", background: checked ? "var(--accent-bg)" : "var(--surface-inset)", boxShadow: checked ? "var(--elev-raised-sm)" : "var(--elev-inset)", cursor: "pointer", transition: "background var(--duration-base) var(--ease-standard)" }}>
      <span style={{ position: "absolute", top: 3, left: checked ? 23 : 3, width: 25, height: 25, borderRadius: "var(--radius-round)", background: "var(--surface-highlight)", boxShadow: "1px 1px 3px rgba(0,0,0,0.16)", transition: "left var(--duration-base) var(--ease-standard)" }} />
    </span>
  );
}

export function ProgressBar({ value = 0, tone = "neutral", height = 8 }) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = tone === "expense" ? "var(--red)" : tone === "income" ? "var(--green)" : "var(--accent-bg)";
  return (
    <div style={{ height, borderRadius: "var(--radius-round)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", overflow: "hidden" }}>
      <div style={{ width: pct + "%", height: "100%", borderRadius: "var(--radius-round)", background: fill, transition: "width var(--duration-slow) var(--ease-out)" }} />
    </div>
  );
}
