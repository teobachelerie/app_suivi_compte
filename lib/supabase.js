import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// Clé "service role" : accès complet, utilisée UNIQUEMENT ici, côté serveur (routes pages/api/*).
// Ne jamais importer ce fichier depuis un composant React ou l'exposer au navigateur.
//
// Important : la clé service role CONTOURNE totalement les policies RLS de Supabase. Ça veut
// dire que la sécurité multi-utilisateur de cette app ne repose PAS sur RLS (qui n'existe qu'en
// filet de sécurité pour un futur accès direct côté client), mais sur le fait que CHAQUE fonction
// ci-dessous filtre explicitement par `userId` — y compris sur les updates/deletes, pour qu'un
// utilisateur ne puisse jamais modifier ou lire les données d'un autre en devinant un id.
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const DEFAULT_PAYMENTS = ["Carte bancaire", "Virement", "Liquide"];

function toNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(",", "."));
  return Number(v);
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Génère une clé d'API pour `userId` (utilisée par les Raccourcis iOS, qui ne peuvent pas faire
// de connexion par mot de passe). Le token brut n'est renvoyé qu'ici, à la création — il n'est
// jamais récupérable ensuite, seule son empreinte est stockée.
export async function createApiKey(userId, label) {
  const raw = "eak_" + crypto.randomBytes(24).toString("base64url");
  const { error } = await supabase.from("api_keys").insert({ user_id: userId, label: label || null, token_hash: hashToken(raw) });
  if (error) throw new Error(error.message);
  return raw;
}

export async function listApiKeys(userId) {
  const { data, error } = await supabase.from("api_keys").select("id, label, created_at, last_used_at").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteApiKey(userId, id) {
  const { error } = await supabase.from("api_keys").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}

// Vérifie soit un jeton de session (Authorization: Bearer <token>, utilisé par l'app web),
// soit une clé d'API (en-tête X-Api-Key, utilisée par les Raccourcis iOS). Retourne l'id de
// l'utilisateur authentifié, ou null si aucun des deux n'est valide.
//
// Le jeton Bearer est vérifié LOCALEMENT (signature HS256 avec SUPABASE_JWT_SECRET), pas via un
// appel réseau à Supabase Auth — chaque requête gagne l'aller-retour réseau qu'elle payait avant.
// Si la variable n'est pas configurée, on retombe sur l'ancienne vérification réseau (plus lente
// mais toujours correcte) pour ne rien casser tant qu'elle n'a pas été ajoutée sur Vercel.
export async function getUserId(req) {
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (bearerToken) {
    if (process.env.SUPABASE_JWT_SECRET) {
      try {
        const payload = jwt.verify(bearerToken, process.env.SUPABASE_JWT_SECRET, { algorithms: ["HS256"] });
        if (payload?.sub) return payload.sub;
      } catch (e) {
        // Jeton invalide ou expiré : pas authentifié, on continue vers la clé API ci-dessous.
      }
    } else {
      const { data, error } = await supabase.auth.getUser(bearerToken);
      if (!error && data.user) return data.user.id;
    }
  }

  const apiKey = req.headers["x-api-key"];
  if (apiKey) {
    const { data } = await supabase.from("api_keys").select("id, user_id").eq("token_hash", hashToken(apiKey)).maybeSingle();
    if (data) {
      supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});
      return data.user_id;
    }
  }

  return null;
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
    tags: row.tags || [],
    splits: row.splits || null,
    emoji: row.emoji || null,
  };
}

async function resolveId(table, name, userId, { required } = { required: true }) {
  if (!name) return null;
  // ilike (sans jokers % / _) = comparaison insensible à la casse, exacte sinon — évite
  // qu'un écart de casse (renommage, cache local, etc.) fasse échouer la résolution.
  // Les caractères % et _ du nom lui-même sont échappés pour ne pas être pris pour des jokers.
  const escaped = name.replace(/[%_\\]/g, (c) => `\\${c}`);
  const { data, error } = await supabase.from(table).select("id").ilike("name", escaped).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data && required) throw new Error(`"${name}" introuvable dans ${table} pour cet utilisateur.`);
  return data?.id ?? null;
}

const SELECT_WITH_JOINS = "id, title, amount, date, type, payment_method, tags, splits, emoji, categories(name), accounts(name)";

export async function queryTransactions(userId) {
  const { data, error } = await supabase.from("transactions").select(SELECT_WITH_JOINS).eq("user_id", userId).order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map(rowToTransaction);
}

export async function createTransaction(userId, t) {
  const category_id = await resolveId("categories", t.category, userId);
  const account_id = await resolveId("accounts", t.compte, userId);
  const { data, error } = await supabase
    .from("transactions")
    .insert({ title: t.title, amount: toNumber(t.amount), date: t.date, type: t.type, category_id, account_id, payment_method: t.payment, user_id: userId, tags: t.tags || [], splits: t.splits || null, emoji: t.emoji || null })
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
  if (t.category !== undefined) patch.category_id = await resolveId("categories", t.category, userId);
  if (t.compte !== undefined) patch.account_id = await resolveId("accounts", t.compte, userId);
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

export async function getSchema(userId) {
  const [{ data: categories, error: catErr }, { data: accounts, error: accErr }] = await Promise.all([
    supabase.from("categories").select("id, name, color").eq("archived", false).eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("accounts").select("id, name").eq("archived", false).eq("user_id", userId).order("created_at", { ascending: true }),
  ]);
  if (catErr) throw new Error(catErr.message);
  if (accErr) throw new Error(accErr.message);
  return { categories, accounts, payments: DEFAULT_PAYMENTS };
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
  const { error } = await supabase.from("categories").update({ color }).eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}

/* ============ Abonnements récurrents ============ */

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

/* ============ Objectifs d'épargne ============ */

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

/* ============ Règles de catégorisation automatique ============ */

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
