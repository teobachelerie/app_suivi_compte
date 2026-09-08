import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis } from "recharts";
import {
  Search, Settings, Plus, X, ShoppingBag, ChevronDown, PiggyBank,
  Home as HomeIcon, List, PieChart as PieChartIcon, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";

import { api } from "../lib/api";
import { CATEGORY_ICON, PERIODS, DASHBOARD_LIMIT, MONTHS_FR, LEGACY_CORE_NAMES } from "../lib/constants";
import { fmtEUR, fmtDateHeader, periodLabel, buildChart, tickInterval, fmtBucketLabel, inPeriod } from "../lib/format";

import { Card, Divider, Amount, IconButton, ProgressBar } from "../components/ui/Primitives";
import { ListRow } from "../components/ui/ListRow";
import { NavBar, TabBar } from "../components/ui/Navigation";
import { StatTile, SegmentedControl, AccountPill, PeriodChips } from "../components/ui/Selectors";
import { TopSheet, SheetRow, OptionSheet } from "../components/ui/Sheets";
import { TransactionModal } from "../components/TransactionModal";
import { ReglagesScreen } from "../components/ReglagesScreen";

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
  const [categories, setCategories] = useState([]); // [{ id, name }]
  const [accounts, setAccounts] = useState([]); // [{ id, name }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Distingue "comptes principaux" (Courant/Pro) et "livrets d'épargne" par identifiant
  // plutôt que par nom, pour que renommer un compte ne le fasse pas changer de catégorie.
  const [coreAccountIds, setCoreAccountIds] = useState([]);
  const coreAccountIdsRef = useRef([]);
  useEffect(() => { coreAccountIdsRef.current = coreAccountIds; }, [coreAccountIds]);
  useEffect(() => {
    if (typeof window === "undefined" || accounts.length === 0) return;
    let ids = [];
    try {
      const saved = JSON.parse(window.localStorage.getItem("expenses-core-account-ids") || "[]");
      if (Array.isArray(saved)) ids = saved.filter((id) => accounts.some((a) => a.id === id));
    } catch {}
    if (ids.length === 0) {
      ids = accounts.filter((a) => LEGACY_CORE_NAMES.includes(a.name)).map((a) => a.id);
      if (ids.length === 0) ids = accounts.slice(0, 2).map((a) => a.id); // filet de sécurité si les noms ont déjà divergé
    }
    window.localStorage.setItem("expenses-core-account-ids", JSON.stringify(ids));
    setCoreAccountIds(ids);
  }, [accounts]);

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
      const coreIds = coreAccountIdsRef.current;
      const core = meta.accounts.filter((a) => coreIds.includes(a.id));
      setFilterAccount((prev) => (meta.accounts.some((a) => a.name === prev) || prev === "Tous" ? prev : (core[0]?.name || meta.accounts[0]?.name || "Tous")));
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

  const coreAccounts = useMemo(() => accounts.filter((a) => coreAccountIds.includes(a.id)), [accounts, coreAccountIds]);
  const savingsAccounts = useMemo(() => accounts.filter((a) => !coreAccountIds.includes(a.id)), [accounts, coreAccountIds]);
  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);
  const accountNames = useMemo(() => accounts.map((a) => a.name), [accounts]);
  function accountBalance(acc) {
    if (acc === "Tous") return transactions.reduce((s, t) => s + (t.type === "Gain" ? t.amount : -t.amount), 0);
    return transactions.reduce((s, t) => (t.compte === acc ? s + (t.type === "Gain" ? t.amount : -t.amount) : s), 0);
  }
  const balanceTotal = useMemo(() => accountBalance(filterAccount), [transactions, filterAccount]);
  const savingsBalance = savingsDetailAccount ? accountBalance(savingsDetailAccount) : 0;

  // Revenus / dépenses de la période sélectionnée, pour le compte actif — additif, mêmes données que summaryAmount mais pour les deux sens à la fois (nécessaire pour les deux StatTile + le delta sous le solde)
  const revenusPeriode = useMemo(() => periodFiltered.reduce((s, t) => (t.type === "Gain" && (filterAccount === "Tous" || t.compte === filterAccount) ? s + t.amount : s), 0), [periodFiltered, filterAccount]);
  const depensesPeriode = useMemo(() => periodFiltered.reduce((s, t) => (t.type === "Dépense" && (filterAccount === "Tous" || t.compte === filterAccount) ? s + t.amount : s), 0), [periodFiltered, filterAccount]);
  const netPeriode = revenusPeriode - depensesPeriode;

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
  async function saveOptions(property, options) {
    await api("/api/meta", { method: "PATCH", body: { property, options } });
  }
  async function deleteCategory(id) {
    const next = categories.filter((c) => c.id !== id);
    setCategories(next);
    try { await saveOptions("Category", next); } catch (e) { setError(e.message); }
  }
  async function renameCategory(id, newName) {
    const next = categories.map((c) => (c.id === id ? { id: c.id, name: newName } : c));
    setCategories(next);
    try { await saveOptions("Category", next); } catch (e) { setError(e.message); }
  }
  async function addCategory() {
    const name = newCatName.trim();
    if (!name || categories.some((c) => c.name === name)) return;
    const next = [...categories, { name }];
    setCategories(next);
    setNewCatName("");
    try {
      await saveOptions("Category", next);
      await loadAll({ silent: true }); // récupère l'id assigné à la nouvelle catégorie
    } catch (e) { setError(e.message); }
  }
  async function deleteAccount(id) {
    const next = accounts.filter((a) => a.id !== id);
    setAccounts(next);
    try { await saveOptions("Compte", next); } catch (e) { setError(e.message); }
  }
  async function renameAccount(id, newName) {
    const old = accounts.find((a) => a.id === id);
    const next = accounts.map((a) => (a.id === id ? { id: a.id, name: newName } : a));
    setAccounts(next);
    try {
      await saveOptions("Compte", next);
      // Le compte par défaut du raccourci iOS est mémorisé par nom : on le garde synchronisé.
      if (old && defaultAccount === old.name) updateDefaultAccount(newName);
    } catch (e) { setError(e.message); }
  }
  async function addAccount() {
    const name = newAccName.trim();
    if (!name || accounts.some((a) => a.name === name)) return;
    const next = [...accounts, { name }];
    setAccounts(next);
    setNewAccName("");
    try {
      await saveOptions("Compte", next);
      await loadAll({ silent: true }); // récupère l'id assigné au nouveau compte
    } catch (e) { setError(e.message); }
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
                <AccountPill
                  value={filterAccount}
                  options={[
                    ...coreAccounts.map((a) => ({ value: a.name, label: a.name.replace("Compte ", "") })),
                    { value: "Tous", label: "Patrimoine" },
                  ]}
                  onChange={setFilterAccount}
                />
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

              {savingsAccounts.length > 0 && (
                <div>
                  <span style={{ display: "block", color: "var(--text-tertiary)", font: "var(--text-caption-font)", marginBottom: "var(--space-3)" }}>ÉPARGNE</span>
                  <Card padding="md">
                    {savingsAccounts.map((acc, i) => (
                      <React.Fragment key={acc.id}>
                        {i > 0 ? <Divider /> : null}
                        <ListRow Icon={PiggyBank} title={acc.name} onClick={() => setSavingsDetailAccount(acc.name)} trailing={<Amount value={fmtEUR(accountBalance(acc.name))} showSign={false} />} chevron />
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
            categories={categories} coreAccounts={coreAccounts} savingsAccounts={savingsAccounts} accountNames={accountNames}
            onDeleteCategory={deleteCategory} onAddCategory={addCategory} onRenameCategory={renameCategory}
            newCatName={newCatName} setNewCatName={setNewCatName}
            onAddAccount={addAccount} onDeleteAccount={deleteAccount} onRenameAccount={renameAccount}
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
        <TransactionModal tx={editing} categories={categoryNames} accounts={accountNames} saving={saving} defaultPayment={defaultPayment} defaultAccount={defaultAccount} onClose={() => { setShowAdd(false); setEditing(null); }} onSave={saveTransaction} onDelete={editing ? () => deleteTransaction(editing.id) : null} openOptions={setOptionSheet} />
      )}

      {showFilterSheet && (
        <TopSheet title="Filtres" onClose={() => setShowFilterSheet(false)}>
          <SheetRow label="Catégorie" value={filterCategory} onClick={() => setOptionSheet({ title: "Catégorie", options: ["Toutes", ...categoryNames], value: filterCategory, onSelect: setFilterCategory })} last />
        </TopSheet>
      )}

      {optionSheet && (
        <OptionSheet title={optionSheet.title} options={optionSheet.options} value={optionSheet.value} onSelect={(v) => { optionSheet.onSelect(v); setOptionSheet(null); }} onClose={() => setOptionSheet(null)} />
      )}
    </div>
  );
}
