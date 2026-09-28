import { supabase, toNumber, resolveId } from "./db";

const BUDGET_SELECT = "id, monthly_limit, categories(name)";

function rowToBudget(row) {
  return { id: row.id, category: row.categories?.name || "", monthlyLimit: Number(row.monthly_limit) };
}

export async function listBudgets(userId) {
  const { data, error } = await supabase.from("category_budgets").select(BUDGET_SELECT).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data.map(rowToBudget).sort((a, b) => a.category.localeCompare(b.category, "fr"));
}

// Crée le plafond d'une catégorie, ou met à jour son montant s'il existe déjà.
export async function upsertBudget(userId, b) {
  const monthlyLimit = toNumber(b.monthlyLimit);
  if (!(monthlyLimit > 0)) throw new Error("Le plafond doit être un montant supérieur à zéro.");
  const category_id = await resolveId("categories", b.category, userId);
  const { data, error } = await supabase
    .from("category_budgets")
    .upsert({ user_id: userId, category_id, monthly_limit: monthlyLimit }, { onConflict: "user_id,category_id" })
    .select(BUDGET_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return rowToBudget(data);
}

export async function deleteBudget(userId, id) {
  const { error } = await supabase.from("category_budgets").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}
