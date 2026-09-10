import { useState, useMemo } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { TrendingUp, Award, Flame } from "lucide-react";
import { Card, Divider, Amount } from "./ui/Primitives";
import { NavBar } from "./ui/Navigation";
import { fmtEUR } from "../lib/format";

const MONTHS_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

// Agrège les transactions (toutes catégories/comptes confondus — vue globale, pas filtrée) par
// mois calendaire sur les 12 derniers mois, dans l'ordre chronologique.
function useMonthlyStats(transactions) {
  return useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: MONTHS_SHORT[d.getMonth()], revenus: 0, depenses: 0 });
    }
    const byKey = Object.fromEntries(months.map((m) => [m.key, m]));
    transactions.forEach((t) => {
      const key = t.date.slice(0, 7);
      const m = byKey[key];
      if (!m) return;
      if (t.type === "Gain") m.revenus += t.amount; else m.depenses += t.amount;
    });
    return months.map((m) => ({ ...m, epargne: m.revenus - m.depenses, taux: m.revenus > 0 ? ((m.revenus - m.depenses) / m.revenus) * 100 : null }));
  }, [transactions]);
}

// Grille façon GitHub : intensité de dépense par jour, sur les ~26 dernières semaines.
function useDailyHeatmap(transactions) {
  return useMemo(() => {
    const days = 26 * 7;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totals = {};
    transactions.forEach((t) => {
      if (t.type !== "Dépense") return;
      totals[t.date] = (totals[t.date] || 0) + t.amount;
    });
    const cells = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      cells.push({ date: key, amount: totals[key] || 0 });
    }
    const max = Math.max(1, ...cells.map((c) => c.amount));
    // Regrouper en semaines (colonnes de 7) pour l'affichage.
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { weeks, max };
  }, [transactions]);
}

function heatColor(amount, max) {
  if (amount <= 0) return "var(--surface-inset)";
  const t = Math.min(1, amount / max);
  // Intensité progressive sur la couleur d'accent rouge existante (dépense) plutôt qu'une nouvelle teinte.
  const alpha = 0.15 + t * 0.7;
  return `color-mix(in srgb, var(--red) ${Math.round(alpha * 100)}%, var(--surface-inset))`;
}

export function ProgressionScreen({ transactions, onBack }) {
  const monthly = useMonthlyStats(transactions);
  const heat = useDailyHeatmap(transactions);
  const currentMonth = monthly[monthly.length - 1];

  const validMonths = monthly.filter((m) => m.revenus > 0);
  const bestSavingsRateMonth = validMonths.length ? validMonths.reduce((a, b) => (b.taux > a.taux ? b : a)) : null;
  const monthsWithSpend = monthly.filter((m) => m.depenses > 0);
  const mostFrugalMonth = monthsWithSpend.length ? monthsWithSpend.reduce((a, b) => (b.depenses < a.depenses ? b : a)) : null;
  let bestStreak = 0, currentStreak = 0;
  monthly.forEach((m) => { if (m.epargne > 0) { currentStreak += 1; bestStreak = Math.max(bestStreak, currentStreak); } else currentStreak = 0; });

  const totalFlux = currentMonth.revenus;
  const flowSegments = useMemo(() => {
    const byCat = {};
    const monthKey = currentMonth.key;
    transactions.forEach((t) => {
      if (t.type !== "Dépense" || t.date.slice(0, 7) !== monthKey) return;
      byCat[t.category] = (byCat[t.category] || 0) + t.amount;
    });
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const epargne = Math.max(0, currentMonth.revenus - currentMonth.depenses);
    return { entries, epargne };
  }, [transactions, currentMonth]);

  const flowColors = ["#111", "#444", "#777", "#999", "#bbb", "#ccc"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <NavBar back title="Progression" onBack={onBack} />

      <Card depth="raised-lg" padding="lg" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>TAUX D'ÉPARGNE · CE MOIS-CI</span>
        <Amount value={currentMonth.taux != null ? `${currentMonth.taux.toFixed(0)} %` : "—"} direction={currentMonth.taux >= 0 ? "income" : "expense"} size="xl" showSign={false} />
        <span style={{ font: "400 13px var(--font-core)", color: "var(--text-tertiary)" }}>(revenus − dépenses) / revenus, tous comptes confondus</span>
      </Card>

      <div>
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)", display: "block", marginBottom: 10 }}>TENDANCE · 12 DERNIERS MOIS</span>
        <Card padding="md" style={{ height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} interval={1} />
              <Tooltip formatter={(v) => (v != null ? `${v.toFixed(0)} %` : "—")} labelStyle={{ color: "#000" }} contentStyle={{ borderRadius: 8, border: "none", fontSize: 12 }} />
              <Bar dataKey="taux" radius={[4, 4, 0, 0]} fill="var(--accent-bg)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div>
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)", display: "block", marginBottom: 10 }}>RECORDS PERSONNELS</span>
        <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {bestSavingsRateMonth && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                <Award size={18} color="var(--icon-primary)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14 }}>Meilleur taux d'épargne</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{bestSavingsRateMonth.label} — {bestSavingsRateMonth.taux.toFixed(0)} %</div>
                </div>
              </div>
              <Divider />
            </>
          )}
          {mostFrugalMonth && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
                <TrendingUp size={18} color="var(--icon-primary)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14 }}>Mois le plus économe</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{mostFrugalMonth.label} — {fmtEUR(mostFrugalMonth.depenses)} dépensés</div>
                </div>
              </div>
              <Divider />
            </>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
            <Flame size={18} color="var(--icon-primary)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14 }}>Plus longue série</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{bestStreak} mois consécutifs de trésorerie positive</div>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)", display: "block", marginBottom: 10 }}>INTENSITÉ DES DÉPENSES · 6 DERNIERS MOIS</span>
        <Card padding="md" style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", gap: 3 }}>
            {heat.weeks.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {week.map((day) => (
                  <div key={day.date} title={`${day.date} — ${fmtEUR(day.amount)}`} style={{ width: 10, height: 10, borderRadius: 2, background: heatColor(day.amount, heat.max) }} />
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)", display: "block", marginBottom: 10 }}>RÉPARTITION DES REVENUS · CE MOIS-CI</span>
        <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {totalFlux > 0 ? (
            <>
              <div style={{ display: "flex", height: 14, borderRadius: "var(--radius-round)", overflow: "hidden", boxShadow: "var(--elev-inset-sm)" }}>
                {flowSegments.entries.map(([cat, amt], i) => (
                  <div key={cat} style={{ width: `${(amt / totalFlux) * 100}%`, background: flowColors[i % flowColors.length] }} title={`${cat} — ${fmtEUR(amt)}`} />
                ))}
                <div style={{ width: `${(flowSegments.epargne / totalFlux) * 100}%`, background: "var(--green)" }} title={`Épargné — ${fmtEUR(flowSegments.epargne)}`} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {flowSegments.entries.slice(0, 5).map(([cat, amt], i) => (
                  <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: flowColors[i % flowColors.length] }} />
                    <span style={{ flex: 1, color: "var(--text-secondary)" }}>{cat}</span>
                    <span>{fmtEUR(amt)}</span>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--green)" }} />
                  <span style={{ flex: 1, color: "var(--text-secondary)" }}>Épargné</span>
                  <span>{fmtEUR(flowSegments.epargne)}</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: 14, padding: "8px 0" }}>Pas encore de revenus ce mois-ci.</div>
          )}
        </Card>
      </div>

    </div>
  );
}
