import { useState } from "react";
import { Plus, Zap, CreditCard, PiggyBank, Tag, PieChart, Layers } from "lucide-react";
import { Card } from "./ui/Primitives";

const SLIDES = [
  {
    Icon: Plus,
    title: "Ajouter une transaction",
    text: "Le bouton noir en bas à droite, sur n'importe quel écran, ouvre le formulaire d'ajout — dépense ou revenu, en quelques secondes.",
  },
  {
    Icon: Zap,
    title: "Le Raccourci iOS",
    text: "Une clé se génère dans Réglages → Raccourcis iOS, pour enregistrer une dépense encore plus vite, sans même ouvrir l'app.",
  },
  {
    Icon: CreditCard,
    title: "Créer un nouveau compte",
    text: "Dans Réglages → Comptes, ajoute autant de comptes principaux que tu veux (courant, pro…). Ils apparaissent dans le sélecteur en haut de l'Aperçu.",
  },
  {
    Icon: PiggyBank,
    title: "Créer un nouveau livret",
    text: "Dans Réglages → Épargne, ajoute tes livrets. Ils s'affichent à part sur le tableau de bord, avec leur propre solde et historique.",
  },
  {
    Icon: Tag,
    title: "Créer une catégorie",
    text: "Dans Réglages → Catégories, personnalise la liste. Touche une catégorie existante pour la renommer, partout où elle est déjà utilisée.",
  },
  {
    Icon: PieChart,
    title: "Voir les Budgets",
    text: "L'onglet Budgets montre la répartition réelle de tes dépenses par catégorie sur la période — pas de plafond à configurer, juste la photo de ce qui part où.",
  },
  {
    Icon: Layers,
    title: "La vue Patrimoine",
    text: "Dans le sélecteur de compte, l'option \"Patrimoine\" cumule le solde de tous tes comptes et livrets en une seule vue d'ensemble.",
  },
];

export function Onboarding({ onDone }) {
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--surface-base)", zIndex: 100, display: "flex", flexDirection: "column", fontFamily: "var(--font-core)" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "calc(env(safe-area-inset-top, 0px) + var(--space-4)) var(--gutter-screen) 0" }}>
        <button onClick={onDone} style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", fontSize: 15, fontWeight: 500, cursor: "pointer" }}>Passer</button>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 var(--gutter-screen)", textAlign: "center", gap: "var(--space-6)" }}>
        <Card depth="raised-lg" style={{ width: 96, height: 96, borderRadius: "var(--radius-round)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <slide.Icon size={40} color="var(--icon-primary)" />
        </Card>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: 340 }}>
          <span style={{ font: "600 22px var(--font-display)", color: "var(--text-primary)" }}>{slide.title}</span>
          <span style={{ font: "400 15px/1.5 var(--font-core)", color: "var(--text-secondary)" }}>{slide.text}</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", padding: "0 var(--gutter-screen) calc(env(safe-area-inset-bottom, 0px) + var(--space-6))" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Page ${i + 1}`}
              style={{ width: i === index ? 20 : 7, height: 7, borderRadius: "var(--radius-round)", border: "none", background: i === index ? "var(--accent-bg)" : "var(--grey-2)", cursor: "pointer", transition: "var(--transition-tactile)" }}
            />
          ))}
        </div>
        <button
          onClick={() => (isLast ? onDone() : setIndex((i) => i + 1))}
          style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "14px 0", fontSize: 15, fontWeight: 600, cursor: "pointer", boxShadow: "var(--elev-raised-sm)" }}
        >
          {isLast ? "Commencer" : "Suivant"}
        </button>
      </div>
    </div>
  );
}
