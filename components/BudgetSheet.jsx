import { useState } from "react";
import { Trash2 } from "lucide-react";
import { BottomSheet } from "./ui/BottomSheet";
import { Button } from "./ui/Button";
import { TextField } from "./ui/TextField";
import { PickerField } from "./ui/PickerField";

// Feuille de création / modification d'un plafond mensuel. `budget` = plafond existant (la
// catégorie est alors figée, seul le montant change) ou null pour un nouveau plafond, auquel cas
// seules les familles qui n'en ont pas encore (`availableFamilies`, { value, icon }) sont proposées.
export function BudgetSheet({ budget, availableFamilies, onClose, onSave, onDelete, saving }) {
  const [category, setCategory] = useState(budget?.category || availableFamilies[0]?.value || "");
  const [limit, setLimit] = useState(budget ? String(budget.monthlyLimit) : "");
  const [errors, setErrors] = useState({});
  const nothingToAdd = !budget && availableFamilies.length === 0;

  function handleSave() {
    const amount = parseFloat(String(limit).replace(",", "."));
    const next = {};
    if (!category) next.category = "Choisis une catégorie.";
    if (!(amount > 0)) next.limit = "Indique un plafond supérieur à zéro.";
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave({ category, monthlyLimit: amount });
  }

  return (
    <BottomSheet
      title={budget ? "Modifier le plafond" : "Nouveau plafond"}
      onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          {onDelete && (
            <Button variant="danger" icon onClick={onDelete} disabled={saving} aria-label="Supprimer le plafond">
              <Trash2 size={20} aria-hidden="true" />
            </Button>
          )}
          <Button block loading={saving} disabled={nothingToAdd} onClick={handleSave}>
            {saving ? "Enregistrement…" : "Confirmer"}
          </Button>
        </div>
      }
    >
      {nothingToAdd ? (
        <div style={{ fontSize: 14, color: "var(--text-tertiary)", padding: "var(--space-2) 0" }}>Toutes tes catégories ont déjà un plafond.</div>
      ) : (
        <>
          {budget ? (
            <TextField label="Catégorie" value={budget.category} readOnly />
          ) : (
            <PickerField label="Catégorie" title="Catégorie" value={category} options={availableFamilies} onChange={setCategory} error={errors.category} />
          )}
          <TextField
            label="Plafond par mois"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            inputMode="decimal"
            placeholder="ex. 300"
            suffix="€"
            error={errors.limit}
            help="Compte toutes les dépenses de la famille (sous-catégories comprises), sur tous tes comptes, pour le mois en cours."
          />
        </>
      )}
    </BottomSheet>
  );
}
