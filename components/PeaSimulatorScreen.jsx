import { useState, useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer, XAxis, Tooltip } from "recharts";
import { Card } from "./ui/Primitives";
import { NavBar } from "./ui/Navigation";
import { TextField } from "./ui/TextField";

// Taux mensuel équivalent à un taux annuel composé, plus juste qu'un simple /12.
function monthlyRate(annualPct) {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

// Plafond légal des versements sur un PEA (les gains, eux, ne sont pas plafonnés).
const PLAFOND_VERSEMENTS = 150000;

function simulate(p) {
  const rMensuel = monthlyRate(p.rendementAnnuel);
  let verseNet = Math.min(p.apportInitial, PLAFOND_VERSEMENTS);
  let valeur = verseNet;
  const points = [{ annee: 0, verse: Math.round(verseNet), interets: 0, total: Math.round(valeur) }];

  for (let mois = 1; mois <= p.dureeAnnees * 12; mois++) {
    // Une fois le plafond atteint, plus aucun versement : seuls les intérêts composés continuent.
    const versement = Math.min(p.versementMensuel, Math.max(0, PLAFOND_VERSEMENTS - verseNet));
    valeur = valeur * (1 + rMensuel) + versement;
    verseNet += versement;

    if (mois % 12 === 0) {
      const interets = Math.max(0, valeur - verseNet);
      points.push({ annee: mois / 12, verse: Math.round(verseNet), interets: Math.round(interets), total: Math.round(valeur) });
    }
  }
  return points;
}

// Montants à l'euro près : sur 20 ans, les centimes n'apportent rien et chargent la lecture.
// L'espace fine (U+202F) des milliers disparaît presque avec l'interlettrage serré d'Inter Black :
// espace insécable normale à la place, pour lire « 118 461 € » et pas « 118461 € ».
const fmtEuros = (n) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n).replace(/\u202f/g, "\u00a0");
// Pourcentage du gain avec espaces des milliers (« 4 950 % »), même espace insécable que les montants.
const fmtPct = (n) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n).replace(/\u202f/g, "\u00a0")}\u00a0%`;
// Bandeau : texte à gauche (largeur fixe au contenu), chiffre à droite qui prend la place restante
// et ne se coupe (points de suspension) qu'en cas de valeur vraiment démesurée.
const stripStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)", minHeight: 64 };
const stripLabel = { display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 };
const stripNumber = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", textAlign: "right", fontSize: "clamp(22px, 7vw, 28px)" };
// Gros chiffres des deux cases : taille qui suit la largeur de l'écran, pour ne jamais déborder.
const bigNumber = { fontSize: "clamp(22px, 7.4vw, 30px)", fontWeight: 900, letterSpacing: "-0.035em", lineHeight: 1.05, whiteSpace: "nowrap" };
const anLabel = (n) => `${n} an${n > 1 ? "s" : ""}`;

export function PeaSimulatorScreen({ onBack }) {
  const [apportInitial, setApportInitial] = useState("1000");
  const [versementMensuel, setVersementMensuel] = useState("200");
  const [rendementAnnuel, setRendementAnnuel] = useState("8");
  const [dureeAnnees, setDureeAnnees] = useState("20");
  // Année touchée sur le graphique : les deux cases du haut l'affichent. null = fin de la durée.
  const [selected, setSelected] = useState(null);

  const num = (v, fallback) => { const n = parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) ? n : fallback; };

  const params = {
    apportInitial: Math.max(0, num(apportInitial, 0)),
    versementMensuel: Math.max(0, num(versementMensuel, 0)),
    rendementAnnuel: num(rendementAnnuel, 8),
    dureeAnnees: Math.min(50, Math.max(1, Math.round(num(dureeAnnees, 20)))),
  };

  const points = useMemo(() => simulate(params), [
    params.apportInitial, params.versementMensuel, params.rendementAnnuel, params.dureeAnnees,
  ]);
  const last = points[points.length - 1];
  const shown = selected !== null && points[selected] ? points[selected] : last;
  const gainPct = shown.verse > 0 ? (shown.interets / shown.verse) * 100 : 0;
  const anneePlafond = last.verse >= PLAFOND_VERSEMENTS ? points.find((pt) => pt.verse >= PLAFOND_VERSEMENTS)?.annee : null;
  const label = selected !== null && shown !== last ? `Année ${shown.annee}` : `Dans ${anLabel(params.dureeAnnees)}`;

  // Changer un paramètre ramène l'affichage à la fin de la durée (l'année touchée n'a plus de sens).
  const edit = (setter) => (e) => { setSelected(null); setter(e.target.value); };
  const pickYear = (state) => { if (state && Number.isInteger(state.activeTooltipIndex)) setSelected(state.activeTooltipIndex); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <NavBar back title="Simulateur PEA" onBack={onBack} />

      {/* Deux bandeaux empilés, sur toute la largeur : étiquette et sous-ligne à gauche, chiffre à
          droite. Côte à côte, un gain au-delà de 1 000 % ne tenait plus dans sa demi-case. */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        <Card depth="raised-lg" padding="var(--space-3) var(--space-4)" style={stripStyle}>
          <div style={stripLabel}>
            <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)", textTransform: "uppercase" }}>{label}</span>
            <span className="fin-sub-serif" style={{ fontSize: 13 }}>dont {fmtEuros(shown.verse)} versés</span>
          </div>
          <span className="ds-tabular fin-grad-text" style={{ ...bigNumber, ...stripNumber }}>{fmtEuros(shown.total)}</span>
        </Card>
        <Card depth="raised-lg" padding="var(--space-3) var(--space-4)" style={stripStyle}>
          <div style={stripLabel}>
            <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)" }}>GAIN</span>
            <span className="fin-sub-serif" style={{ fontSize: 13 }}>d'intérêts</span>
          </div>
          <span className="ds-tabular" style={{ ...bigNumber, ...stripNumber, color: "var(--text-primary)" }}>+{fmtPct(gainPct)}</span>
        </Card>
      </div>

      <Card padding="md" style={{ paddingBottom: "var(--space-4)" }}>
        <div style={{ height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} onClick={pickYear} onMouseMove={pickYear}>
              <XAxis dataKey="annee" tick={{ fontSize: 12, fill: "var(--text-tertiary)" }} axisLine={false} tickLine={false} tickFormatter={anLabel} minTickGap={24} />
              {/* Pas de bulle : elle masquait la courbe et le total y était illisible. L'année touchée
                  s'affiche dans les cases du haut ; seul le trait vertical reste. */}
              <Tooltip content={() => null} cursor={{ stroke: "var(--text-primary)", strokeWidth: 1, strokeDasharray: "3 3" }} />
              <Area type="monotone" dataKey="verse" stackId="1" stroke="var(--text-tertiary)" strokeWidth={1.5} fill="var(--text-tertiary)" fillOpacity={0.22} isAnimationActive={false} activeDot={false} />
              <Area type="monotone" dataKey="interets" stackId="1" stroke="var(--accent-orange)" strokeWidth={2} fill="var(--accent-orange)" fillOpacity={0.45} isAnimationActive={false} activeDot={{ r: 5, fill: "var(--accent-orange)", stroke: "var(--surface-raised)", strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", alignItems: "center", marginTop: 10, fontSize: 13, color: "var(--text-tertiary)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--text-tertiary)", opacity: 0.5 }} /> Versements</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent-orange)" }} /> Intérêts</span>
        </div>
        <div style={{ marginTop: 8, textAlign: "center", fontSize: 13, color: "var(--text-tertiary)", minHeight: 18 }}>
          {selected !== null && shown !== last
            ? <button type="button" onClick={() => setSelected(null)} style={{ border: "none", background: "none", padding: 4, color: "var(--accent-orange)", font: "inherit", fontWeight: 600, cursor: "pointer" }}>Revenir à {anLabel(params.dureeAnnees)}</button>
            : "Touche la courbe pour voir une année"}
        </div>
      </Card>

      <div>
        <span style={{ color: "var(--text-tertiary)", font: "var(--text-caption-font)", display: "block", marginBottom: 10 }}>PARAMÈTRES</span>
        <Card padding="md" style={{ paddingBottom: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", columnGap: "var(--space-3)" }}>
            <TextField label="Au départ" suffix="€" inputMode="decimal" value={apportInitial} onChange={edit(setApportInitial)} />
            <TextField label="Chaque mois" suffix="€" inputMode="decimal" value={versementMensuel} onChange={edit(setVersementMensuel)} />
            <TextField label="Rendement par an" suffix="%" inputMode="decimal" value={rendementAnnuel} onChange={edit(setRendementAnnuel)} />
            <TextField label="Durée" suffix="ans" inputMode="numeric" value={dureeAnnees} onChange={edit(setDureeAnnees)} />
          </div>
        </Card>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", padding: "0 var(--space-4)", lineHeight: 1.5 }}>
        {anneePlafond !== null ? `Plafond de ${fmtEuros(PLAFOND_VERSEMENTS)} de versements atteint à l'année ${anneePlafond}. ` : ""}
        Simulation indicative à rendement constant, avant impôts. Ce n'est pas un conseil en investissement.
      </div>
    </div>
  );
}
