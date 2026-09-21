import { useState, useEffect } from "react";

function CoachmarkCard({ title, text, stepLabel, isLast, onNext, onSkip }) {
  return (
    <div style={{ background: "var(--surface-raised)", boxShadow: "var(--elev-overlay), 0 4px 24px rgba(0,0,0,0.35)", borderRadius: "var(--radius-lg)", padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: 10, maxWidth: 420, margin: "0 auto" }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{stepLabel}</span>
      <span style={{ font: "600 17px var(--font-display)", color: "var(--text-primary)" }}>{title}</span>
      <span style={{ font: "400 14px/1.5 var(--font-core)", color: "var(--text-secondary)" }}>{text}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
        <button onClick={onSkip} style={{ background: "transparent", border: "none", color: "var(--text-tertiary)", fontSize: 14, fontWeight: 500, cursor: "pointer", padding: 0 }}>Passer tout</button>
        <div style={{ flex: 1 }} />
        <button onClick={onNext} style={{ background: "var(--accent-bg)", color: "var(--accent-text)", border: "none", borderRadius: "var(--radius-control)", padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{isLast ? "Terminer" : "Suivant"}</button>
      </div>
    </div>
  );
}

// Visite guidée façon "spotlight" : grise tout l'écran sauf l'élément réel visé (measureKey doit
// changer à chaque étape ET à chaque changement d'onglet, pour redéclencher la mesure une fois le
// bon écran effectivement affiché — un changement d'onglet demandé par le parent prend un rendu
// de plus à se répercuter dans le DOM).
export function Coachmark({ targetRef, title, text, stepLabel, isLast, onNext, onSkip, measureKey }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    let cancelled = false;
    function measure() {
      if (cancelled) return;
      const el = targetRef?.current;
      setRect(el ? el.getBoundingClientRect() : null);
    }
    measure();
    const id = setTimeout(measure, 80); // laisse le temps au DOM de se stabiliser après un changement d'onglet
    window.addEventListener("resize", measure);
    return () => { cancelled = true; clearTimeout(id); window.removeEventListener("resize", measure); };
  }, [measureKey, targetRef]);

  if (!rect) {
    // Cible introuvable (mesure pas encore prête, ou élément absent) : jamais bloquant, on affiche
    // simplement la carte au centre sans découpe plutôt que de figer la visite.
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.68)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={(e) => e.preventDefault()}>
        <CoachmarkCard title={title} text={text} stepLabel={stepLabel} isLast={isLast} onNext={onNext} onSkip={onSkip} />
      </div>
    );
  }

  const pad = 8;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const spaceBelow = viewportH - (rect.bottom + pad);
  const tooltipBelow = spaceBelow > 220;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 199, pointerEvents: "auto", background: "transparent" }} onClick={(e) => e.preventDefault()} />
      <div
        style={{
          position: "fixed",
          top: rect.top - pad, left: rect.left - pad,
          width: rect.width + pad * 2, height: rect.height + pad * 2,
          borderRadius: 16,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.68)",
          pointerEvents: "none",
          zIndex: 200,
        }}
      />
      <div style={{ position: "fixed", left: 16, right: 16, zIndex: 201, ...(tooltipBelow ? { top: rect.bottom + pad + 12 } : { top: Math.max(16, rect.top - pad - 12 - 160) }) }}>
        <CoachmarkCard title={title} text={text} stepLabel={stepLabel} isLast={isLast} onNext={onNext} onSkip={onSkip} />
      </div>
    </>
  );
}
