import { createClient } from "@supabase/supabase-js";

// Clé "service role" : accès complet, utilisée UNIQUEMENT ici, côté serveur (routes pages/api/*).
// Ne jamais importer ce fichier depuis un composant React ou l'exposer au navigateur.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DEFAULT_PAYMENTS = ["Carte bancaire", "Virement", "Liquide"];

function toNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(",", "."));
  return Number(v);
}

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
    payment: row.payment_method || "",
  };
}

async function resolveId(table, name, { required } = { required: true }) {
  if (!name) return null;
  const { data, error } = await supabase.from(table).select("id").eq("name", name).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data && required) throw new Error(`"${name}" introuvable dans ${table} — as-tu bien migré ce ${table === "categories" ? "catégorie" : "compte"} ?`);
  return data?.id ?? null;
}

const SELECT_WITH_JOINS = "id, title, amount, date, type, payment_method, categories(name), accounts(name)";

export async function queryTransactions() {
  const { data, error } = await supabase.from("transactions").select(SELECT_WITH_JOINS).order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map(rowToTransaction);
}

export async function createTransaction(t) {
  const category_id = await resolveId("categories", t.category);
  const account_id = await resolveId("accounts", t.compte);
  const { data, error } = await supabase
    .from("transactions")
    .insert({ title: t.title, amount: toNumber(t.amount), date: t.date, type: t.type, category_id, account_id, payment_method: t.payment })
    .select(SELECT_WITH_JOINS)
    .single();
  if (error) throw new Error(error.message);
  return rowToTransaction(data);
}

export async function updateTransaction(id, t) {
  const patch = {};
  if (t.title !== undefined) patch.title = t.title;
  if (t.amount !== undefined) patch.amount = toNumber(t.amount);
  if (t.date !== undefined) patch.date = t.date;
  if (t.type !== undefined) patch.type = t.type;
  if (t.payment !== undefined) patch.payment_method = t.payment;
  if (t.category !== undefined) patch.category_id = await resolveId("categories", t.category);
  if (t.compte !== undefined) patch.account_id = await resolveId("accounts", t.compte);

  const { data, error } = await supabase.from("transactions").update(patch).eq("id", id).select(SELECT_WITH_JOINS).single();
  if (error) throw new Error(error.message);
  return rowToTransaction(data);
}

export async function deleteTransaction(id) {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return true;
}

export async function getSchema() {
  const [{ data: categories, error: catErr }, { data: accounts, error: accErr }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("archived", false).order("created_at", { ascending: true }),
    supabase.from("accounts").select("id, name").eq("archived", false).order("created_at", { ascending: true }),
  ]);
  if (catErr) throw new Error(catErr.message);
  if (accErr) throw new Error(accErr.message);
  return { categories, accounts, payments: DEFAULT_PAYMENTS };
}

// `options`: tableau de { id?, name } représentant l'état final voulu pour "categories" ou
// "accounts" (propertyName: "Category" ou "Compte", pour rester compatible avec l'appel
// existant côté front). Un id transmis renomme la ligne en place (donc les transactions déjà
// liées affichent le nouveau nom automatiquement, via la jointure). Sans id, une nouvelle
// ligne est créée. Une ligne existante absente du tableau est archivée (pas supprimée) : elle
// disparaît des choix futurs, mais les transactions qui la référencent encore l'affichent
// normalement.
export async function updateSelectOptions(propertyName, options) {
  const table = propertyName === "Category" ? "categories" : "accounts";

  const { data: current, error: readErr } = await supabase.from(table).select("id").eq("archived", false);
  if (readErr) throw new Error(readErr.message);

  const keptIds = new Set(options.filter((o) => o.id).map((o) => o.id));
  const toArchive = current.filter((row) => !keptIds.has(row.id)).map((row) => row.id);
  const toRename = options.filter((o) => o.id);
  const toCreate = options.filter((o) => !o.id);

  if (toArchive.length) {
    const { error } = await supabase.from(table).update({ archived: true }).in("id", toArchive);
    if (error) throw new Error(error.message);
  }
  for (const o of toRename) {
    const { error } = await supabase.from(table).update({ name: o.name }).eq("id", o.id);
    if (error) throw new Error(error.message);
  }
  if (toCreate.length) {
    const { error } = await supabase.from(table).insert(toCreate.map((o) => ({ name: o.name })));
    if (error) throw new Error(error.message);
  }
  return true;
}
