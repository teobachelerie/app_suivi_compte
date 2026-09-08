// Migration ponctuelle : recopie toutes les transactions de Notion vers Supabase.
// À exécuter UNE SEULE FOIS, en local, sur ta machine — jamais dans le navigateur ni envoyé à qui que ce soit.
//
// Utilisation :
//   1. Crée un fichier .env.migration (à la racine du projet, à côté de package.json) avec ces 4 lignes :
//        NOTION_TOKEN=ton_token_notion
//        NOTION_DATABASE_ID=ton_id_de_base_notion
//        SUPABASE_URL=ton_url_supabase
//        SUPABASE_SERVICE_ROLE_KEY=ta_cle_service_role
//   2. Lance : node --env-file=.env.migration scripts/migrate-notion-to-supabase.mjs
//      (si ton Node est trop ancien pour --env-file, voir la note en bas du README de ce script)
//   3. Supprime .env.migration une fois la migration terminée (il contient des secrets).
//
// Le script est protégé contre les doublons : si des transactions existent déjà dans Supabase,
// il s'arrête sans rien faire, sauf si tu ajoutes FORCE=1 devant la commande.

import { createClient } from "@supabase/supabase-js";

const NOTION_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Variable d'environnement manquante : ${name}`);
    console.error("Vérifie ton fichier .env.migration et relance avec : node --env-file=.env.migration scripts/migrate-notion-to-supabase.mjs");
    process.exit(1);
  }
  return v;
}

const NOTION_TOKEN = requireEnv("NOTION_TOKEN");
const NOTION_DATABASE_ID = requireEnv("NOTION_DATABASE_ID");
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function notionHeaders() {
  return {
    Authorization: `Bearer ${NOTION_TOKEN}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

function toNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(",", "."));
  return Number(v);
}

function pageToTransaction(page) {
  const p = page.properties;
  return {
    title: p.Name?.title?.[0]?.plain_text || "",
    amount: toNumber(p.Amount?.number ?? 0),
    date: p.Date?.date?.start || "",
    category: p.Category?.select?.name || "",
    type: p.Type?.select?.name || "Dépense",
    compte: p.Compte?.select?.name || "",
    payment: p["Payment Method"]?.select?.name || "",
  };
}

async function fetchAllNotionTransactions() {
  let results = [];
  let cursor;
  do {
    const res = await fetch(`${NOTION_BASE}/databases/${NOTION_DATABASE_ID}/query`, {
      method: "POST",
      headers: notionHeaders(),
      body: JSON.stringify({ start_cursor: cursor, page_size: 100, sorts: [{ property: "Date", direction: "ascending" }] }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Erreur Notion : ${data.message || res.statusText}`);
    results = results.concat(data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results.map(pageToTransaction).filter((t) => t.title && t.date);
}

async function ensureLookup(table, names) {
  const unique = [...new Set(names.filter(Boolean))];
  const { data: existing, error: readErr } = await supabase.from(table).select("id, name");
  if (readErr) throw new Error(readErr.message);
  const byName = new Map(existing.map((r) => [r.name, r.id]));
  const missing = unique.filter((n) => !byName.has(n));
  if (missing.length) {
    console.log(`Ajout de ${missing.length} entrée(s) manquante(s) dans "${table}" : ${missing.join(", ")}`);
    const { data: inserted, error: insErr } = await supabase.from(table).insert(missing.map((name) => ({ name }))).select("id, name");
    if (insErr) throw new Error(insErr.message);
    inserted.forEach((r) => byName.set(r.name, r.id));
  }
  return byName;
}

async function main() {
  console.log("Lecture des transactions Notion…");
  const transactions = await fetchAllNotionTransactions();
  console.log(`${transactions.length} transaction(s) trouvée(s) dans Notion.`);
  if (transactions.length === 0) {
    console.log("Rien à migrer.");
    return;
  }

  const { count, error: countErr } = await supabase.from("transactions").select("id", { count: "exact", head: true });
  if (countErr) throw new Error(countErr.message);
  if (count > 0 && process.env.FORCE !== "1") {
    console.error(`Supabase contient déjà ${count} transaction(s). Migration annulée pour éviter les doublons.`);
    console.error("Si tu es sûr de vouloir continuer quand même, relance avec FORCE=1 devant la commande.");
    process.exit(1);
  }

  console.log("Vérification des catégories et comptes…");
  const categoryIds = await ensureLookup("categories", transactions.map((t) => t.category));
  const accountIds = await ensureLookup("accounts", transactions.map((t) => t.compte));

  console.log("Insertion des transactions dans Supabase…");
  const rows = transactions.map((t) => ({
    title: t.title,
    amount: t.amount,
    date: t.date,
    type: t.type,
    category_id: categoryIds.get(t.category) || null,
    account_id: accountIds.get(t.compte) || null,
    payment_method: t.payment,
  }));

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("transactions").insert(batch);
    if (error) throw new Error(error.message);
    inserted += batch.length;
    console.log(`  ${inserted}/${rows.length}`);
  }

  console.log(`Terminé : ${inserted} transaction(s) migrée(s) vers Supabase.`);
}

main().catch((e) => {
  console.error("Échec de la migration :", e.message);
  process.exit(1);
});
