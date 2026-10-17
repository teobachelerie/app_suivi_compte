import { forwardRef } from "react";

// Bouton unique de l'app. Le style vit dans globals.css (.fin-btn) pour que le focus, l'appui et
// l'état désactivé soient identiques partout. `loading` garde la largeur du bouton et bloque les
// doubles envois.
export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", block = false, icon = false, loading = false, disabled, type = "button", className = "", children, ...rest },
  ref,
) {
  const classes = ["fin-btn", `fin-btn--${variant}`, size === "sm" ? "fin-btn--sm" : "", block ? "fin-btn--block" : "", icon ? "fin-btn--icon" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="fin-spinner" aria-hidden="true" style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid currentColor", borderTopColor: "transparent" }} /> : null}
      {children}
    </button>
  );
});
