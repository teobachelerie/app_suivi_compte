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
};
const PATRIMOINE_STYLE = {
  background:
    "radial-gradient(circle at 15% 10%, rgba(255,128,46,0.55), transparent 45%), " +
    "radial-gradient(circle at 95% 30%, rgba(229,63,26,0.5), transparent 50%), " +
    "radial-gradient(circle at 55% 100%, rgba(99,25,10,0.7), transparent 55%), #000000",
  text: "#f6f5f2",
  textMuted: "rgba(246,245,242,0.55)",
  bankLabel: "FINELIO",
};
// Repli pour une banque non prévue par la maquette (n'importe quel autre préréglage choisi dans
// Réglages) : un dégradé simple à partir de sa couleur, texte clair par défaut — reste correct
// visuellement même si moins abouti que les deux traitements sur-mesure ci-dessus.
function fallbackStyle(bankPreset) {
  if (!bankPreset) return { background: "var(--surface-2)", text: "var(--text-primary)", textMuted: "var(--text-tertiary)", bankLabel: "" };
  return {
    background: `linear-gradient(120deg, ${bankPreset.primary} 0%, ${bankPreset.secondary} 100%)`,
    text: "#ffffff",
    textMuted: "rgba(255,255,255,0.6)",
    bankLabel: bankPreset.name.toUpperCase(),
  };
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
export function AccountCardStack({ accounts, active, onSelect, bankPresets, balanceLabel, balanceValue, variationDirection, variationText, getRef }) {
  // accounts: [{ key, name, bankId }] — 3 entrées exactement (Courant, Pro, Patrimoine)
  const [order, setOrder] = useState(() => {
    const front = accounts.find((a) => a.key === active) || accounts[0];
    return [front, ...accounts.filter((a) => a !== front)].map((a) => a.key);
  });

  // Si le compte actif change depuis l'extérieur (rare, mais pour rester cohérent), on le remet
  // devant sans perturber l'ordre relatif des deux autres.
  useEffect(() => {
    setOrder((prev) => (prev[0] === active ? prev : [active, ...prev.filter((k) => k !== active)]));
  }, [active]);

  function styleFor(acc) {
    if (acc.key === "patrimoine") return PATRIMOINE_STYLE;
    if (acc.bankId && CARD_STYLES[acc.bankId]) return CARD_STYLES[acc.bankId];
    return fallbackStyle(bankPresets.find((b) => b.id === acc.bankId));
  }

  return (
    <div style={{ position: "relative", height: CARD_HEIGHT + OFFSET * (accounts.length - 1) }}>
      {order.map((key, depth) => {
        const acc = accounts.find((a) => a.key === key);
        const isFront = depth === 0;
        const style = styleFor(acc);
        return (
          <div
            key={key}
            ref={getRef ? getRef(key) : undefined}
            onClick={() => { if (!isFront) { setOrder((prev) => [key, ...prev.filter((k) => k !== key)]); onSelect(key); } }}
            style={{
              position: "absolute", left: 0, right: 0, top: depth * OFFSET, height: CARD_HEIGHT,
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
