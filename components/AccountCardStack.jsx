import { useState, useEffect } from "react";

// Traitement visuel par banque — couleurs réelles de la banque (jamais son logo), avec la règle
// stricte du système de marque : tout texte sur un fond clair/vif doit être sombre, jamais blanc.
const CARD_STYLES = {
  "societe-generale": {
    background: "linear-gradient(90deg, #0a0a0a 0%, #0a0a0a 54%, #f4f4f2 54%, #f4f4f2 54.6%, #b30014 55%, #e9041e 100%)",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.55)",
    bankLabel: "SOCIÉTÉ GÉNÉRALE",
  },
  "boursorama": {
    background: "linear-gradient(120deg, #ff3d8a 0%, #ff3d8a 48%, #8fd9f5 100%)",
    text: "#1a0e14",
    textMuted: "rgba(26,14,20,0.6)",
    bankLabel: "BOURSORAMA",
  },
  "bnp-paribas": {
    background: "linear-gradient(135deg, #00543C 0%, #00A651 100%)",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.6)",
    bankLabel: "BNP PARIBAS",
  },
  "credit-agricole": {
    background: "linear-gradient(135deg, #3C7A1E 0%, #8DC63F 100%)",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.6)",
    bankLabel: "CRÉDIT AGRICOLE",
  },
  "banque-postale": {
    background: "linear-gradient(135deg, #005A96 0%, #3AA8D8 100%)",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.6)",
    bankLabel: "LA BANQUE POSTALE",
  },
  "lcl": {
    background: "linear-gradient(135deg, #002B4D 0%, #0B5C96 100%)",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.55)",
    bankLabel: "LCL",
  },
  "caisse-epargne": {
    background: "linear-gradient(135deg, #C8102E 0%, #E2001A 100%)",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.6)",
    bankLabel: "CAISSE D'ÉPARGNE",
  },
  "revolut": {
    background: "linear-gradient(135deg, #1A1A1A 0%, #2E2E2E 100%)",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.55)",
    bankLabel: "REVOLUT",
  },
  "n26": {
    background: "linear-gradient(135deg, #1E6F5C 0%, #4FBFA5 100%)",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.6)",
    bankLabel: "N26",
  },
  "trade-republic": {
    background: "linear-gradient(135deg, #1A1A1A 0%, #3A3A3C 100%)",
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.55)",
    bankLabel: "TRADE REPUBLIC",
  },
};

// Patrimoine n'est pas une banque : un halo de marque Finelio, plus chaud et plus riche que le
// reste de l'app pour bien se distinguer dans la pile — décliné clair/sombre puisque ce n'est pas
// une couleur de banque figée.
const PATRIMOINE_STYLE_DARK = {
  background:
    "radial-gradient(circle at 18% 12%, rgba(255,160,80,0.95), transparent 50%), " +
    "radial-gradient(circle at 90% 35%, rgba(235,95,40,0.9), transparent 58%), " +
    "radial-gradient(circle at 50% 105%, rgba(180,70,25,1), transparent 68%), #3d2210",
  text: "#f6f5f2",
  textMuted: "rgba(246,245,242,0.6)",
  bankLabel: "FINELIO",
};
const PATRIMOINE_STYLE_LIGHT = {
  background:
    "radial-gradient(circle at 18% 12%, rgba(255,190,130,0.95), transparent 50%), " +
    "radial-gradient(circle at 90% 35%, rgba(255,140,80,0.85), transparent 58%), " +
    "radial-gradient(circle at 50% 105%, rgba(230,110,50,0.9), transparent 68%), #FBDCC0",
  text: "#3d2210",
  textMuted: "rgba(61,34,16,0.65)",
  bankLabel: "FINELIO",
};

// Repli pour une banque non prévue par la maquette (n'importe quel autre préréglage choisi dans
// Réglages) : un dégradé simple à partir de sa couleur, texte clair par défaut — reste correct
// visuellement même si moins abouti que les traitements sur-mesure ci-dessus.
function fallbackStyle(bankPreset) {
  if (!bankPreset) return { background: "var(--surface-2)", text: "var(--text-primary)", textMuted: "var(--text-tertiary)", bankLabel: "" };
  return {
    background: `linear-gradient(120deg, ${bankPreset.primary} 0%, ${bankPreset.secondary} 100%)`,
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.6)",
    bankLabel: bankPreset.name.toUpperCase(),
  };
}

// Résolution du style d'une carte de compte — exportée pour être réutilisée telle quelle par les
// cartes de livret (même traitement de marque, en plus compact).
export function styleForAccountCard(acc, bankPresets, themeMode) {
  if (acc.key === "Tous") return themeMode === "light" ? PATRIMOINE_STYLE_LIGHT : PATRIMOINE_STYLE_DARK;
  if (acc.bankId && CARD_STYLES[acc.bankId]) return CARD_STYLES[acc.bankId];
  return fallbackStyle(bankPresets.find((b) => b.id === acc.bankId));
}

const CARD_HEIGHT = 200;
const OFFSET = 56;

function CardFace({ style, name, isFront, frontContent }) {
  return (
    <div style={{ position: "relative", height: "100%", boxSizing: "border-box", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <span style={{ color: style.text, fontSize: 17, fontWeight: 700 }}>{name}</span>
      {isFront && frontContent}
    </div>
  );
}

// Pile de cartes de comptes : le compte actif est devant en plein, les deux autres sont derrière,
// décalés vers le haut, ne montrant qu'un bandeau avec leur nom. Toucher un compte du fond le fait
// passer devant — les autres reculent d'un cran chacun.
export function AccountCardStack({ accounts, active, onSelect, bankPresets, balanceLabel, balanceValue, variationDirection, variationText, getRef, themeMode }) {
  // accounts: [{ key, name, bankId }] — 3 entrées exactement (Courant, Pro, Patrimoine)
  const [order, setOrder] = useState([]);

  // Recalcule l'ordre dès que les comptes réels sont disponibles (au premier chargement, ils
  // peuvent arriver après le tout premier rendu) ou si le compte actif change depuis l'extérieur —
  // sans jamais planter si "accounts" est encore vide.
  useEffect(() => {
    if (accounts.length === 0) return;
    setOrder((prev) => {
      const keys = accounts.map((a) => a.key);
      const stillValid = prev.length === keys.length && prev.every((k) => keys.includes(k));
      if (stillValid) return prev[0] === active ? prev : [active, ...prev.filter((k) => k !== active)];
      return [active, ...keys.filter((k) => k !== active)];
    });
  }, [accounts, active]);

  if (order.length === 0) return <div style={{ height: CARD_HEIGHT }} />;

  return (
    <div style={{ position: "relative", height: CARD_HEIGHT + OFFSET * (accounts.length - 1) }}>
      {order.map((key, depth) => {
        const acc = accounts.find((a) => a.key === key);
        const isFront = depth === 0;
        const style = styleForAccountCard(acc, bankPresets, themeMode);
        return (
          <div
            key={key}
            ref={getRef ? getRef(key) : undefined}
            onClick={() => { if (!isFront) { setOrder((prev) => [key, ...prev.filter((k) => k !== key)]); onSelect(key); } }}
            style={{
              position: "absolute", left: 0, right: 0, top: (accounts.length - 1 - depth) * OFFSET, height: CARD_HEIGHT,
              borderRadius: "var(--radius-card)", overflow: "hidden",
              zIndex: accounts.length - depth,
              background: style.background,
              opacity: isFront ? 1 : 0.85,
              cursor: isFront ? "default" : "pointer",
              transition: `top 280ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 280ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
            }}
          >
            <CardFace
              style={style}
              name={acc.name}
              isFront={isFront}
              frontContent={
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ color: style.text, fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{balanceValue}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: variationDirection === "up" ? "var(--accent-amber)" : "var(--accent-red)", fontSize: 13, fontWeight: 600 }}>{variationText}</span>
                      <span style={{ color: style.textMuted, fontSize: 13 }}>{balanceLabel}</span>
                    </div>
                  </div>
                  {style.bankLabel && (
                    <span style={{ color: style.textMuted, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em" }}>{style.bankLabel}</span>
                  )}
                </>
              }
            />
          </div>
        );
      })}
    </div>
  );
}

// Carte compacte pour un livret (Livret A, Livret Jeune...) — même traitement de marque que la
// pile de comptes, en plus petit, sans variation ni bandeau banque (juste nom + solde), pour un
// affichage côte à côte dans la section Épargne.
export function SavingsCard({ name, balance, bankId, bankPresets, onClick }) {
  const style = styleForAccountCard({ key: name, bankId }, bankPresets, "dark");
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: "var(--radius-lg)", overflow: "hidden", background: style.background,
        padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between",
        height: 110, cursor: onClick ? "pointer" : "default",
      }}
    >
      <span style={{ color: style.text, fontSize: 14, fontWeight: 700 }}>{name}</span>
      <span style={{ color: style.text, fontSize: 20, fontWeight: 700 }}>{balance}</span>
    </div>
  );
}
