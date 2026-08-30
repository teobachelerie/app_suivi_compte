import React, { useState, useMemo, useEffect, useCallback, createContext, useContext } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis } from "recharts";
import { Search, SlidersHorizontal, Settings, Plus, X, ShoppingBag, UtensilsCrossed, Plane, RefreshCw, Gamepad2, Stethoscope, Fuel, ChevronDown, ChevronRight, Trash2, ArrowLeft, Check, Sun, Moon } from "lucide-react";

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

const THEMES = {
  dark: {
    mode: "dark",
    bg: "#0a0a0a",
    card: "#1c1c1e",
    card2: "#2c2c2e",
    text: "#ffffff",
    muted: "#8e8e93",
    border: "#2c2c2e",
    border2: "#3a3a3c",
    sheetBg: "rgba(30,30,32,0.78)",
    overlay: "rgba(0,0,0,0.5)",
    accentBg: "#ffffff",
    accentText: "#0a0a0a",
    glassBorder: "rgba(255,255,255,0.08)",
  },
  light: {
    mode: "light",
    bg: "#f2f2f7",
    card: "#ffffff",
    card2: "#eceef0",
    text: "#0a0a0a",
    muted: "#6d6d72",
    border: "#e5e5ea",
    border2: "#dcdce1",
    sheetBg: "rgba(255,255,255,0.78)",
    overlay: "rgba(0,0,0,0.25)",
    accentBg: "#0a0a0a",
    accentText: "#ffffff",
    glassBorder: "rgba(0,0,0,0.06)",
  },
};

const ThemeContext = createContext(THEMES.dark);
const useTheme = () => useContext(ThemeContext);

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

export default function Home() {
  const [themeMode, setThemeMode] = useState("dark");
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
  const theme = THEMES[themeMode];
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.background = theme.bg;
    document.documentElement.style.background = theme.bg;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme.bg);
  }, [theme]);

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

  const [view, setView] = useState("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [period, setPeriod] = useState("1 mois");
  const [summaryType, setSummaryType] = useState("Dépense");
  const [pressedBucket, setPressedBucket] = useState(null);
  const [filterCategory, setFilterCategory] = useState("Toutes");
  const [filterAccount, setFilterAccount] = useState("Tous");

  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [optionSheet, setOptionSheet] = useState(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const anyOverlayOpen = showFilterSheet || showSettings || showAdd || !!editing || !!optionSheet;
    document.body.style.overflow = anyOverlayOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showFilterSheet, showSettings, showAdd, editing, optionSheet]);
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
      setFilterAccount((prev) => (meta.accounts.includes(prev) ? prev : meta.accounts[0]));
      setDefaultAccount((prev) => (prev && meta.accounts.includes(prev) ? prev : meta.accounts[0]));
    } catch (e) {
      if (!silent) setError(e.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    let interval;
    function startPolling() {
      stopPolling();
      interval = setInterval(() => { loadAll({ silent: true }); }, 10000);
    }
    function stopPolling() {
      if (interval) clearInterval(interval);
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
  const dashboardList = useMemo(() => groupByDate([...fullyFiltered].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, DASHBOARD_LIMIT)), [fullyFiltered]);
  const allList = useMemo(() => groupByDate(fullyFiltered), [fullyFiltered]);

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
    if (groups.length === 0) return <div style={{ textAlign: "center", color: theme.muted, padding: "40px 0", fontSize: 14 }}>{emptyText}</div>;
    return groups.map(([date, txs]) => (
      <div key={date} style={{ marginBottom: 20 }}>
        <div style={{ color: theme.muted, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, marginBottom: 8 }}>{fmtDateHeader(date)}</div>
        <div style={{ background: theme.card, borderRadius: 16, overflow: "hidden" }}>
          {txs.map((t, i) => {
            const Icon = CATEGORY_ICON[t.category] || ShoppingBag;
            const positive = t.type === "Gain";
            return (
              <button key={t.id} onClick={() => setEditing(t)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "transparent", border: "none", borderBottom: i < txs.length - 1 ? `1px solid ${theme.border}` : "none", cursor: "pointer", textAlign: "left" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: theme.card2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={17} color={theme.text} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: theme.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                  <div style={{ fontSize: 13, color: theme.muted }}>{t.category}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: positive ? "#32d74b" : "#ff453a", flexShrink: 0 }}>{positive ? "+" : "-"}{fmtEUR(t.amount)}</div>
              </button>
            );
          })}
        </div>
      </div>
    ));
  }

  if (loading) {
    return <div style={{ background: theme.bg, minHeight: "100vh", color: theme.muted, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, sans-serif" }}>Chargement des dépenses…</div>;
  }

  return (
    <ThemeContext.Provider value={theme}>
      <div style={{ background: theme.bg, minHeight: "100vh", color: theme.text, fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif", paddingBottom: 100, transition: "background 0.2s ease, color 0.2s ease" }}>
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "calc(env(safe-area-inset-top, 0px) + 60px)",
            background: `linear-gradient(to bottom, ${theme.bg} 0%, ${theme.bg} 35%, transparent 100%)`,
            pointerEvents: "none",
            zIndex: 20,
          }}
        />
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "12px 20px 0" }}>

          {error && (
            <div style={{ background: "#3a1a1a", color: "#ff453a", borderRadius: 12, padding: "10px 14px", fontSize: 13, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {error}
              <button onClick={() => setError("")} style={{ background: "transparent", border: "none", color: "#ff453a", cursor: "pointer" }}><X size={14} /></button>
            </div>
          )}

          {view === "dashboard" && (
            <>
              <div style={{ position: "sticky", top: 0, zIndex: 30, background: "transparent", paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 16, marginTop: -12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <AccountToggle value={filterAccount} accounts={accounts} onChange={setFilterAccount} />
                  <IconGroup>
                    <IconButton bare onClick={() => loadAll()}><RefreshCw size={16} /></IconButton>
                    <IconButton bare onClick={() => setView("all")}><Search size={18} /></IconButton>
                    <IconButton bare onClick={() => setShowFilterSheet(true)}><SlidersHorizontal size={18} /></IconButton>
                    <IconButton bare onClick={() => setShowSettings(true)}><Settings size={18} /></IconButton>
                  </IconGroup>
                </div>
              </div>

              <div style={{ background: theme.card, borderRadius: 20, padding: "20px 20px 8px", position: "relative" }}>
                <div style={{ position: "absolute", top: 20, right: 20 }}>
                  <SummaryToggle value={summaryType} onChange={setSummaryType} />
                </div>
                {pressedBucket ? (
                  <div style={{ fontSize: 14, color: theme.muted, marginBottom: 4 }}>{fmtBucketLabel(pressedBucket.dateKey, pressedBucket.granularity)}</div>
                ) : (
                  <button onClick={() => setShowFilterSheet(true)} style={{ background: "transparent", border: "none", padding: 0, display: "flex", alignItems: "center", gap: 4, color: theme.muted, fontSize: 14, marginBottom: 4, cursor: "pointer" }}>
                    {periodLabel(period, summaryType)} <ChevronDown size={13} />
                  </button>
                )}
                <div style={{ fontSize: 34, fontWeight: 700, marginBottom: 12 }}>{fmtEUR(pressedBucket ? pressedBucket.value : summaryAmount)}</div>
                <div style={{ height: 110, touchAction: "none" }}>
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
                      <XAxis dataKey="name" tick={{ fill: theme.muted, fontSize: 10 }} axisLine={false} tickLine={false} interval={tickInterval(chartData.length)} />
                      <Bar dataKey="value" fill={summaryType === "Gain" ? "#32d74b" : theme.text} radius={[4, 4, 4, 4]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ marginTop: 24 }}>
                {pressedBucket ? (
                  renderList(groupByDate(pressedTransactions || []), "Aucune transaction ce jour-là.")
                ) : (
                  renderList(dashboardList, "Aucune dépense pour ces filtres.")
                )}
              </div>
            </>
          )}

          {view === "all" && (
            <>
              <div style={{ position: "sticky", top: 0, zIndex: 30, background: theme.bg, paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)", paddingBottom: 20, marginTop: -12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <IconButton onClick={() => { setView("dashboard"); setSearchQuery(""); }}><ArrowLeft size={18} /></IconButton>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>Toutes les dépenses</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, background: theme.card, borderRadius: 12, padding: "10px 14px" }}>
                  <Search size={16} color={theme.muted} />
                  <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher par titre" style={{ flex: 1, background: "transparent", border: "none", color: theme.text, fontSize: 15, outline: "none" }} />
                  {searchQuery && <button onClick={() => setSearchQuery("")} style={{ background: "transparent", border: "none", cursor: "pointer" }}><X size={16} color={theme.muted} /></button>}
                </div>
              </div>
              {renderList(allList, "Aucune transaction ne correspond.")}
            </>
          )}
        </div>

        <button onClick={() => setShowAdd(true)} style={{ position: "fixed", bottom: "calc(env(safe-area-inset-bottom, 0px) + 28px)", right: 28, width: 56, height: 56, borderRadius: 28, background: theme.mode === "dark" ? "rgba(255,255,255,0.16)" : "rgba(10,10,10,0.10)", backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", border: `1px solid ${theme.glassBorder}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.35)", cursor: "pointer" }}>
          <Plus size={26} color={theme.text} />
        </button>

        {(showAdd || editing) && (
          <TransactionModal tx={editing} categories={categories} accounts={accounts} saving={saving} defaultPayment={defaultPayment} defaultAccount={defaultAccount} onClose={() => { setShowAdd(false); setEditing(null); }} onSave={saveTransaction} onDelete={editing ? () => deleteTransaction(editing.id) : null} openOptions={setOptionSheet} />
        )}

        {showFilterSheet && (
          <TopSheet title="Filtres" onClose={() => setShowFilterSheet(false)}>
            <SheetRow label="Période" value={period} onClick={() => setOptionSheet({ title: "Période", options: PERIODS, value: period, onSelect: setPeriod })} />
            <SheetRow label="Catégorie" value={filterCategory} onClick={() => setOptionSheet({ title: "Catégorie", options: ["Toutes", ...categories], value: filterCategory, onSelect: setFilterCategory })} last />
          </TopSheet>
        )}

        {showSettings && (
          <SettingsModal categories={categories} accounts={accounts} onClose={() => setShowSettings(false)} onDeleteCategory={deleteCategory} onAddCategory={addCategory} newCatName={newCatName} setNewCatName={setNewCatName} onAddAccount={addAccount} onDeleteAccount={deleteAccount} newAccName={newAccName} setNewAccName={setNewAccName} themeMode={themeMode} onToggleTheme={toggleThemeMode} defaultPayment={defaultPayment} defaultAccount={defaultAccount} onChangeDefaultPayment={updateDefaultPayment} onChangeDefaultAccount={updateDefaultAccount} openOptions={setOptionSheet} />
        )}

        {optionSheet && (
          <OptionSheet title={optionSheet.title} options={optionSheet.options} value={optionSheet.value} onSelect={(v) => { optionSheet.onSelect(v); setOptionSheet(null); }} onClose={() => setOptionSheet(null)} />
        )}
      </div>
    </ThemeContext.Provider>
  );
}

function IconButton({ children, onClick, bare }) {
  const theme = useTheme();
  const glassStyle = { background: theme.sheetBg, backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", border: `1px solid ${theme.glassBorder}`, boxShadow: "0 2px 10px rgba(0,0,0,0.15)" };
  return <button onClick={onClick} style={{ width: 38, height: 38, borderRadius: 19, border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: theme.text, cursor: "pointer", flexShrink: 0, ...(bare ? {} : glassStyle) }}>{children}</button>;
}

function IconGroup({ children }) {
  const theme = useTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, background: theme.sheetBg, backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", border: `1px solid ${theme.glassBorder}`, borderRadius: 22, padding: 3, boxShadow: "0 2px 10px rgba(0,0,0,0.15)" }}>
      {children}
    </div>
  );
}

function AccountToggle({ value, accounts, onChange }) {
  const theme = useTheme();
  const pillStyle = { display: "flex", alignItems: "center", gap: 10, background: theme.sheetBg, backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", border: `1px solid ${theme.glassBorder}`, borderRadius: 22, padding: "6px 16px 6px 6px", boxShadow: "0 2px 10px rgba(0,0,0,0.15)" };
  if (!accounts || accounts.length < 2) {
    return <div style={pillStyle}><span style={{ fontSize: 15, fontWeight: 600, paddingLeft: 8 }}>{value || "…"}</span></div>;
  }
  const [left, right] = accounts;
  const isRight = value === right;
  return (
    <div style={pillStyle}>
      <button
        onClick={() => onChange(isRight ? left : right)}
        aria-label="Changer de compte"
        style={{ width: 52, height: 30, borderRadius: 15, border: "none", cursor: "pointer", background: theme.card2, position: "relative", padding: 0, flexShrink: 0, transition: "background 0.2s ease" }}
      >
        <div style={{ width: 24, height: 24, borderRadius: 12, background: "#ffffff", position: "absolute", top: 3, left: isRight ? 25 : 3, transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
      </button>
      <span style={{ fontSize: 15, fontWeight: 600 }}>{isRight ? right : left}</span>
    </div>
  );
}

function SummaryToggle({ value, onChange }) {
  const theme = useTheme();
  const isGain = value === "Gain";
  return (
    <button
      onClick={() => onChange(isGain ? "Dépense" : "Gain")}
      aria-label="Basculer entre dépenses et revenus"
      title={isGain ? "Revenus" : "Dépenses"}
      style={{ width: 52, height: 30, borderRadius: 15, border: `1px solid ${theme.glassBorder}`, cursor: "pointer", background: theme.sheetBg, backdropFilter: "blur(16px) saturate(180%)", WebkitBackdropFilter: "blur(16px) saturate(180%)", position: "relative", padding: 0, flexShrink: 0, boxShadow: "0 1px 6px rgba(0,0,0,0.15)" }}
    >
      <div style={{ width: 24, height: 24, borderRadius: 12, background: "#ffffff", position: "absolute", top: 3, left: isGain ? 25 : 3, transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
    </button>
  );
}

function TopSheet({ title, onClose, children }) {
  const theme = useTheme();
  return (
    <div style={{ position: "fixed", inset: 0, background: theme.overlay, backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 50, paddingTop: 84, overflowY: "auto" }} onClick={onClose}>
      <div style={{ position: "relative", width: "100%", maxWidth: 420, padding: "0 20px" }} onClick={(e) => e.stopPropagation()}>
        <div className="topsheet-panel" style={{ background: theme.sheetBg, backdropFilter: "blur(28px) saturate(180%)", WebkitBackdropFilter: "blur(28px) saturate(180%)", border: `1px solid ${theme.glassBorder}`, borderRadius: 20, maxHeight: "75vh", overflowY: "auto", boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}>
          <div style={{ textAlign: "center", padding: "16px 20px 12px", fontSize: 17, fontWeight: 600, borderBottom: `1px solid ${theme.border}` }}>{title}</div>
          <div style={{ padding: "6px 20px 20px" }}>{children}</div>
        </div>
        <style jsx>{`
          @keyframes topSheetIn {
            from { opacity: 0; transform: scale(0.92) translateY(-8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .topsheet-panel {
            animation: topSheetIn 0.2s cubic-bezier(0.32, 0.72, 0, 1);
            transform-origin: top right;
          }
        `}</style>
      </div>
    </div>
  );
}

function Sheet({ title, onClose, children }) {
  const theme = useTheme();
  return (
    <div style={{ position: "fixed", inset: 0, background: theme.overlay, backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div style={{ position: "relative", width: "100%", maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: -18, left: 16, width: 36, height: 36, borderRadius: 18, background: theme.card2, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${theme.glassBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: theme.text, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.3)", zIndex: 2 }}>
          <X size={18} />
        </button>
        <div className="sheet-panel" style={{ background: theme.sheetBg, backdropFilter: "blur(28px) saturate(180%)", WebkitBackdropFilter: "blur(28px) saturate(180%)", borderTop: `1px solid ${theme.glassBorder}`, borderRadius: "20px 20px 0 0", maxHeight: "85vh", overflowY: "auto", paddingBottom: 24 }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, background: theme.border2, margin: "10px auto 4px" }} />
          <div style={{ textAlign: "center", padding: "10px 20px 16px", fontSize: 17, fontWeight: 600 }}>{title}</div>
          <div style={{ padding: "0 20px" }}>{children}</div>
        </div>
        <style jsx>{`
          @keyframes sheetIn {
            from { opacity: 0; transform: scale(0.85) translateY(12px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .sheet-panel {
            animation: sheetIn 0.28s cubic-bezier(0.32, 0.72, 0, 1);
            transform-origin: top right;
          }
        `}</style>
      </div>
    </div>
  );
}

function SheetRow({ label, value, onClick, last }) {
  const theme = useTheme();
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", background: "transparent", border: "none", borderBottom: last ? "none" : `1px solid ${theme.border}`, cursor: "pointer", textAlign: "left" }}>
      <span style={{ fontSize: 15, color: theme.text }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, color: theme.muted, fontSize: 15 }}>{value} <ChevronRight size={16} /></span>
    </button>
  );
}

function OptionSheet({ title, options, value, onSelect, onClose }) {
  const theme = useTheme();
  return (
    <div style={{ position: "fixed", inset: 0, background: theme.overlay, backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 60, paddingTop: 116, overflowY: "auto" }} onClick={onClose}>
      <div style={{ position: "relative", width: "100%", maxWidth: 420, padding: "0 20px" }} onClick={(e) => e.stopPropagation()}>
        <div className="topsheet-panel" style={{ background: theme.sheetBg, backdropFilter: "blur(28px) saturate(180%)", WebkitBackdropFilter: "blur(28px) saturate(180%)", border: `1px solid ${theme.glassBorder}`, borderRadius: 20, maxHeight: "65vh", overflowY: "auto", boxShadow: "0 16px 40px rgba(0,0,0,0.45)" }}>
          <div style={{ textAlign: "center", padding: "16px 20px 12px", fontSize: 17, fontWeight: 600, borderBottom: `1px solid ${theme.border}` }}>{title}</div>
          <div style={{ padding: "6px 20px 20px" }}>
            {options.map((o, i) => (
              <button key={o} onClick={() => onSelect(o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", background: "transparent", border: "none", borderBottom: i < options.length - 1 ? `1px solid ${theme.border}` : "none", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 15, color: theme.text }}>{o}</span>
                {o === value && <Check size={18} color="#32d74b" />}
              </button>
            ))}
          </div>
        </div>
        <style jsx>{`
          @keyframes topSheetIn {
            from { opacity: 0; transform: scale(0.92) translateY(-8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .topsheet-panel {
            animation: topSheetIn 0.2s cubic-bezier(0.32, 0.72, 0, 1);
            transform-origin: top right;
          }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  const theme = useTheme();
  return <div style={{ marginBottom: 16 }}><div style={{ fontSize: 13, color: theme.muted, marginBottom: 6 }}>{label}</div>{children}</div>;
}

function TransactionModal({ tx, categories, accounts, onClose, onSave, onDelete, openOptions, saving, defaultPayment, defaultAccount }) {
  const theme = useTheme();
  const inputStyle = { width: "100%", background: theme.card2, border: "none", borderRadius: 10, padding: "12px 14px", color: theme.text, fontSize: 15, boxSizing: "border-box" };
  const pickerStyle = { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: theme.card2, border: "none", borderRadius: 10, padding: "12px 14px", color: theme.text, fontSize: 15, cursor: "pointer", boxSizing: "border-box" };
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
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["Dépense", "Gain"].map((t) => (
          <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", background: type === t ? (t === "Gain" ? "#32d74b" : "#ff453a") : theme.card2, color: "#fff" }}>{t}</button>
        ))}
      </div>
      <Field label="Titre"><input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. J'ai acheté une bougie" /></Field>
      <Field label="Montant (€)"><input style={inputStyle} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" /></Field>
      <Field label="Catégorie"><button style={pickerStyle} onClick={() => openOptions({ title: "Catégorie", options: categories, value: category, onSelect: setCategory })}>{category}<ChevronDown size={16} color={theme.muted} /></button></Field>
      <Field label="Compte"><button style={pickerStyle} onClick={() => openOptions({ title: "Compte", options: accounts, value: compte, onSelect: setCompte })}>{compte}<ChevronDown size={16} color={theme.muted} /></button></Field>
      <Field label="Moyen de paiement"><button style={pickerStyle} onClick={() => openOptions({ title: "Moyen de paiement", options: DEFAULT_PAYMENTS, value: payment, onSelect: setPayment })}>{payment}<ChevronDown size={16} color={theme.muted} /></button></Field>
      <Field label="Date"><input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      {error && <div style={{ color: "#ff453a", fontSize: 13, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        {onDelete && <button onClick={onDelete} disabled={saving} style={{ width: 48, height: 48, borderRadius: 10, background: theme.card2, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><Trash2 size={18} color="#ff453a" /></button>}
        <button onClick={handleSave} disabled={saving} style={{ flex: 1, background: theme.accentBg, color: theme.accentText, border: "none", borderRadius: 10, padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Enregistrement…" : "Confirmer"}</button>
      </div>
    </Sheet>
  );
}

function SettingsModal({ categories, accounts, onClose, onDeleteCategory, onAddCategory, newCatName, setNewCatName, onAddAccount, onDeleteAccount, newAccName, setNewAccName, themeMode, onToggleTheme, defaultPayment, defaultAccount, onChangeDefaultPayment, onChangeDefaultAccount, openOptions }) {
  const theme = useTheme();
  const inputStyle = { width: "100%", background: theme.card2, border: "none", borderRadius: 10, padding: "12px 14px", color: theme.text, fontSize: 15, boxSizing: "border-box" };
  const pickerStyle = { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: theme.card2, border: "none", borderRadius: 10, padding: "12px 14px", color: theme.text, fontSize: 15, cursor: "pointer", boxSizing: "border-box" };
  const isLight = themeMode === "light";
  return (
    <TopSheet title="Réglages" onClose={onClose}>
      <div style={{ fontSize: 13, color: theme.muted, marginBottom: 8, fontWeight: 600 }}>APPARENCE</div>
      <div style={{ background: theme.card2, borderRadius: 12, marginBottom: 24, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>{isLight ? <Sun size={16} /> : <Moon size={16} />} Mode clair</span>
        <button onClick={onToggleTheme} aria-label="Basculer le thème" style={{ width: 52, height: 30, borderRadius: 15, border: "none", cursor: "pointer", background: theme.border2, position: "relative", padding: 0, flexShrink: 0 }}>
          <div style={{ width: 24, height: 24, borderRadius: 12, background: "#fff", position: "absolute", top: 3, left: isLight ? 25 : 3, transition: "left 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.4)" }} />
        </button>
      </div>

      <div style={{ fontSize: 13, color: theme.muted, marginBottom: 8, fontWeight: 600 }}>VALEURS PAR DÉFAUT DU RACCOURCI</div>
      <div style={{ fontSize: 12, color: theme.muted, marginBottom: 10 }}>Utilisées à chaque nouvelle dépense, modifiables au cas par cas.</div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>Moyen de paiement</div>
        <button style={pickerStyle} onClick={() => openOptions({ title: "Moyen de paiement par défaut", options: DEFAULT_PAYMENTS, value: defaultPayment, onSelect: onChangeDefaultPayment })}>
          {defaultPayment}<ChevronDown size={16} color={theme.muted} />
        </button>
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>Compte</div>
        <button style={pickerStyle} onClick={() => openOptions({ title: "Compte par défaut", options: accounts, value: defaultAccount, onSelect: onChangeDefaultAccount })}>
          {defaultAccount}<ChevronDown size={16} color={theme.muted} />
        </button>
      </div>

      <div style={{ fontSize: 13, color: theme.muted, marginBottom: 8, fontWeight: 600 }}>CATÉGORIES</div>
      <div style={{ background: theme.card2, borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
        {categories.map((c, i) => (
          <div key={c} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: i < categories.length - 1 ? `1px solid ${theme.border2}` : "none" }}>
            <span style={{ fontSize: 14 }}>{c}</span>
            <button onClick={() => onDeleteCategory(c)} style={{ background: "transparent", border: "none", cursor: "pointer" }}><Trash2 size={16} color="#ff453a" /></button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input style={inputStyle} value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nouvelle catégorie" />
        <button onClick={onAddCategory} style={{ background: theme.accentBg, color: theme.accentText, border: "none", borderRadius: 10, padding: "0 18px", fontWeight: 600, cursor: "pointer" }}>Ajouter</button>
      </div>

      <div style={{ fontSize: 13, color: theme.muted, marginBottom: 8, fontWeight: 600 }}>COMPTES</div>
      <div style={{ background: theme.card2, borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
        {accounts.map((a, i) => (
          <div key={a} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: i < accounts.length - 1 ? `1px solid ${theme.border2}` : "none" }}>
            <span style={{ fontSize: 14 }}>{a}</span>
            <button onClick={() => onDeleteAccount(a)} style={{ background: "transparent", border: "none", cursor: "pointer" }}><Trash2 size={16} color="#ff453a" /></button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input style={inputStyle} value={newAccName} onChange={(e) => setNewAccName(e.target.value)} placeholder="Nouveau compte" />
        <button onClick={onAddAccount} style={{ background: theme.accentBg, color: theme.accentText, border: "none", borderRadius: 10, padding: "0 18px", fontWeight: 600, cursor: "pointer" }}>Ajouter</button>
      </div>
    </TopSheet>
  );
}
