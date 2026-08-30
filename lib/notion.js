const BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function headers() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

function pageToTransaction(page) {
  const p = page.properties;
  return {
    id: page.id,
    title: p.Name?.title?.[0]?.plain_text || "",
    amount: p.Amount?.number ?? 0,
    date: p.Date?.date?.start || "",
    category: p.Category?.select?.name || "",
    type: p.Type?.select?.name || "Dépense",
    compte: p.Compte?.select?.name || "",
    payment: p["Payment Method"]?.select?.name || "",
  };
}

function transactionToProperties(t) {
  const props = {};
  if (t.title !== undefined) props.Name = { title: [{ text: { content: t.title } }] };
  if (t.amount !== undefined) props.Amount = { number: Number(t.amount) };
  if (t.date !== undefined) props.Date = { date: { start: t.date } };
  if (t.category !== undefined) props.Category = { select: { name: t.category } };
  if (t.type !== undefined) props.Type = { select: { name: t.type } };
  if (t.compte !== undefined) props.Compte = { select: { name: t.compte } };
  if (t.payment !== undefined) props["Payment Method"] = { select: { name: t.payment } };
  return props;
}

export async function queryTransactions() {
  let results = [];
  let cursor;
  do {
    const res = await fetch(`${BASE}/databases/${process.env.NOTION_DATABASE_ID}/query`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        start_cursor: cursor,
        page_size: 100,
        sorts: [{ property: "Date", direction: "descending" }],
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Échec de la lecture Notion");
    results = results.concat(data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results.map(pageToTransaction);
}

export async function createTransaction(t) {
  const res = await fetch(`${BASE}/pages`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: transactionToProperties(t),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Échec de la création");
  return pageToTransaction(data);
}

export async function updateTransaction(id, t) {
  const res = await fetch(`${BASE}/pages/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ properties: transactionToProperties(t) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Échec de la modification");
  return pageToTransaction(data);
}

export async function deleteTransaction(id) {
  const res = await fetch(`${BASE}/pages/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({ archived: true }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Échec de la suppression");
  return true;
}

export async function getSchema() {
  const res = await fetch(`${BASE}/databases/${process.env.NOTION_DATABASE_ID}`, { headers: headers() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Échec de la lecture du schéma");
  return {
    categories: (data.properties.Category?.select?.options || []).map((o) => o.name),
    accounts: (data.properties.Compte?.select?.options || []).map((o) => o.name),
    payments: (data.properties["Payment Method"]?.select?.options || []).map((o) => o.name),
  };
}

export async function updateSelectOptions(propertyName, names) {
  const res = await fetch(`${BASE}/databases/${process.env.NOTION_DATABASE_ID}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify({
      properties: { [propertyName]: { select: { options: names.map((name) => ({ name })) } } },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Échec de la mise à jour du schéma");
  return true;
}
