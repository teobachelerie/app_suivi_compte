// Puce sélectionnable (période, filtre). Active = orange, texte --accent-text.
export function Chip({ selected = false, onClick, children, ...rest }) {
  return (
    <button type="button" className="fin-chip" aria-pressed={selected} onClick={onClick} {...rest}>
      {children}
    </button>
  );
}
