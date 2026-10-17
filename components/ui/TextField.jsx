import { forwardRef, useId } from "react";

// Champ texte unique : étiquette liée à l'input (clic sur l'étiquette = focus), aide, erreur
// annoncée aux lecteurs d'écran, suffixe (ex. « € »). Taille de police de 16 px : voir globals.css.
export const TextField = forwardRef(function TextField({ label, help, error, suffix, id, className = "", ...rest }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  const describedBy = [error ? `${inputId}-error` : null, help ? `${inputId}-help` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div style={{ marginBottom: "var(--space-4)" }}>
      {label ? <label className="fin-label" htmlFor={inputId}>{label}</label> : null}
      <div className="fin-input-wrap">
        <input
          ref={ref}
          id={inputId}
          className={`fin-input ${suffix ? "fin-input--suffixed" : ""} ${className}`.trim()}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
        {suffix ? <span className="fin-input-suffix" aria-hidden="true">{suffix}</span> : null}
      </div>
      {error ? <div id={`${inputId}-error`} className="fin-error" role="alert">{error}</div> : null}
      {help ? <div id={`${inputId}-help`} className="fin-help">{help}</div> : null}
    </div>
  );
});
