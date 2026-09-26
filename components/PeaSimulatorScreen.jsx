import { useState, useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { Card } from "./ui/Primitives";
import { NavBar } from "./ui/Navigation";
import { Field, fieldInputStyle } from "./ui/Sheets";
import { fmtEUR } from "../lib/format";

// Taux mensuel équivalent à un taux annuel composé, plus juste qu'un simple /12.
function monthlyRate(annualPct) {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

function simulate(p) {
  const rMensuel = monthlyRate(p.rendementAnnuel);
  let valeur = p.apportInitial;
  let verseNet = p.apportInitial;
  const points = [{ annee: 0, verse: Math.round(verseNet), interets: 0, total: Math.round(valeur) }];

  for (let mois = 1; mois <= p.dureeAnnees * 12; mois++) {
    valeur = valeur * (1 + rMensuel) + p.versementMensuel;
    verseNet += p.versementMensuel;

    if (mois % 12 === 0) {
      const interets = Math.max(0, valeur - verseNet);
      points.push({ annee: mois / 12, verse: Math.round(verseNet), interets: Math.round(interets), total: Math.round(valeur) });
    }
  }
  return points;
}

export function PeaSimulatorScreen({ onBack }) {
  const [apportInitial, setApportInitial] = useState("1000");
  const [versementMensuel, setVersementMensuel] = useState("200");
  const [rendementAnnuel, setRendementAnnuel] = useState("8");
  const [inflation, setInflation] = useState("3");
  const [dureeAnnees, setDureeAnnees] = useState("20");

  const num = (v, fallback) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : fallback; };

  const params = {
    apportInitial: num(apportInitial, 0),
    versementMensuel: num(versementMensuel, 0),
    rendementAnnuel: num(rendementAnnuel, 8),
    dureeAnnees: Math.max(1, Math.round(num(dureeAnnees, 20))),
  };

  const points = useMemo(() => simulate(params), [
    params.apportInitial, params.versementMensuel, params.rendementAnnuel, params.dureeAnnees,
  ]);
  const last = points[points.length - 1];
  const gainPct = last.verse > 0 ? (last.interets / last.verse) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <NavBar back title="Simulateur PEA" onBack={onBack} />

      <Card depth="raised-lg" padding="lg" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>PLUS-VALUE APRÈS {params.dureeAnnees} ANS</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ font: "600 34px var(--font-display)", color: "var(--accent-amber)" }}>{gainPct.toFixed(0)} %</span>
          <span style={{ font: "400 15px var(--font-core)", color: "var(--text-tertiary)" }}>{fmtEUR(last.verse)} versés</span>
        </div>
      </Card>

      <Card padding="md" style={{ height: 260, paddingBottom: "var(--space-5)" }}>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={points}>
            <XAxis dataKey="annee" tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} an${v > 1 ? "s" : ""}`} />
            <Tooltip formatter={(v, name) => [fmtEUR(v), name === "verse" ? "Versements cumulés" : "Intérêts"]} labelFormatter={(v) => `Année ${v}`} contentStyle={{ borderRadius: 8, border: "none", fontSize: 12 }} />
            <Area type="monotone" dataKey="verse" stackId="1" stroke="#ffffff" fill="#ffffff" name="verse" />
            <Area type="monotone" dataKey="interets" stackId="1" stroke="var(--accent-amber)" fill="var(--accent-amber)" name="interets" />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#ffffff" }} /> Versements</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--accent-amber)" }} /> Intérêts</span>
        </div>
      </Card>

      <div>
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)", display: "block", marginBottom: 10 }}>PARAMÈTRES</span>
        <Card padding="md">
          <Field label="Apport initial (€)"><input style={fieldInputStyle} value={apportInitial} onChange={(e) => setApportInitial(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Versement mensuel (€)"><input style={fieldInputStyle} value={versementMensuel} onChange={(e) => setVersementMensuel(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Rendement annuel (%)"><input style={fieldInputStyle} value={rendementAnnuel} onChange={(e) => setRendementAnnuel(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Inflation annuelle (%)"><input style={fieldInputStyle} value={inflation} onChange={(e) => setInflation(e.target.value)} inputMode="decimal" /></Field>
          <div style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 6 }}>Durée (années)</div>
            <input style={fieldInputStyle} value={dureeAnnees} onChange={(e) => setDureeAnnees(e.target.value)} inputMode="numeric" />
          </div>
        </Card>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "0 var(--space-4)" }}>
        Simulation indicative, avec un rendement composé mensuellement. Ne constitue pas un conseil en investissement : les marchés réels ne suivent jamais une courbe aussi lisse.
      </div>
    </div>
  );
}
