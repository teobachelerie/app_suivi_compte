import { supabase, toNumber, resolveId, ensureCategory } from "./db";

// Aplati une ligne Supabase (avec ses jointures) vers la même forme que le reste de l'app
// attend déjà — c'est ce qui permet à pages/index.js de ne rien changer.
function rowToTransaction(row) {
  return {
    id: row.id,
    title: row.title,
    amount: Number(row.amount),
    date: row.date,
    category: row.categories?.name || "",
    type: row.type,
    compte: row.accounts?.name || "",
    compteDestination: row.to_account?.name || null,
    payment: row.payment_method || "",
    tags: row.tags || [],
    splits: row.splits || null,
    emoji: row.emoji || null,
  };
}

const SELECT_WITH_JOINS = "id, title, amount, date, type, payment_method, tags, splits, emoji, categories(name), accounts!account_id(name), to_account:accounts!to_account_id(name)";

export async function queryTransactions(userId) {
  const { data, error } = await supabase.from("transactions").select(SELECT_WITH_JOINS).eq("user_id", userId).order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map(rowToTransaction);
}

export async function createTransaction(userId, t) {
  const category_id = t.type === "Virement" ? await ensureCategory(userId, "Virement automatique") : await resolveId("categories", t.category, userId);
  const account_id = await resolveId("accounts", t.compte, userId);
  const to_account_id = t.compteDestination ? await resolveId("accounts", t.compteDestination, userId) : null;
  const { data, error } = await supabase
    .from("transactions")
    .insert({ title: t.title, amount: toNumber(t.amount), date: t.date, type: t.type, category_id, account_id, to_account_id, payment_method: t.payment, user_id: userId, tags: t.tags || [], splits: t.splits || null, emoji: t.emoji || null })
    .select(SELECT_WITH_JOINS)
    .single();
  if (error) throw new Error(error.message);
  return rowToTransaction(data);
}

export async function updateTransaction(userId, id, t) {
  const patch = {};
  if (t.title !== undefined) patch.title = t.title;
  if (t.amount !== undefined) patch.amount = toNumber(t.amount);
  if (t.date !== undefined) patch.date = t.date;
  if (t.type !== undefined) patch.type = t.type;
  if (t.payment !== undefined) patch.payment_method = t.payment;
  if (t.category !== undefined) patch.category_id = t.type === "Virement" ? await ensureCategory(userId, "Virement automatique") : await resolveId("categories", t.category, userId);
  if (t.compte !== undefined) patch.account_id = await resolveId("accounts", t.compte, userId);
  if (t.compteDestination !== undefined) patch.to_account_id = t.compteDestination ? await resolveId("accounts", t.compteDestination, userId) : null;
  if (t.tags !== undefined) patch.tags = t.tags;
  if (t.splits !== undefined) patch.splits = t.splits;
  if (t.emoji !== undefined) patch.emoji = t.emoji;

  // .eq("user_id", userId) ici n'est pas qu'un filtre : c'est ce qui empêche un utilisateur de
  // modifier la transaction d'un autre en devinant/rejouant un id.
  const { data, error } = await supabase.from("transactions").update(patch).eq("id", id).eq("user_id", userId).select(SELECT_WITH_JOINS).single();
  if (error) throw new Error(error.message);
  return rowToTransaction(data);
}

export async function deleteTransaction(userId, id) {
  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}
