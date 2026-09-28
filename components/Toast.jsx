import { useEffect } from "react";

// Notification discrète en bas d'écran, au-dessus de la barre de menu : jamais au milieu, jamais
// bloquante. `toast` = { id, message, actionLabel?, onAction?, onExpire?, duration? }.
export function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => { toast.onExpire?.(); onDismiss(toast.id); }, toast.duration ?? 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);

  if (!toast) return null;
  return (
    <div
      key={toast.id}
      role="status"
      style={{
        position: "fixed", left: "50%", bottom: 116, zIndex: 40, transform: "translateX(-50%)",
        width: "min(360px, calc(100% - 32px))", boxSizing: "border-box",
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
        borderRadius: "var(--radius-round)", background: "var(--surface-highlight)",
        border: "1px solid var(--border-token)", boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
        animation: "fin-toast-in 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      }}
    >
      <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: "var(--text-primary)" }}>{toast.message}</span>
      {toast.actionLabel && (
        <button
          onClick={() => { toast.onAction?.(); onDismiss(toast.id); }}
          style={{ background: "none", border: "none", padding: "4px 2px", fontSize: 14, fontWeight: 700, color: "var(--accent-orange)", cursor: "pointer" }}
        >
          {toast.actionLabel}
        </button>
      )}
    </div>
  );
}
