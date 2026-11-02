// Chargement en plein écran (connexion) : fond flouté, un point au dégradé signature tourne sur une
// piste en pointillés autour d'un « € » en Inter Black. N'apparaît qu'après 250 ms (voir CSS) : une
// connexion rapide ne fait rien clignoter.
export function LoadingOrbit({ label = "Connexion…" }) {
  return (
    <div className="fin-orbit" role="status" aria-live="polite">
      <div className="fin-orbit__ring">
        <svg viewBox="0 0 100 100" width="104" height="104" aria-hidden="true">
          <defs>
            <linearGradient id="fin-orbit-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#EE7B26" />
              <stop offset="1" stopColor="#B8541F" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-token)" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" />
          <g className="fin-orbit__spin">
            <path d="M50 10 A40 40 0 0 1 84.6 30" fill="none" stroke="url(#fin-orbit-grad)" strokeWidth="3" strokeLinecap="round" />
            <circle cx="84.6" cy="30" r="5" fill="url(#fin-orbit-grad)" />
          </g>
        </svg>
        <span className="fin-orbit__euro" aria-hidden="true">€</span>
      </div>
      <span className="fin-sub-serif" style={{ fontSize: 19 }}>{label}</span>
    </div>
  );
}
