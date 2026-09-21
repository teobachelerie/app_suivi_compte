import { useState, useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { Card, Switch } from "./ui/Primitives";
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
  let versementsBruts = p.apportInitial;
  const points = [{ annee: 0, verse: Math.round(verseNet), interets: 0, total: Math.round(valeur) }];

  for (let mois = 1; mois <= p.dureeAnnees * 12; mois++) {
    let versementEffectif = p.versementMensuel;
    if (p.peaJeuneEnabled) {
      const ageCourant = p.ageActuel + mois / 12;
      const plafond = ageCourant < p.ageTransition ? p.plafondJeune : p.plafondClassique;
      const margeRestante = Math.max(0, plafond - versementsBruts);
      versementEffectif = Math.min(p.versementMensuel, margeRestante);
    }
    const netFluxMensuel = versementEffectif - p.renteMensuelle;
    valeur = valeur * (1 + rMensuel) + netFluxMensuel;
    verseNet += netFluxMensuel;
    versementsBruts += versementEffectif;

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
  const [renteMensuelle, setRenteMensuelle] = useState("0");
  const [rendementAnnuel, setRendementAnnuel] = useState("8");
  const [inflation, setInflation] = useState("3");
  const [dureeAnnees, setDureeAnnees] = useState("20");

  const [peaJeuneEnabled, setPeaJeuneEnabled] = useState(false);
  const [ageActuel, setAgeActuel] = useState("17");
  const [ageTransition, setAgeTransition] = useState("21");
  const [plafondJeune, setPlafondJeune] = useState("20000");
  const [plafondClassique, setPlafondClassique] = useState("150000");

  const num = (v, fallback) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : fallback; };

  const params = {
    apportInitial: num(apportInitial, 0),
    versementMensuel: num(versementMensuel, 0),
    renteMensuelle: num(renteMensuelle, 0),
    rendementAnnuel: num(rendementAnnuel, 8),
    dureeAnnees: Math.max(1, Math.round(num(dureeAnnees, 20))),
    peaJeuneEnabled,
    ageActuel: num(ageActuel, 17),
    ageTransition: Math.min(25, Math.max(18, num(ageTransition, 21))),
    plafondJeune: num(plafondJeune, 20000),
    plafondClassique: num(plafondClassique, 150000),
  };

  const points = useMemo(() => simulate(params), [
    params.apportInitial, params.versementMensuel, params.renteMensuelle, params.rendementAnnuel, params.dureeAnnees,
    params.peaJeuneEnabled, params.ageActuel, params.ageTransition, params.plafondJeune, params.plafondClassique,
  ]);
  const last = points[points.length - 1];
  const gainPct = last.verse > 0 ? (last.interets / last.verse) * 100 : 0;
  const inflationPct = num(inflation, 3);
  const valeurReelle = last.total / Math.pow(1 + inflationPct / 100, params.dureeAnnees);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <NavBar back title="Simulateur PEA" onBack={onBack} />

      <Card depth="raised-lg" padding="lg" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>VALEUR ESTIMÉE APRÈS {params.dureeAnnees} ANS</span>
        <span style={{ font: "600 34px var(--font-display)", color: "var(--text-primary)" }}>{fmtEUR(last.total)}</span>
        <span style={{ font: "400 13px var(--font-core)", color: "var(--text-tertiary)" }}>dont {fmtEUR(last.interets)} d'intérêts ({gainPct.toFixed(0)} % de plus-value), soit {fmtEUR(Math.round(valeurReelle))} en pouvoir d'achat actuel</span>
      </Card>

      <Card padding="md" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <XAxis dataKey="annee" tick={{ fontSize: 11, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v} an${v > 1 ? "s" : ""}`} />
            <Tooltip formatter={(v, name) => [fmtEUR(v), name === "verse" ? "Versements cumulés" : "Intérêts"]} labelFormatter={(v) => `Année ${v}`} contentStyle={{ borderRadius: 8, border: "none", fontSize: 12 }} />
            <Area type="monotone" dataKey="verse" stackId="1" stroke="#0A0A0A" fill="#0A0A0A" name="verse" />
            <Area type="monotone" dataKey="interets" stackId="1" stroke="var(--green)" fill="var(--green)" name="interets" />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 4 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "#0A0A0A" }} /> Versements</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-tertiary)" }}><span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--green)" }} /> Intérêts</span>
        </div>
      </Card>

      <div>
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)", display: "block", marginBottom: 10 }}>PARAMÈTRES</span>
        <Card padding="md">
          <Field label="Apport initial (€)"><input style={fieldInputStyle} value={apportInitial} onChange={(e) => setApportInitial(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Versement mensuel (€)"><input style={fieldInputStyle} value={versementMensuel} onChange={(e) => setVersementMensuel(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Rente mensuelle retirée (€, facultatif)"><input style={fieldInputStyle} value={renteMensuelle} onChange={(e) => setRenteMensuelle(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Rendement annuel (%)"><input style={fieldInputStyle} value={rendementAnnuel} onChange={(e) => setRendementAnnuel(e.target.value)} inputMode="decimal" /></Field>
          <Field label="Inflation annuelle (%)"><input style={fieldInputStyle} value={inflation} onChange={(e) => setInflation(e.target.value)} inputMode="decimal" /></Field>
          <div style={{ marginBottom: 0 }}>
            <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 6 }}>Durée (années)</div>
            <input style={fieldInputStyle} value={dureeAnnees} onChange={(e) => setDureeAnnees(e.target.value)} inputMode="numeric" />
          </div>
        </Card>
      </div>

      <div>
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)", display: "block", marginBottom: 10 }}>PEA JEUNE VERS PEA CLASSIQUE</span>
        <Card padding="md" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0" }}>
            <span style={{ fontSize: 14 }}>Simuler la transition</span>
            <Switch checked={peaJeuneEnabled} onChange={setPeaJeuneEnabled} />
          </div>
          {peaJeuneEnabled && (
            <div style={{ paddingTop: 10 }}>
              <Field label="Ton âge actuel"><input style={fieldInputStyle} value={ageActuel} onChange={(e) => setAgeActuel(e.target.value)} inputMode="numeric" /></Field>
              <Field label="Âge de passage au PEA classique (18 à 25)"><input style={fieldInputStyle} value={ageTransition} onChange={(e) => setAgeTransition(e.target.value)} inputMode="numeric" /></Field>
              <Field label="Plafond de versement du PEA Jeune (€)"><input style={fieldInputStyle} value={plafondJeune} onChange={(e) => setPlafondJeune(e.target.value)} inputMode="decimal" /></Field>
              <div style={{ marginBottom: 0 }}>
                <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 6 }}>Plafond de versement du PEA classique (€)</div>
                <input style={fieldInputStyle} value={plafondClassique} onChange={(e) => setPlafondClassique(e.target.value)} inputMode="decimal" />
              </div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 10, lineHeight: 1.5 }}>
                Tant que tu es sous le plafond du PEA Jeune, tes versements continuent normalement. Une fois le plafond atteint, ton argent continue de fructifier mais tes versements s'arrêtent jusqu'à l'âge de transition, où le plafond du PEA classique prend le relais.
              </div>
            </div>
          )}
        </Card>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "0 var(--space-4)" }}>
        Simulation indicative, avec un rendement composé mensuellement. Ne constitue pas un conseil en investissement : les marchés réels ne suivent jamais une courbe aussi lisse.
      </div>
    </div>
  );
}
