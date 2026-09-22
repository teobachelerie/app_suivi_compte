import { supabase, toNumber, resolveId } from "./db";
import { todayInParis } from "./format";

const SUB_SELECT = "id, title, amount, payment_method, billing_day, active, last_generated_month, categories(name), accounts(name)";

function rowToSubscription(row) {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    category: row.categories?.name || "",
    compte: row.accounts?.name || "",
    payment: row.payment_method || "",
    billingDay: row.billing_day,
    active: row.active,
  };
}

export async function listSubscriptions(userId) {
  const { data, error } = await supabase.from("subscriptions").select(SUB_SELECT).eq("user_id", userId).order("billing_day", { ascending: true });
  if (error) throw new Error(error.message);
  return data.map(rowToSubscription);
}

export async function createSubscription(userId, s) {
  const category_id = await resolveId("categories", s.category, userId);
  const account_id = await resolveId("accounts", s.compte, userId);
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ user_id: userId, title: s.title, amount: toNumber(s.amount), category_id, account_id, payment_method: s.payment, billing_day: s.billingDay })
    .select(SUB_SELECT)
    .single();
  if (error) throw new Error(error.message);

  // Si le jour de prélèvement de CE mois-ci est déjà passé (ou tombe aujourd'hui), génère tout de
  // suite la dépense correspondante. Sans ça, il faudrait attendre le mois prochain : la tâche
  // planifiée quotidienne ne fait correspondre que le jour exact au moment où elle tourne, et cet
  // abonnement vient d'être créé après (ou le jour même) — elle ne le rattraperait jamais pour ce mois.
  const today = todayInParis();
  if (s.billingDay <= today.getDate()) {
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(s.billingDay).padStart(2, "0")}`;
    const { error: txErr } = await supabase.from("transactions").insert({
      title: s.title, amount: toNumber(s.amount), date: isoDate, type: "Dépense",
      category_id, account_id, payment_method: s.payment, user_id: userId, subscription_id: data.id,
    });
    if (txErr) throw new Error(txErr.message);
    const { error: updErr } = await supabase.from("subscriptions").update({ last_generated_month: month }).eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
  }

  return rowToSubscription(data);
}

export async function updateSubscription(userId, id, s) {
  const patch = {};
  if (s.title !== undefined) patch.title = s.title;
  if (s.amount !== undefined) patch.amount = toNumber(s.amount);
  if (s.payment !== undefined) patch.payment_method = s.payment;
  if (s.billingDay !== undefined) patch.billing_day = s.billingDay;
  if (s.active !== undefined) patch.active = s.active;
  if (s.category !== undefined) patch.category_id = await resolveId("categories", s.category, userId);
  if (s.compte !== undefined) patch.account_id = await resolveId("accounts", s.compte, userId);

  const { data, error } = await supabase.from("subscriptions").update(patch).eq("id", id).eq("user_id", userId).select(SUB_SELECT).single();
  if (error) throw new Error(error.message);
  return rowToSubscription(data);
}

export async function deleteSubscription(userId, id) {
  const { error } = await supabase.from("subscriptions").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}

// Appelée une fois par jour par la tâche planifiée (pages/api/cron/subscriptions.js), pour
// TOUS les utilisateurs à la fois — pas de userId ici, contrairement au reste du fichier.
// Idempotente : `last_generated_month` empêche de créer deux fois la même dépense du mois si
// la tâche est relancée ou a tourné en retard.
export async function generateDueSubscriptionTransactions(today) {
  const day = today.getDate();
  const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const { data: due, error } = await supabase
    .from("subscriptions")
    .select("id, user_id, title, amount, category_id, account_id, payment_method")
    .eq("active", true)
    .eq("billing_day", day)
    .or(`last_generated_month.is.null,last_generated_month.neq.${month}`);
  if (error) throw new Error(error.message);

  let created = 0;
  for (const sub of due) {
    const { error: insErr } = await supabase.from("transactions").insert({
      title: sub.title,
      amount: sub.amount,
      date: isoDate,
      type: "Dépense",
      category_id: sub.category_id,
      account_id: sub.account_id,
      payment_method: sub.payment_method,
      user_id: sub.user_id,
      subscription_id: sub.id,
    });
    if (insErr) throw new Error(insErr.message);
    const { error: updErr } = await supabase.from("subscriptions").update({ last_generated_month: month }).eq("id", sub.id);
    if (updErr) throw new Error(updErr.message);
    created += 1;
  }
  return created;
}
