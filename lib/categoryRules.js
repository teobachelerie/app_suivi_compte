import { supabase, resolveId } from "./db";
import { getUserPlan } from "./billing";

const RULE_SELECT = "id, keyword, categories(name)";

function rowToRule(row) {
  return { id: row.id, keyword: row.keyword, category: row.categories?.name || "" };
}

export async function listCategoryRules(userId) {
  const { data, error } = await supabase.from("category_rules").select(RULE_SELECT).eq("user_id", userId).order("keyword", { ascending: true });
  if (error) throw new Error(error.message);
  return data.map(rowToRule);
}

export async function createCategoryRule(userId, r) {
  const plan = await getUserPlan(userId);
  if (!plan.limits.autoRules) throw new Error(`Palier ${plan.limits.label} : les règles de catégorisation automatique ne sont pas incluses. Passe à un palier supérieur pour en profiter.`);
  const category_id = await resolveId("categories", r.category, userId);
  const { data, error } = await supabase.from("category_rules").insert({ user_id: userId, keyword: r.keyword, category_id }).select(RULE_SELECT).single();
  if (error) throw new Error(error.message);
  return rowToRule(data);
}

export async function deleteCategoryRule(userId, id) {
  const { error } = await supabase.from("category_rules").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}
