import React, { useState, useMemo, useEffect, useCallback, createContext, useContext } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, ReferenceLine } from "recharts";
import {
  Search, Settings, Plus, X, ShoppingBag, UtensilsCrossed, Plane, RefreshCw, Gamepad2,
  Stethoscope, Fuel, ChevronDown, ChevronRight, Trash2, ArrowLeft, Check, Sun, Moon,
  PiggyBank, Home as HomeIcon, List, PieChart as PieChartIcon, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";

const CATEGORY_ICON = {
  "Nourriture & Boissons": UtensilsCrossed,
  "Shopping": ShoppingBag,
  "Voyage": Plane,
  "Services": RefreshCw,
  "Loisirs": Gamepad2,
  "Santé": Stethoscope,
  "Transport": Fuel,
};

const DEFAULT_PAYMENTS = ["Carte bancaire", "Virement", "Liquide"];
const PERIODS = ["1 semaine", "1 mois", "3 mois", "6 mois", "12 mois", "Depuis toujours"];
const DASHBOARD_LIMIT = 5;

const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_SHORT_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function fmtEUR(n) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}
function parseDate(d) { return new Date(d + "T00:00:00"); }
function toLocalISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fmtDateHeader(d) {
  const date = parseDate(d);
  return `${date.getDate()} ${MONTHS_FR[date.getMonth()].toUpperCase()} ${date.getFullYear()}`;
}
function periodLabel(period, type) {
  const verb = type === "Gain" ? "Reçu" : "Dépensé";
  switch (period) {
    case "1 semaine": return `${verb} cette semaine`;
    case "1 mois": return `${verb} ce mois-ci`;
    case "3 mois": return `${verb} sur 3 mois`;
    case "6 mois": return `${verb} sur 6 mois`;
    case "12 mois": return `${verb} sur 12 mois`;
    default: return `${verb} depuis toujours`;
  }
}
function getRangeStart(period, latest) {
  const d = new Date(latest);
  if (period === "1 semaine") { d.setDate(d.getDate() - 6); return d; }
  if (period === "1 mois") { d.setDate(d.getDate() - 29); return d; }
  if (period === "3 mois") { d.setMonth(d.getMonth() - 3); d.setDate(d.getDate() + 1); return d; }
  if (period === "6 mois") { d.setMonth(d.getMonth() - 6); return d; }
  if (period === "12 mois") { d.setFullYear(d.getFullYear() - 1); return d; }
  return null;
}
function granularityFor(period) {
  if (period === "1 semaine" || period === "1 mois" || period === "3 mois") return "day";
  if (period === "6 mois" || period === "12 mois") return "month";
  return "year";
}
function buildChart(transactions, period, latestDate, type) {
  if (!latestDate) return [];
  const latest = parseDate(latestDate);
  const start = getRangeStart(period, latest);
  const gran = granularityFor(period);
  const inRange = transactions.filter((t) => {
    if (t.type !== type) return false;
    if (!start) return true;
    const dt = parseDate(t.date);
    return dt >= start && dt <= latest;
  });
  if (gran === "day") {
    const buckets = {};
    const cursor = new Date(start);
    while (cursor <= latest) { buckets[toLocalISODate(cursor)] = 0; cursor.setDate(cursor.getDate() + 1); }
    inRange.forEach((t) => { if (buckets[t.date] != null) buckets[t.date] += t.amount; });
    return Object.entries(buckets).map(([key, value]) => ({ name: String(parseDate(key).getDate()), value: Math.round(value * 100) / 100, dateKey: key, granularity: "day" }));
  }
  if (gran === "month") {
    const buckets = {};
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date(latest.getFullYear(), latest.getMonth(), 1);
    while (cursor <= end) { buckets[`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`] = 0; cursor.setMonth(cursor.getMonth() + 1); }
    inRange.forEach((t) => { const key = t.date.slice(0, 7); if (buckets[key] != null) buckets[key] += t.amount; });
    return Object.entries(buckets).map(([key, value]) => ({ name: MONTHS_SHORT_FR[parseInt(key.slice(5, 7), 10) - 1], value: Math.round(value * 100) / 100, dateKey: key, granularity: "month" }));
  }
  const buckets = {};
  inRange.forEach((t) => { const y = t.date.slice(0, 4); buckets[y] = (buckets[y] || 0) + t.amount; });
  return Object.keys(buckets).sort().map((y) => ({ name: y, value: Math.round(buckets[y] * 100) / 100, dateKey: y, granularity: "year" }));
}
function tickInterval(length) {
  if (length <= 10) return 0;
  if (length <= 45) return 1;
  return Math.ceil(length / 20);
}
const CORE_ACCOUNTS = ["Compte courant", "Compte pro"];
function buildFlowChart(transactions, period, latestDate) {
  if (!latestDate) return [];
  const latest = parseDate(latestDate);
  const start = getRangeStart(period, latest);
  const gran = granularityFor(period);
  const inRange = transactions.filter((t) => {
    if (!start) return true;
    const dt = parseDate(t.date);
    return dt >= start && dt <= latest;
  });
  const buckets = {};
  const order = [];
  function ensure(key) { if (!(key in buckets)) { buckets[key] = { income: 0, expense: 0 }; order.push(key); } }
  function add(key, t) {
    if (!(key in buckets)) return;
    if (t.type === "Gain") buckets[key].income += t.amount;
    else buckets[key].expense += t.amount;
  }
  if (gran === "day") {
    const cursor = new Date(start);
    while (cursor <= latest) { ensure(toLocalISODate(cursor)); cursor.setDate(cursor.getDate() + 1); }
    inRange.forEach((t) => add(t.date, t));
    return order.map((key) => ({ name: String(parseDate(key).getDate()), income: Math.round(buckets[key].income * 100) / 100, expense: -Math.round(buckets[key].expense * 100) / 100 }));
  }
  if (gran === "month") {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const end = new Date(latest.getFullYear(), latest.getMonth(), 1);
    while (cursor <= end) { ensure(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`); cursor.setMonth(cursor.getMonth() + 1); }
    inRange.forEach((t) => add(t.date.slice(0, 7), t));
    return order.map((key) => ({ name: MONTHS_SHORT_FR[parseInt(key.slice(5, 7), 10) - 1], income: Math.round(buckets[key].income * 100) / 100, expense: -Math.round(buckets[key].expense * 100) / 100 }));
  }
  inRange.forEach((t) => { ensure(t.date.slice(0, 4)); add(t.date.slice(0, 4), t); });
  return order.sort().map((y) => ({ name: y, income: Math.round(buckets[y].income * 100) / 100, expense: -Math.round(buckets[y].expense * 100) / 100 }));
}
function fmtBucketLabel(dateKey, granularity) {
  if (granularity === "day") {
    const d = parseDate(dateKey);
    return `${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
  }
  if (granularity === "month") {
    const [y, m] = dateKey.split("-");
    return `${MONTHS_FR[parseInt(m, 10) - 1]} ${y}`;
  }
  return dateKey;
}
function inPeriod(t, period, latestDate) {
  if (period === "Depuis toujours" || !latestDate) return true;
  const start = getRangeStart(period, parseDate(latestDate));
  const dt = parseDate(t.date);
  return dt >= start && dt <= parseDate(latestDate);
}

async function api(url, options) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Une erreur est survenue.");
  return data;
}

/* ============ Primitives visuelles (Soft Ledger Design System) ============ */

function Card({ depth = "raised", padding = "md", radius = "var(--radius-card)", children, style, ...rest }) {
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

function Divider({ inset = 0, style }) {
  return <div style={{ height: 1, marginLeft: inset, background: "var(--separator)", ...style }} />;
}

function Amount({ value, direction = "neutral", size = "md", showSign = true, style }) {
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

function StatTile({ label, value, direction, Icon, onClick, style }) {
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

function ListRow({ Icon, title, subtitle, trailing, chevron = false, onClick, style }) {
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

function NavBar({ title, subtitle, back = false, onBack, action, large = false, style }) {
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

function IconButton({ Icon, onClick, size = 44, label }) {
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

function TabBar({ items, value, onChange }) {
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

function SegmentedControl({ options, value, onChange, style }) {
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

function Switch({ checked, onChange }) {
  return (
    <span role="switch" aria-checked={checked} onClick={() => onChange(!checked)} style={{ position: "relative", display: "inline-block", width: 51, height: 31, flexShrink: 0, borderRadius: "var(--radius-round)", background: checked ? "var(--accent-bg)" : "var(--surface-inset)", boxShadow: checked ? "var(--elev-raised-sm)" : "var(--elev-inset)", cursor: "pointer", transition: "background var(--duration-base) var(--ease-standard)" }}>
      <span style={{ position: "absolute", top: 3, left: checked ? 23 : 3, width: 25, height: 25, borderRadius: "var(--radius-round)", background: "var(--surface-highlight)", boxShadow: "1px 1px 3px rgba(0,0,0,0.16)", transition: "left var(--duration-base) var(--ease-standard)" }} />
    </span>
  );
}

function ProgressBar({ value = 0, tone = "neutral", height = 8 }) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = tone === "expense" ? "var(--red)" : tone === "income" ? "var(--green)" : "var(--accent-bg)";
  return (
    <div style={{ height, borderRadius: "var(--radius-round)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", overflow: "hidden" }}>
      <div style={{ width: pct + "%", height: "100%", borderRadius: "var(--radius-round)", background: fill, transition: "width var(--duration-slow) var(--ease-out)" }} />
    </div>
  );
}

function AccountPill({ value, accounts, onChange }) {
  if (!accounts || accounts.length < 2) {
    return (
      <div style={{ display: "flex", height: 52, alignItems: "center", padding: "0 var(--space-5)", borderRadius: "var(--radius-round)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset)" }}>
        <span style={{ fontFamily: "var(--font-core)", fontSize: "var(--size-subhead)", fontWeight: "var(--weight-semibold)" }}>{value || "…"}</span>
      </div>
    );
  }
  const index = Math.max(0, accounts.indexOf(value));
  const pas = 100 / accounts.length;
  return (
    <div style={{ position: "relative", display: "flex", height: 52, padding: 4, borderRadius: "var(--radius-round)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset)" }}>
      <span style={{ position: "absolute", top: 4, bottom: 4, left: `calc(${pas * index}% + 4px)`, width: `calc(${pas}% - 8px)`, borderRadius: "var(--radius-round)", background: "var(--surface-highlight)", boxShadow: "var(--elev-raised-sm)", transition: "left var(--duration-base) var(--ease-standard)" }} />
      {accounts.map((a) => (
        <button key={a} type="button" onClick={() => onChange(a)} style={{ position: "relative", flex: 1, minWidth: 0, border: "none", background: "transparent", color: a === value ? "var(--text-primary)" : "var(--text-tertiary)", fontFamily: "var(--font-core)", fontSize: "var(--size-subhead)", fontWeight: a === value ? "var(--weight-semibold)" : "var(--weight-medium)", cursor: "pointer", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {a.replace("Compte ", "")}
        </button>
      ))}
    </div>
  );
}

function PeriodChips({ value, onChange, onOpenMore }) {
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

/* ============ Sheets (overlays) ============ */

function TopSheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--surface-scrim)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 50, paddingTop: 84, overflowY: "auto" }} onClick={onClose}>
      <div style={{ position: "relative", width: "100%", maxWidth: 420, padding: "0 20px" }} onClick={(e) => e.stopPropagation()}>
        <div className="topsheet-panel" style={{ background: "var(--surface-base)", borderRadius: "var(--radius-lg)", maxHeight: "75vh", overflowY: "auto", boxShadow: "var(--elev-overlay)" }}>
          <div style={{ textAlign: "center", padding: "16px 20px 12px", fontSize: 17, fontWeight: 600, borderBottom: "1px solid var(--separator)" }}>{title}</div>
          <div style={{ padding: "6px 20px 20px" }}>{children}</div>
        </div>
        <style jsx>{`
          @keyframes topSheetIn { from { opacity: 0; transform: scale(0.92) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          .topsheet-panel { animation: topSheetIn 0.2s cubic-bezier(0.32, 0.72, 0, 1); transform-origin: top right; }
        `}</style>
      </div>
    </div>
  );
}

function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--surface-scrim)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div style={{ position: "relative", width: "100%", maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: -18, left: 16, width: 36, height: 36, borderRadius: 18, background: "var(--surface-raised)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)", cursor: "pointer", boxShadow: "var(--elev-raised)", zIndex: 2 }}>
          <X size={18} />
        </button>
        <div className="sheet-panel" style={{ background: "var(--surface-base)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", maxHeight: "85vh", overflowY: "auto", paddingBottom: 24, boxShadow: "var(--elev-overlay)" }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, background: "var(--grey-2)", margin: "10px auto 4px" }} />
          <div style={{ textAlign: "center", padding: "10px 20px 16px", fontSize: 17, fontWeight: 600 }}>{title}</div>
          <div style={{ padding: "0 20px" }}>{children}</div>
        </div>
        <style jsx>{`
          @keyframes sheetIn { from { opacity: 0; transform: scale(0.85) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          .sheet-panel { animation: sheetIn 0.28s cubic-bezier(0.32, 0.72, 0, 1); transform-origin: top right; }
        `}</style>
      </div>
    </div>
  );
}

function SheetRow({ label, value, onClick, last }) {
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", background: "transparent", border: "none", borderBottom: last ? "none" : "1px solid var(--separator)", cursor: "pointer", textAlign: "left" }}>
      <span style={{ fontSize: 15, color: "var(--text-primary)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-tertiary)", fontSize: 15 }}>{value} <ChevronRight size={16} /></span>
    </button>
  );
}

function OptionSheet({ title, options, value, onSelect, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--surface-scrim)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 60, paddingTop: 116, overflowY: "auto" }} onClick={onClose}>
      <div style={{ position: "relative", width: "100%", maxWidth: 420, padding: "0 20px" }} onClick={(e) => e.stopPropagation()}>
        <div className="topsheet-panel" style={{ background: "var(--surface-base)", borderRadius: "var(--radius-lg)", maxHeight: "65vh", overflowY: "auto", boxShadow: "var(--elev-overlay)" }}>
          <div style={{ textAlign: "center", padding: "16px 20px 12px", fontSize: 17, fontWeight: 600, borderBottom: "1px solid var(--separator)" }}>{title}</div>
          <div style={{ padding: "6px 20px 20px" }}>
            {options.map((o, i) => (
              <button key={o} onClick={() => onSelect(o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", background: "transparent", border: "none", borderBottom: i < options.length - 1 ? "1px solid var(--separator)" : "none", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 15, color: "var(--text-primary)" }}>{o}</span>
                {o === value && <Check size={18} color="var(--green)" />}
              </button>
            ))}
          </div>
        </div>
        <style jsx>{`
          @keyframes topSheetIn { from { opacity: 0; transform: scale(0.92) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          .topsheet-panel { animation: topSheetIn 0.2s cubic-bezier(0.32, 0.72, 0, 1); transform-origin: top right; }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 16 }}><div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 6 }}>{label}</div>{children}</div>;
}

const fieldInputStyle = { width: "100%", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", border: "none", borderRadius: "var(--radius-control)", padding: "14px 16px", color: "var(--text-primary)", fontSize: 15, boxSizing: "border-box", fontFamily: "var(--font-core)" };
const fieldPickerStyle = { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", border: "none", borderRadius: "var(--radius-control)", padding: "14px 16px", color: "var(--text-primary)", fontSize: 15, cursor: "pointer", boxSizing: "border-box", fontFamily: "var(--font-core)" };

function TransactionModal({ tx, categories, accounts, onClose, onSave, onDelete, openOptions, saving, defaultPayment, defaultAccount }) {
  const [title, setTitle] = useState(tx?.title || "");
  const [amount, setAmount] = useState(tx?.amount != null ? String(tx.amount) : "");
  const [category, setCategory] = useState(tx?.category || categories[0] || "");
  const [compte, setCompte] = useState(tx?.compte || defaultAccount || accounts[0] || "");
  const [type, setType] = useState(tx?.type || "Dépense");
  const [payment, setPayment] = useState(tx?.payment || defaultPayment || "Carte bancaire");
  const [date, setDate] = useState(tx?.date || toLocalISODate(new Date()));
  const [error, setError] = useState("");

  function handleSave() {
    const amt = parseFloat(String(amount).replace(",", "."));
    if (!title.trim()) { setError("Indique un titre."); return; }
    if (!amt || amt <= 0) { setError("Indique un montant valide."); return; }
    onSave({ id: tx?.id, title: title.trim(), amount: amt, category, compte, type, payment, date });
  }

  return (
    <Sheet title={tx ? "Modifier" : "Nouvelle transaction"} onClose={onClose}>
      <SegmentedControl options={["Dépense", "Gain"]} value={type} onChange={setType} style={{ marginBottom: 16 }} />
      <Field label="Titre"><input style={fieldInputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. J'ai acheté une bougie" /></Field>
      <Field label="Montant (€)"><input style={fieldInputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" /></Field>
      <Field label="Catégorie"><button style={fieldPickerStyle} onClick={() => openOptions({ title: "Catégorie", options: categories, value: category, onSelect: setCategory })}>{category}<ChevronDown size={16} color="var(--text-tertiary)" /></button></Field>
      <Field label="Compte"><button style={fieldPickerStyle} onClick={() => openOptions({ title: "Compte", options: accounts, value: compte, onSelect: setCompte })}>{compte}<ChevronDown size={16} color="var(--text-tertiary)" /></button></Field>
      <Field label="Moyen de paiement"><button style={fieldPickerStyle} onClick={() => openOptions({ title: "Moyen de paiement", options: DEFAULT_PAYMENTS, value: payment, onSelect: setPayment })}>{payment}<ChevronDown size={16} color="var(--text-tertiary)" /></button></Field>
      <Field label="Date"><input type="date" style={fieldInputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      {error && <div style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        {onDelete && <button onClick={onDelete} disabled={saving} style={{ width: 48, height: 48, borderRadius: "var(--radius-control)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Trash2 size={18} color="var(--red)" /></button>}
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1, boxShadow: "var(--elev-raised-sm)" }}>{saving ? "Enregistrement…" : "Confirmer"}</button>
      </div>
    </Sheet>
  );
}

/* ============ Onglet Réglages (mêmes réglages qu'avant, restylés) ============ */

function ReglagesScreen({ categories, accounts, onDeleteCategory, onAddCategory, newCatName, setNewCatName, onAddAccount, onDeleteAccount, newAccName, setNewAccName, themeMode, onToggleTheme, defaultPayment, defaultAccount, onChangeDefaultPayment, onChangeDefaultAccount, openOptions }) {
  const isLight = themeMode === "light";
  const label = { color: "var(--text-tertiary)", font: "var(--text-caption-font)", display: "block", marginBottom: "var(--space-3)" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <NavBar large title="Réglages" />

      <div>
        <span style={label}>APPARENCE</span>
        <Card padding="md" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>{isLight ? <Sun size={16} /> : <Moon size={16} />} Mode clair</span>
          <Switch checked={isLight} onChange={onToggleTheme} />
        </Card>
      </div>

      <div>
        <span style={label}>VALEURS PAR DÉFAUT DU RACCOURCI</span>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>Utilisées à chaque nouvelle dépense, modifiables au cas par cas.</div>
        <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <ListRow title="Moyen de paiement" subtitle={null} onClick={() => openOptions({ title: "Moyen de paiement par défaut", options: DEFAULT_PAYMENTS, value: defaultPayment, onSelect: onChangeDefaultPayment })} trailing={<span style={{ color: "var(--text-tertiary)", fontSize: 15, display: "flex", alignItems: "center", gap: 4 }}>{defaultPayment}<ChevronRight size={16} /></span>} />
          <Divider inset={0} />
          <ListRow title="Compte" onClick={() => openOptions({ title: "Compte par défaut", options: accounts, value: defaultAccount, onSelect: onChangeDefaultAccount })} trailing={<span style={{ color: "var(--text-tertiary)", fontSize: 15, display: "flex", alignItems: "center", gap: 4 }}>{defaultAccount}<ChevronRight size={16} /></span>} />
        </Card>
      </div>

      <div>
        <span style={label}>CATÉGORIES</span>
        <Card padding="md" style={{ marginBottom: 12 }}>
          {categories.map((c, i) => (
            <React.Fragment key={c}>
              {i > 0 ? <Divider /> : null}
              <ListRow title={c} trailing={<button onClick={(e) => { e.stopPropagation(); onDeleteCategory(c); }} style={{ background: "transparent", border: "none", cursor: "pointer" }}><Trash2 size={16} color="var(--red)" /></button>} />
            </React.Fragment>
          ))}
        </Card>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={fieldInputStyle} value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nouvelle catégorie" />
          <button onClick={onAddCategory} style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "0 18px", fontWeight: 600, cursor: "pointer", boxShadow: "var(--elev-raised-sm)" }}>Ajouter</button>
        </div>
      </div>

      <div>
        <span style={label}>COMPTES</span>
        <Card padding="md" style={{ marginBottom: 12 }}>
          {accounts.filter((a) => CORE_ACCOUNTS.includes(a)).map((a, i, arr) => (
            <React.Fragment key={a}>
              {i > 0 ? <Divider /> : null}
              <ListRow title={a} trailing={<button onClick={(e) => { e.stopPropagation(); onDeleteAccount(a); }} style={{ background: "transparent", border: "none", cursor: "pointer" }}><Trash2 size={16} color="var(--red)" /></button>} />
            </React.Fragment>
          ))}
        </Card>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={fieldInputStyle} value={newAccName} onChange={(e) => setNewAccName(e.target.value)} placeholder="Nouveau compte" />
          <button onClick={onAddAccount} style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "0 18px", fontWeight: 600, cursor: "pointer", boxShadow: "var(--elev-raised-sm)" }}>Ajouter</button>
        </div>
      </div>

      <div>
        <span style={label}>ÉPARGNE</span>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>Livrets et comptes d'épargne, affichés à part sur le tableau de bord.</div>
        <Card padding="md" style={{ marginBottom: 12 }}>
          {accounts.filter((a) => !CORE_ACCOUNTS.includes(a)).length === 0 && (
            <div style={{ padding: "4px 0", fontSize: 13, color: "var(--text-tertiary)" }}>Aucun livret pour l'instant.</div>
          )}
          {accounts.filter((a) => !CORE_ACCOUNTS.includes(a)).map((a, i, arr) => (
            <React.Fragment key={a}>
              {i > 0 ? <Divider /> : null}
              <ListRow title={a} trailing={<button onClick={(e) => { e.stopPropagation(); onDeleteAccount(a); }} style={{ background: "transparent", border: "none", cursor: "pointer" }}><Trash2 size={16} color="var(--red)" /></button>} />
            </React.Fragment>
          ))}
        </Card>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={fieldInputStyle} value={newAccName} onChange={(e) => setNewAccName(e.target.value)} placeholder="Nouveau livret (ex. Livret A)" />
          <button onClick={onAddAccount} style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "0 18px", fontWeight: 600, cursor: "pointer", boxShadow: "var(--elev-raised-sm)" }}>Ajouter</button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [themeMode, setThemeMode] = useState("light");
  useEffect(() => {
    const saved = typeof window !== "undefined" && window.localStorage.getItem("expenses-theme");
    if (saved === "light" || saved === "dark") setThemeMode(saved);
  }, []);
  function toggleThemeMode() {
    setThemeMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") window.localStorage.setItem("expenses-theme", next);
      return next;
    });
  }
  const BG_COLORS = { light: "#F2F2F7", dark: "#1C1C1E" };
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", themeMode === "dark" ? "dark" : "light");
    const bg = BG_COLORS[themeMode];
    document.body.style.background = bg;
    document.documentElement.style.background = bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", bg);
  }, [themeMode]);

  const [defaultPayment, setDefaultPayment] = useState("Carte bancaire");
  const [defaultAccount, setDefaultAccount] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = window.localStorage.getItem("expenses-default-payment");
    const a = window.localStorage.getItem("expenses-default-account");
    if (p) setDefaultPayment(p);
    if (a) setDefaultAccount(a);
  }, []);
  function updateDefaultPayment(v) {
    setDefaultPayment(v);
    if (typeof window !== "undefined") window.localStorage.setItem("expenses-default-payment", v);
  }
  function updateDefaultAccount(v) {
    setDefaultAccount(v);
    if (typeof window !== "undefined") window.localStorage.setItem("expenses-default-account", v);
  }

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState("apercu");
  const [view, setView] = useState("dashboard");
  const [savingsDetailAccount, setSavingsDetailAccount] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState("1 mois");
  const [summaryType, setSummaryType] = useState("Dépense");
  const [pressedBucket, setPressedBucket] = useState(null);
  const [filterCategory, setFilterCategory] = useState("Toutes");
  const [filterAccount, setFilterAccount] = useState("Tous");
  const [activiteFlux, setActiviteFlux] = useState("Tout");

  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [optionSheet, setOptionSheet] = useState(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const anyOverlayOpen = showFilterSheet || showAdd || !!editing || !!optionSheet;
    document.body.style.overflow = anyOverlayOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showFilterSheet, showAdd, editing, optionSheet]);
  const [newCatName, setNewCatName] = useState("");
  const [newAccName, setNewAccName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async (opts) => {
    const silent = opts && opts.silent;
    if (!silent) setLoading(true);
    if (!silent) setError("");
    try {
      const [txs, meta] = await Promise.all([api("/api/transactions"), api("/api/meta")]);
      setTransactions(txs);
      setCategories(meta.categories);
      setAccounts(meta.accounts);
      const core = meta.accounts.filter((a) => CORE_ACCOUNTS.includes(a));
      setFilterAccount((prev) => (meta.accounts.includes(prev) || prev === "Tous" ? prev : (core[0] || meta.accounts[0] || "Tous")));
    } catch (e) {
      setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    let interval = null;
    function startPolling() {
      if (interval) return;
      interval = setInterval(() => loadAll({ silent: true }), 10000);
    }
    function stopPolling() {
      if (interval) clearInterval(interval);
      interval = null;
    }
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        loadAll({ silent: true });
        startPolling();
      } else {
        stopPolling();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);
    window.addEventListener("pageshow", handleVisibility);
    if (document.visibilityState === "visible") startPolling();
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
      window.removeEventListener("pageshow", handleVisibility);
    };
  }, [loadAll]);

  const latestDate = useMemo(() => transactions.reduce((max, t) => (t.date > max ? t.date : max), ""), [transactions]);
  const periodFiltered = useMemo(() => transactions.filter((t) => inPeriod(t, period, latestDate)), [transactions, period, latestDate]);
  const fullyFiltered = useMemo(() => periodFiltered.filter((t) => {
    if (filterCategory !== "Toutes" && t.category !== filterCategory) return false;
    if (filterAccount !== "Tous" && t.compte !== filterAccount) return false;
    if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
    return true;
  }), [periodFiltered, filterCategory, filterAccount, searchQuery]);

  const summaryAmount = useMemo(() => periodFiltered.reduce((s, t) => {
    if (t.type !== summaryType) return s;
    if (filterCategory !== "Toutes" && t.category !== filterCategory) return s;
    if (filterAccount !== "Tous" && t.compte !== filterAccount) return s;
    return s + t.amount;
  }, 0), [periodFiltered, filterCategory, filterAccount, summaryType]);

  const chartData = useMemo(() => buildChart(transactions.filter((t) => (filterCategory === "Toutes" || t.category === filterCategory) && (filterAccount === "Tous" || t.compte === filterAccount)), period, latestDate, summaryType), [transactions, period, latestDate, filterCategory, filterAccount, summaryType]);

  const coreAccounts = useMemo(() => accounts.filter((a) => CORE_ACCOUNTS.includes(a)), [accounts]);
  const savingsAccounts = useMemo(() => accounts.filter((a) => !CORE_ACCOUNTS.includes(a)), [accounts]);
  function accountBalance(acc) {
    return transactions.reduce((s, t) => (t.compte === acc ? s + (t.type === "Gain" ? t.amount : -t.amount) : s), 0);
  }
  const balanceTotal = useMemo(() => accountBalance(filterAccount), [transactions, filterAccount]);
  const flowChartData = useMemo(() => buildFlowChart(transactions.filter((t) => t.compte === filterAccount), period, latestDate), [transactions, filterAccount, period, latestDate]);
  const savingsBalance = savingsDetailAccount ? accountBalance(savingsDetailAccount) : 0;

  // Revenus / dépenses de la période sélectionnée, pour le compte actif — additif, mêmes données que summaryAmount mais pour les deux sens à la fois (nécessaire pour les deux StatTile + le delta sous le solde)
  const revenusPeriode = useMemo(() => periodFiltered.reduce((s, t) => (t.type === "Gain" && (filterAccount === "Tous" || t.compte === filterAccount) ? s + t.amount : s), 0), [periodFiltered, filterAccount]);
  const depensesPeriode = useMemo(() => periodFiltered.reduce((s, t) => (t.type === "Dépense" && (filterAccount === "Tous" || t.compte === filterAccount) ? s + t.amount : s), 0), [periodFiltered, filterAccount]);
  const netPeriode = revenusPeriode - depensesPeriode;

  // Graphique "Dépenses par mois" du tableau de bord — fixé à 6 mois quel que soit le sélecteur de période du haut, comme dans la maquette
  const depensesParMoisData = useMemo(() => buildChart(transactions.filter((t) => filterAccount === "Tous" || t.compte === filterAccount), "6 mois", latestDate, "Dépense"), [transactions, filterAccount, latestDate]);

  // Répartition des dépenses par catégorie sur la période — pour l'onglet Budgets (données réelles, pas de plafond inventé)
  const categorySpend = useMemo(() => {
    const totals = {};
    periodFiltered.forEach((t) => {
      if (t.type !== "Dépense") return;
      if (filterAccount !== "Tous" && t.compte !== filterAccount) return;
      totals[t.category] = (totals[t.category] || 0) + t.amount;
    });
    const max = Math.max(1, ...Object.values(totals));
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([category, amount]) => ({ category, amount, pct: (amount / max) * 100 }));
  }, [periodFiltered, filterAccount]);

  const pressedTransactions = useMemo(() => {
    if (!pressedBucket) return null;
    const { dateKey, granularity } = pressedBucket;
    return transactions.filter((t) => {
      if (t.type !== summaryType) return false;
      if (filterCategory !== "Toutes" && t.category !== filterCategory) return false;
      if (filterAccount !== "Tous" && t.compte !== filterAccount) return false;
      if (granularity === "day") return t.date === dateKey;
      if (granularity === "month") return t.date.slice(0, 7) === dateKey;
      return t.date.slice(0, 4) === dateKey;
    });
  }, [pressedBucket, transactions, summaryType, filterCategory, filterAccount]);

  function handleBarPress(state) {
    if (state && state.activePayload && state.activePayload[0]) {
      setPressedBucket(state.activePayload[0].payload);
    }
  }
  function handleBarRelease() {
    setPressedBucket(null);
  }

  function groupByDate(list) {
    const sorted = [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const map = [];
    const index = {};
    sorted.forEach((t) => {
      if (index[t.date] == null) { index[t.date] = map.length; map.push([t.date, []]); }
      map[index[t.date]][1].push(t);
    });
    return map;
  }
  const dashboardList = useMemo(() => [...fullyFiltered].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, DASHBOARD_LIMIT), [fullyFiltered]);
  const activiteFiltered = useMemo(() => fullyFiltered.filter((t) => {
    if (activiteFlux === "Sorties") return t.type === "Dépense";
    if (activiteFlux === "Entrées") return t.type === "Gain";
    return true;
  }), [fullyFiltered, activiteFlux]);
  const allList = useMemo(() => groupByDate(activiteFiltered), [activiteFiltered]);

  async function saveTransaction(tx) {
    setSaving(true);
    try {
      if (tx.id) {
        const updated = await api(`/api/transactions/${tx.id}`, { method: "PATCH", body: tx });
        setTransactions((prev) => prev.map((t) => (t.id === tx.id ? updated : t)));
      } else {
        const created = await api("/api/transactions", { method: "POST", body: tx });
        setTransactions((prev) => [created, ...prev]);
      }
      setShowAdd(false);
      setEditing(null);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  async function deleteTransaction(id) {
    setSaving(true);
    try {
      await api(`/api/transactions/${id}`, { method: "DELETE" });
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setEditing(null);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  async function saveOptions(property, names) {
    await api("/api/meta", { method: "PATCH", body: { property, options: names } });
  }
  async function deleteCategory(cat) {
    const next = categories.filter((c) => c !== cat);
    setCategories(next);
    try { await saveOptions("Category", next); } catch (e) { setError(e.message); }
  }
  async function addCategory() {
    const name = newCatName.trim();
    if (!name || categories.includes(name)) return;
    const next = [...categories, name];
    setCategories(next);
    setNewCatName("");
    try { await saveOptions("Category", next); } catch (e) { setError(e.message); }
  }
  async function deleteAccount(name) {
    const next = accounts.filter((a) => a !== name);
    setAccounts(next);
    try { await saveOptions("Compte", next); } catch (e) { setError(e.message); }
  }
  async function addAccount() {
    const name = newAccName.trim();
    if (!name || accounts.includes(name)) return;
    const next = [...accounts, name];
    setAccounts(next);
    setNewAccName("");
    try { await saveOptions("Compte", next); } catch (e) { setError(e.message); }
  }

  function renderList(groups, emptyText) {
    if (groups.length === 0) return <div style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "40px 0", fontSize: 14 }}>{emptyText}</div>;
    return groups.map(([date, txs]) => (
      <div key={date} style={{ marginBottom: 20 }}>
        <div style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)", marginBottom: 8 }}>{fmtDateHeader(date)}</div>
        <Card padding="md">
          {txs.map((t, i) => {
            const Icon = CATEGORY_ICON[t.category] || ShoppingBag;
            const positive = t.type === "Gain";
            return (
              <React.Fragment key={t.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow Icon={Icon} title={t.title} subtitle={t.category} onClick={() => setEditing(t)} trailing={<Amount value={fmtEUR(t.amount)} direction={positive ? "income" : "expense"} />} />
              </React.Fragment>
            );
          })}
        </Card>
      </div>
    ));
  }

  function renderFlatList(list, emptyText) {
    if (list.length === 0) return <div style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "24px 0", fontSize: 14 }}>{emptyText}</div>;
    return (
      <Card padding="md">
        {list.map((t, i) => {
          const Icon = CATEGORY_ICON[t.category] || ShoppingBag;
          const positive = t.type === "Gain";
          return (
            <React.Fragment key={t.id}>
              {i > 0 ? <Divider /> : null}
              <ListRow Icon={Icon} title={t.title} subtitle={t.category} onClick={() => setEditing(t)} trailing={<Amount value={fmtEUR(t.amount)} direction={positive ? "income" : "expense"} />} />
            </React.Fragment>
          );
        })}
      </Card>
    );
  }

  if (loading) {
    return <div style={{ background: "var(--surface-base)", minHeight: "100vh", color: "var(--text-tertiary)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, sans-serif" }}>Chargement des dépenses…</div>;
  }

  const moisCourantLabel = MONTHS_FR[new Date().getMonth()].charAt(0).toUpperCase() + MONTHS_FR[new Date().getMonth()].slice(1);

  return (
    <div style={{ background: "var(--surface-base)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "var(--font-core)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 116px)" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: "calc(env(safe-area-inset-top, 0px) + 20px) var(--gutter-screen) 0" }}>

        {error && (
          <div style={{ background: "var(--surface-danger)", color: "var(--red)", borderRadius: "var(--radius-control)", padding: "10px 14px", fontSize: 13, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {error}
            <button onClick={() => setError("")} style={{ background: "transparent", border: "none", color: "var(--red)", cursor: "pointer" }}><X size={14} /></button>
          </div>
        )}

        {savingsDetailAccount ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <NavBar back title={savingsDetailAccount} onBack={() => setSavingsDetailAccount(null)} />
            <Card depth="raised-lg" padding="lg" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>SOLDE ACTUEL</span>
              <Amount value={fmtEUR(savingsBalance)} size="xl" />
            </Card>
            {renderList(groupByDate(transactions.filter((t) => t.compte === savingsDetailAccount)), "Aucun mouvement pour ce livret.")}
          </div>
        ) : activeTab === "apercu" ? (
          view === "dashboard" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <NavBar large title="Aperçu" subtitle={moisCourantLabel} action={<IconButton Icon={Settings} size={36} label="Réglages" onClick={() => setActiveTab("reglages")} />} />

              <Card depth="raised-lg" padding="lg" style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                <AccountPill value={filterAccount} accounts={coreAccounts} onChange={setFilterAccount} />
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>SOLDE DU COMPTE</span>
                  <Amount value={fmtEUR(balanceTotal)} size="balance" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  {netPeriode >= 0 ? <ArrowDownLeft size={14} color="var(--green)" /> : <ArrowUpRight size={14} color="var(--red)" />}
                  <span style={{ font: "500 13px var(--font-core)", color: "var(--text-secondary)" }}>
                    {netPeriode >= 0 ? "+" : "−"}{fmtEUR(Math.abs(netPeriode))} sur {periodLabel(period, "Gain").replace("Reçu ", "")}
                  </span>
                </div>
              </Card>

              <PeriodChips value={period} onChange={setPeriod} onOpenMore={() => setOptionSheet({ title: "Période", options: PERIODS, value: period, onSelect: setPeriod })} />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                <StatTile label="REVENUS" value={fmtEUR(revenusPeriode)} direction="income" Icon={ArrowDownLeft} onClick={() => { setSummaryType("Gain"); setView("flow"); }} />
                <StatTile label="DÉPENSES" value={fmtEUR(depensesPeriode)} direction="expense" Icon={ArrowUpRight} onClick={() => { setSummaryType("Dépense"); setView("flow"); }} />
              </div>

              <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>DÉPENSES PAR MOIS</span>
                <div style={{ height: 132 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={depensesParMoisData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fill: "var(--grey-4)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Bar dataKey="value" fill="var(--red)" radius={[4, 4, 4, 4]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {savingsAccounts.length > 0 && (
                <div>
                  <span style={{ display: "block", color: "var(--text-tertiary)", font: "var(--text-caption-font)", marginBottom: "var(--space-3)" }}>ÉPARGNE</span>
                  <Card padding="md">
                    {savingsAccounts.map((acc, i) => (
                      <React.Fragment key={acc}>
                        {i > 0 ? <Divider /> : null}
                        <ListRow Icon={PiggyBank} title={acc} onClick={() => setSavingsDetailAccount(acc)} trailing={<Amount value={fmtEUR(accountBalance(acc))} showSign={false} />} chevron />
                      </React.Fragment>
                    ))}
                  </Card>
                </div>
              )}

              <div>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
                  <span style={{ font: "600 20px var(--font-display)", letterSpacing: "var(--tracking-title)" }}>Récent</span>
                  <span onClick={() => setActiveTab("activite")} style={{ font: "500 15px var(--font-core)", color: "var(--text-tertiary)", cursor: "pointer" }}>Tout</span>
                </div>
                {renderFlatList(dashboardList, "Aucune dépense pour ces filtres.")}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <NavBar back title={summaryType === "Gain" ? "Revenus" : "Dépenses"} onBack={() => setView("dashboard")} />
              <PeriodChips value={period} onChange={setPeriod} onOpenMore={() => setOptionSheet({ title: "Période", options: PERIODS, value: period, onSelect: setPeriod })} />

              <Card depth="raised-lg" padding="lg" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", position: "relative" }}>
                <div style={{ position: "absolute", top: "var(--space-5)", right: "var(--space-5)" }}>
                  <SegmentedControl options={["Dépense", "Gain"]} value={summaryType} onChange={setSummaryType} style={{ width: 140 }} />
                </div>
                {pressedBucket ? (
                  <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>{fmtBucketLabel(pressedBucket.dateKey, pressedBucket.granularity).toUpperCase()}</span>
                ) : (
                  <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>{periodLabel(period, summaryType).toUpperCase()}</span>
                )}
                <Amount value={fmtEUR(pressedBucket ? pressedBucket.value : summaryAmount)} direction={summaryType === "Gain" ? "income" : "expense"} size="xl" showSign={false} />
                <div style={{ height: 110, touchAction: "none", marginTop: 8 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                      onMouseDown={handleBarPress}
                      onTouchStart={handleBarPress}
                      onMouseUp={handleBarRelease}
                      onTouchEnd={handleBarRelease}
                      onMouseLeave={handleBarRelease}
                    >
                      <XAxis dataKey="name" tick={{ fill: "var(--grey-4)", fontSize: 10 }} axisLine={false} tickLine={false} interval={tickInterval(chartData.length)} />
                      <Bar dataKey="value" fill={summaryType === "Gain" ? "var(--green)" : "var(--red)"} radius={[4, 4, 4, 4]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {pressedBucket ? renderList(groupByDate(pressedTransactions || []), "Aucune transaction ce jour-là.") : null}
            </div>
          )
        ) : activeTab === "activite" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <NavBar large title="Activité" subtitle={`${activiteFiltered.length} opération${activiteFiltered.length > 1 ? "s" : ""}`} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", borderRadius: "var(--radius-control)", padding: "12px 16px" }}>
              <Search size={16} color="var(--text-tertiary)" />
              <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher par titre" style={{ flex: 1, background: "transparent", border: "none", color: "var(--text-primary)", fontSize: 15, outline: "none", fontFamily: "var(--font-core)" }} />
              {searchQuery && <button onClick={() => setSearchQuery("")} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={16} color="var(--text-tertiary)" /></button>}
              <button onClick={() => setShowFilterSheet(true)} style={{ background: "transparent", border: "none", cursor: "pointer" }}><ChevronDown size={16} color="var(--text-tertiary)" /></button>
            </div>
            <SegmentedControl options={["Tout", "Sorties", "Entrées"]} value={activiteFlux} onChange={setActiviteFlux} />
            {renderList(allList, "Aucune transaction ne correspond.")}
          </div>
        ) : activeTab === "budgets" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
            <NavBar large title="Budgets" subtitle={periodLabel(period, "Dépense")} action={<IconButton Icon={Settings} size={36} label="Réglages" onClick={() => setActiveTab("reglages")} />} />

            <Card depth="raised-lg" padding="lg" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>TOTAL DÉPENSÉ · {periodLabel(period, "Dépense").toUpperCase()}</span>
              <Amount value={fmtEUR(depensesPeriode)} size="xl" direction="expense" showSign={false} />
              <span style={{ font: "400 13px var(--font-core)", color: "var(--text-tertiary)" }}>Répartition réelle par catégorie — pas de plafond configuré</span>
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {categorySpend.length === 0 && <div style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "24px 0", fontSize: 14 }}>Aucune dépense sur cette période.</div>}
              {categorySpend.map(({ category, amount, pct }) => {
                const Icon = CATEGORY_ICON[category] || ShoppingBag;
                return (
                  <Card key={category} padding="md" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)" }}>
                        <Icon size={17} color="var(--icon-primary)" />
                      </span>
                      <span style={{ flex: 1, font: "500 16px var(--font-core)" }}>{category}</span>
                      <Amount value={fmtEUR(amount)} size="sm" direction="expense" showSign={false} />
                    </div>
                    <ProgressBar value={pct} tone="expense" />
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <ReglagesScreen
            categories={categories} accounts={accounts}
            onDeleteCategory={deleteCategory} onAddCategory={addCategory}
            newCatName={newCatName} setNewCatName={setNewCatName}
            onAddAccount={addAccount} onDeleteAccount={deleteAccount}
            newAccName={newAccName} setNewAccName={setNewAccName}
            themeMode={themeMode} onToggleTheme={toggleThemeMode}
            defaultPayment={defaultPayment} defaultAccount={defaultAccount}
            onChangeDefaultPayment={updateDefaultPayment} onChangeDefaultAccount={updateDefaultAccount}
            openOptions={setOptionSheet}
          />
        )}
      </div>

      <button
        onClick={() => setShowAdd(true)}
        aria-label="Ajouter une opération"
        style={{ position: "fixed", right: 20, bottom: "calc(env(safe-area-inset-bottom, 0px) + 92px)", width: 56, height: 56, borderRadius: "var(--radius-round)", border: "none", background: "var(--accent-bg)", boxShadow: "var(--elev-raised-lg)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 35 }}
      >
        <Plus size={26} color="var(--accent-text)" />
      </button>

      <TabBar
        value={activeTab}
        onChange={(v) => { setActiveTab(v); setView("dashboard"); setSavingsDetailAccount(null); }}
        items={[
          { value: "apercu", label: "Aperçu", Icon: HomeIcon },
          { value: "activite", label: "Activité", Icon: List },
          { value: "budgets", label: "Budgets", Icon: PieChartIcon },
          { value: "reglages", label: "Réglages", Icon: Settings },
        ]}
      />

      {(showAdd || editing) && (
        <TransactionModal tx={editing} categories={categories} accounts={accounts} saving={saving} defaultPayment={defaultPayment} defaultAccount={defaultAccount} onClose={() => { setShowAdd(false); setEditing(null); }} onSave={saveTransaction} onDelete={editing ? () => deleteTransaction(editing.id) : null} openOptions={setOptionSheet} />
      )}

      {showFilterSheet && (
        <TopSheet title="Filtres" onClose={() => setShowFilterSheet(false)}>
          <SheetRow label="Catégorie" value={filterCategory} onClick={() => setOptionSheet({ title: "Catégorie", options: ["Toutes", ...categories], value: filterCategory, onSelect: setFilterCategory })} last />
        </TopSheet>
      )}

      {optionSheet && (
        <OptionSheet title={optionSheet.title} options={optionSheet.options} value={optionSheet.value} onSelect={(v) => { optionSheet.onSelect(v); setOptionSheet(null); }} onClose={() => setOptionSheet(null)} />
      )}
    </div>
  );
}
