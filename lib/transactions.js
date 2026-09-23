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

// Valide TOUTES les lignes avant d'écrire quoi que ce soit — si une seule ligne est invalide, rien
// n'est importé, pour ne jamais laisser un import à moitié fait qu'il faudrait démêler à la main.
// Strict sur les noms de catégorie/compte : ils doivent déjà exister exactement (pas de création
// automatique), pour ne pas repeupler l'app de catégories mal orthographiées ou obsolètes.
export async function importTransactions(userId, rows) {
  const { data: categories, error: catErr } = await supabase.from("categories").select("id, name").eq("user_id", userId).eq("archived", false);
  if (catErr) throw new Error(catErr.message);
  const { data: accounts, error: accErr } = await supabase.from("accounts").select("id, name").eq("user_id", userId).eq("archived", false);
  if (accErr) throw new Error(accErr.message);
  // Comparaison insensible à la casse : une différence de casse entre le fichier et l'app ne doit
  // pas faire échouer l'import pour rien.
  const categoryIdByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
  const accountIdByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a.id]));
  const VALID_TYPES = ["Dépense", "Gain", "Virement"];

  const errors = [];
  const toInsert = [];
  rows.forEach((row, i) => {
    const line = i + 1;
    let ok = true;
    const fail = (msg) => { errors.push(`Ligne ${line} : ${msg}`); ok = false; };

    if (!row.title || typeof row.title !== "string") fail("titre manquant.");
    const amt = Number(String(row.amount).replace(",", "."));
    if (!amt || amt <= 0) fail(`montant invalide ("${row.amount}").`);
    if (!row.date || isNaN(Date.parse(row.date))) fail(`date invalide ("${row.date}").`);
    if (!VALID_TYPES.includes(row.type)) fail(`type "${row.type}" invalide (attendu Dépense, Gain ou Virement).`);

    let category_id = null;
    if (row.type !== "Virement") {
      category_id = categoryIdByName.get(String(row.category || "").toLowerCase()) || null;
      if (!category_id) fail(`catégorie "${row.category}" introuvable.`);
    }
    const account_id = accountIdByName.get(String(row.compte || "").toLowerCase()) || null;
    if (!account_id) fail(`compte "${row.compte}" introuvable.`);
    let to_account_id = null;
    if (row.type === "Virement" && row.compteDestination) {
      to_account_id = accountIdByName.get(row.compteDestination.toLowerCase()) || null;
      if (!to_account_id) fail(`compte cible "${row.compteDestination}" introuvable.`);
    }

    if (ok) {
      toInsert.push({
        user_id: userId, title: row.title, amount: amt, date: row.date, type: row.type,
        category_id, account_id, to_account_id,
        payment_method: row.payment || "Carte bancaire",
        tags: row.tags || [], splits: row.splits || null, emoji: row.emoji || null,
      });
    }
  });

  if (errors.length > 0) return { imported: 0, errors };

  // Un virement a besoin de la catégorie technique "Virement automatique" — un seul appel pour
  // tout le lot, pas un par ligne.
  if (toInsert.some((r) => r.type === "Virement")) {
    const virementCategoryId = await ensureCategory(userId, "Virement automatique");
    for (const r of toInsert) if (r.type === "Virement") r.category_id = virementCategoryId;
  }

  // Une seule requête d'insertion pour tout le lot, quel que soit le nombre de lignes — c'est ce
  // qui évite le dépassement de délai serveur qui se produisait avec un aller-retour par ligne.
  const { error: insErr } = await supabase.from("transactions").insert(toInsert);
  if (insErr) throw new Error(insErr.message);
  return { imported: toInsert.length, errors: [] };
}
