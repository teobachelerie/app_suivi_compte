// Écran de chargement. Trois variantes à comparer :
//  - "skeleton" : blocs à la forme de l'Accueil qui pulsent doucement ;
//  - "shimmer"  : mêmes blocs, avec un reflet lumineux qui les traverse ;
//  - "logo"     : le logo Finelio qui respire, sans rien d'autre (sobre).
// `data` = true après connexion (on affiche la forme de l'Accueil), false pendant la vérification
// de la session : on ne sait alors pas encore si l'utilisateur est connecté, donc toujours le logo.
const CARD_H = 200;
const OFFSET = 56;

function SkeletonLayout({ animClass }) {
  const isPulse = animClass === "fin-skel-pulse";
  const block = (style) => <div className={`fin-skel-block ${animClass}`} style={style} />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {block({ width: 80, height: 14 })}
        {block({ width: 220, height: 30, borderRadius: 12 })}
      </div>

      {/* Pile de trois cartes, comme sur l'Accueil. En mode "pulse", c'est le bloc entier qui pulse
          (et non chaque carte, qui deviendrait transparente sur celles de derrière). */}
      <div className={isPulse ? "fin-skel-pulse" : ""} style={{ position: "relative", height: CARD_H + OFFSET * 2 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`fin-skel ${isPulse ? "" : animClass}`}
            style={{ position: "absolute", left: 0, right: 0, top: i * OFFSET, height: CARD_H, borderRadius: "var(--radius-card)", zIndex: i + 1, backgroundColor: i === 2 ? "var(--surface-1)" : "var(--surface-2)" }}
          />
        ))}
      </div>

      {block({ height: 46, borderRadius: 16 })}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
        {block({ height: 88, borderRadius: 20 })}
        {block({ height: 88, borderRadius: 20 })}
      </div>
      {block({ height: 96, borderRadius: 20 })}
    </div>
  );
}

export function LoadingScreen({ variant = "skeleton", data = true }) {
  const effective = data ? variant : "logo";
  return (
    <div role="status" aria-label="Chargement" style={{ position: "relative", minHeight: "100dvh", background: "var(--surface-base)" }}>
      <div className="fin-halo" />
      {effective === "logo" ? (
        <div style={{ position: "relative", zIndex: 1, minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img
            className="fin-logo-breathe"
            src="/icon-192.png"
            alt=""
            width={84}
            height={84}
            style={{ borderRadius: 22, boxShadow: "0 0 60px rgba(255,128,46,0.35)" }}
          />
        </div>
      ) : (
        <div style={{ position: "relative", zIndex: 1, maxWidth: 420, margin: "0 auto", padding: "calc(env(safe-area-inset-top, 0px) + 20px) var(--gutter-screen) 0" }}>
          <SkeletonLayout animClass={effective === "shimmer" ? "fin-skel-shimmer" : "fin-skel-pulse"} />
        </div>
      )}
    </div>
  );
}
