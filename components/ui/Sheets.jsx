import { X, ChevronRight, Check } from "lucide-react";

export function TopSheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--surface-scrim)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 50, paddingTop: 84, overflowY: "auto" }} onClick={onClose}>
      <div style={{ position: "relative", width: "100%", maxWidth: 420, padding: "0 20px" }} onClick={(e) => e.stopPropagation()}>
        <div className="topsheet-panel" style={{ background: "var(--surface-base)", borderRadius: "var(--radius-lg)", maxHeight: "75vh", overflowY: "auto", boxShadow: "var(--elev-overlay)" }}>
          <div style={{ textAlign: "center", padding: "16px 20px 12px", fontSize: 17, fontWeight: 600, borderBottom: "1px solid var(--separator)" }}>{title}</div>
          <div style={{ padding: "6px 20px 20px" }}>{children}</div>
        </div>
        <style jsx>{`
          @keyframes topSheetIn { from { opacity: 0; transform: scale(0.92) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          .topsheet-panel { animation: topSheetIn 0.2s cubic-bezier(0.32, 0.72, 0, 1); transform-origin: top right; }
        `}</style>
      </div>
    </div>
  );
}

export function Sheet({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--surface-scrim)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }} onClick={onClose}>
      <div style={{ position: "relative", width: "100%", maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: -18, left: 16, width: 36, height: 36, borderRadius: 18, background: "var(--surface-raised)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-primary)", cursor: "pointer", boxShadow: "var(--elev-raised)", zIndex: 2 }}>
          <X size={18} />
        </button>
        <div className="sheet-panel" style={{ background: "var(--surface-base)", borderRadius: "var(--radius-xl) var(--radius-xl) 0 0", maxHeight: "85vh", overflowY: "auto", paddingBottom: 24, boxShadow: "var(--elev-overlay)" }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, background: "var(--grey-2)", margin: "10px auto 4px" }} />
          <div style={{ textAlign: "center", padding: "10px 20px 16px", fontSize: 17, fontWeight: 600 }}>{title}</div>
          <div style={{ padding: "0 20px" }}>{children}</div>
        </div>
        <style jsx>{`
          @keyframes sheetIn { from { opacity: 0; transform: scale(0.85) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          .sheet-panel { animation: sheetIn 0.28s cubic-bezier(0.32, 0.72, 0, 1); transform-origin: top right; }
        `}</style>
      </div>
    </div>
  );
}

export function SheetRow({ label, value, onClick, last }) {
  return (
    <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", background: "transparent", border: "none", borderBottom: last ? "none" : "1px solid var(--separator)", cursor: "pointer", textAlign: "left" }}>
      <span style={{ fontSize: 15, color: "var(--text-primary)" }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text-tertiary)", fontSize: 15 }}>{value} <ChevronRight size={16} /></span>
    </button>
  );
}

export function OptionSheet({ title, options, value, onSelect, onClose }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--surface-scrim)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 60, paddingTop: 116, overflowY: "auto" }} onClick={onClose}>
      <div style={{ position: "relative", width: "100%", maxWidth: 420, padding: "0 20px" }} onClick={(e) => e.stopPropagation()}>
        <div className="topsheet-panel" style={{ background: "var(--surface-base)", borderRadius: "var(--radius-lg)", maxHeight: "65vh", overflowY: "auto", boxShadow: "var(--elev-overlay)" }}>
          <div style={{ textAlign: "center", padding: "16px 20px 12px", fontSize: 17, fontWeight: 600, borderBottom: "1px solid var(--separator)" }}>{title}</div>
          <div style={{ padding: "6px 20px 20px" }}>
            {options.map((o, i) => (
              <button key={o} onClick={() => onSelect(o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", background: "transparent", border: "none", borderBottom: i < options.length - 1 ? "1px solid var(--separator)" : "none", cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 15, color: "var(--text-primary)" }}>{o}</span>
                {o === value && <Check size={18} color="var(--green)" />}
              </button>
            ))}
          </div>
        </div>
        <style jsx>{`
          @keyframes topSheetIn { from { opacity: 0; transform: scale(0.92) translateY(-8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
          .topsheet-panel { animation: topSheetIn 0.2s cubic-bezier(0.32, 0.72, 0, 1); transform-origin: top right; }
        `}</style>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return <div style={{ marginBottom: 16 }}><div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 6 }}>{label}</div>{children}</div>;
}

export const fieldInputStyle = { width: "100%", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", border: "none", borderRadius: "var(--radius-control)", padding: "14px 16px", color: "var(--text-primary)", fontSize: 15, boxSizing: "border-box", fontFamily: "var(--font-core)" };
export const fieldPickerStyle = { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-inset)", boxShadow: "var(--elev-inset-sm)", border: "none", borderRadius: "var(--radius-control)", padding: "14px 16px", color: "var(--text-primary)", fontSize: 15, cursor: "pointer", boxSizing: "border-box", fontFamily: "var(--font-core)" };
