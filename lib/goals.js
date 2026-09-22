import { supabase, toNumber, resolveId } from "./db";
import { getUserPlan } from "./billing";

const GOAL_SELECT = "id, title, target_amount, target_date, accounts(name)";

function rowToGoal(row) {
  return { id: row.id, title: row.title, targetAmount: Number(row.target_amount), targetDate: row.target_date, compte: row.accounts?.name || "" };
}

export async function listGoals(userId) {
  const { data, error } = await supabase.from("goals").select(GOAL_SELECT).eq("user_id", userId).order("target_date", { ascending: true });
  if (error) throw new Error(error.message);
  return data.map(rowToGoal);
}

export async function createGoal(userId, g) {
  const plan = await getUserPlan(userId);
  if (plan.limits.goals !== null) {
    const { count, error: countErr } = await supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", userId);
    if (countErr) throw new Error(countErr.message);
    if (count >= plan.limits.goals) {
      throw new Error(`Palier ${plan.limits.label} : ${plan.limits.goals} objectif(s) maximum. Passe à un palier supérieur pour en ajouter davantage.`);
    }
  }
  const account_id = await resolveId("accounts", g.compte, userId);
  const { data, error } = await supabase
    .from("goals")
    .insert({ user_id: userId, title: g.title, target_amount: toNumber(g.targetAmount), target_date: g.targetDate, account_id })
    .select(GOAL_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return rowToGoal(data);
}

export async function updateGoal(userId, id, g) {
  const patch = {};
  if (g.title !== undefined) patch.title = g.title;
  if (g.targetAmount !== undefined) patch.target_amount = toNumber(g.targetAmount);
  if (g.targetDate !== undefined) patch.target_date = g.targetDate;
  if (g.compte !== undefined) patch.account_id = await resolveId("accounts", g.compte, userId);

  const { data, error } = await supabase.from("goals").update(patch).eq("id", id).eq("user_id", userId).select(GOAL_SELECT).single();
  if (error) throw new Error(error.message);
  return rowToGoal(data);
}

export async function deleteGoal(userId, id) {
  const { error } = await supabase.from("goals").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}
