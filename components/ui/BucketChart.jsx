import { useRef } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Cell } from "recharts";
import { fmtEUR, fmtBucketLabel, tickInterval } from "../../lib/format";
import { haptic } from "../../lib/haptics";

// Histogramme par jour, mois ou année, sélectionnable au doigt. Recharts ne réagit qu'au toucher
// pile sur une barre (quelques pixels de large, rien du tout un jour sans dépense) : une couche
// transparente découpe la largeur en colonnes égales, alignées sur les bandes de l'axe X, et chaque
// colonne est touchable sur toute la hauteur. Glisser le doigt passe d'une colonne à l'autre ;
// toucher la colonne déjà choisie revient au total de la période.
export function BucketChart({ data, selectedKey, onSelect, color, height = 110 }) {
  const layerRef = useRef(null);
  const dragRef = useRef(null);

  function indexAt(clientX) {
    const rect = layerRef.current.getBoundingClientRect();
    const i = Math.floor(((clientX - rect.left) / rect.width) * data.length);
    return Math.min(data.length - 1, Math.max(0, i));
  }
  function select(i) {
    const bucket = data[i];
    if (!bucket || bucket.dateKey === dragRef.current?.current) return;
    dragRef.current.current = bucket.dateKey;
    haptic("light");
    onSelect(bucket);
  }

  function onPointerDown(e) {
    if (!data.length) return;
    const i = indexAt(e.clientX);
    dragRef.current = { startIndex: i, moved: false, wasSelected: data[i].dateKey === selectedKey, current: selectedKey };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (!dragRef.current.wasSelected) select(i);
  }
  function onPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    const i = indexAt(e.clientX);
    if (i !== d.startIndex) d.moved = true;
    select(i);
  }
  function onPointerUp() {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && !d.moved && d.wasSelected) { haptic("light"); onSelect(null); }
  }

  return (
    <div style={{ position: "relative", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fill: "var(--grey-4)", fontSize: 10 }} axisLine={false} tickLine={false} interval={tickInterval(data.length)} />
          <Bar dataKey="value" radius={[4, 4, 4, 4]} maxBarSize={18} isAnimationActive={false}>
            {data.map((b) => (
              <Cell key={b.dateKey} fill={color} fillOpacity={selectedKey && b.dateKey !== selectedKey ? 0.3 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div
        ref={layerRef}
        role="group"
        aria-label="Choisir une période dans le graphique"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { dragRef.current = null; }}
        style={{ position: "absolute", inset: 0, display: "flex", touchAction: "pan-y", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
      >
        {data.map((b) => (
          <button
            key={b.dateKey}
            type="button"
            tabIndex={0}
            aria-pressed={b.dateKey === selectedKey}
            aria-label={`${fmtBucketLabel(b.dateKey, b.granularity)} : ${fmtEUR(b.value)}`}
            // Clavier uniquement (detail = 0) : au doigt et à la souris, la couche gère déjà le geste.
            onClick={(e) => { if (e.detail === 0) onSelect(b.dateKey === selectedKey ? null : b); }}
            style={{ flex: 1, minWidth: 0, height: "100%", padding: 0, border: "none", background: b.dateKey === selectedKey ? "color-mix(in srgb, var(--text-primary) 6%, transparent)" : "transparent", borderRadius: 6, pointerEvents: "none" }}
          />
        ))}
      </div>
    </div>
  );
}
