import { supabase } from "./db";
import { getUserPlan } from "./billing";
import { DEFAULT_PAYMENTS } from "./constants";

export async function getSchema(userId) {
  const [{ data: categories, error: catErr }, { data: accounts, error: accErr }] = await Promise.all([
    supabase.from("categories").select("id, name, color").eq("archived", false).eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("accounts").select("id, name, bank_id").eq("archived", false).eq("user_id", userId).order("created_at", { ascending: true }),
  ]);
  if (catErr) throw new Error(catErr.message);
  if (accErr) throw new Error(accErr.message);
  return {
    categories, accounts, payments: DEFAULT_PAYMENTS,
    // Versions "texte simple" pour le Raccourci iOS : une chaîne unique, noms séparés par des
    // virgules, à découper avec le bloc "Découper le texte" — plus fiable dans l'éditeur Raccourcis
    // que d'extraire une clé sur chaque élément d'une liste de dictionnaires.
    categoryNames: categories.map((c) => c.name).join(","),
    accountNames: accounts.map((a) => a.name).join(","),
    paymentNames: DEFAULT_PAYMENTS.join(","),
  };
}

// `options`: tableau de { id?, name } représentant l'état final voulu pour "categories" ou
// "accounts" de CET utilisateur (propertyName: "Category" ou "Compte", pour rester compatible
// avec l'appel existant côté front). Un id transmis renomme la ligne en place (donc les
// transactions déjà liées affichent le nouveau nom automatiquement, via la jointure). Sans id,
// une nouvelle ligne est créée. Une ligne existante absente du tableau est archivée (pas
// supprimée) : elle disparaît des choix futurs, mais les transactions qui la référencent encore
// l'affichent normalement.
export async function updateSelectOptions(userId, propertyName, options) {
  const table = propertyName === "Category" ? "categories" : "accounts";

  const { data: current, error: readErr } = await supabase.from(table).select("id").eq("archived", false).eq("user_id", userId);
  if (readErr) throw new Error(readErr.message);

  const keptIds = new Set(options.filter((o) => o.id).map((o) => o.id));
  const toArchive = current.filter((row) => !keptIds.has(row.id)).map((row) => row.id);
  const toRename = options.filter((o) => o.id);
  const toCreate = options.filter((o) => !o.id);

  if (table === "accounts" && toCreate.length) {
    const plan = await getUserPlan(userId);
    const futureTotal = current.length - toArchive.length + toCreate.length;
    if (plan.limits.accounts !== null && futureTotal > plan.limits.accounts) {
      throw new Error(`Palier ${plan.limits.label} : ${plan.limits.accounts} compte(s) maximum. Passe à un palier supérieur pour en ajouter davantage.`);
    }
  }

  if (toArchive.length) {
    const { error } = await supabase.from(table).update({ archived: true }).in("id", toArchive).eq("user_id", userId);
    if (error) throw new Error(error.message);
  }
  for (const o of toRename) {
    // .eq("user_id", userId) empêche de renommer la ligne d'un autre utilisateur en devinant son id.
    const { error } = await supabase.from(table).update({ name: o.name }).eq("id", o.id).eq("user_id", userId);
    if (error) throw new Error(error.message);
  }
  if (toCreate.length) {
    const { error } = await supabase.from(table).insert(toCreate.map((o) => ({ name: o.name, user_id: userId })));
    if (error) throw new Error(error.message);
  }
  return true;
}

export async function updateCategoryColor(userId, id, color) {
  const plan = await getUserPlan(userId);
  if (!plan.limits.customColors) throw new Error(`Palier ${plan.limits.label} : les couleurs personnalisées ne sont pas incluses. Passe à un palier supérieur pour en profiter.`);
  const { error } = await supabase.from("categories").update({ color }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}

export async function updateAccountBank(userId, id, bankId) {
  const { error } = await supabase.from("accounts").update({ bank_id: bankId }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}
