// API simulée du mode démo (npm run demo) : mêmes réponses que les routes /api/*, gardées en
// mémoire dans l'onglet. Aucune base, aucun réseau. Recharger la page remet les données d'origine.
// Jamais embarquée en production : lib/api.js ne l'importe que si NEXT_PUBLIC_DEMO vaut "1".
import seed from "./data.json";

const state = JSON.parse(JSON.stringify(seed));
let nextId = 1;
const newId = (p) => `${p}-demo${nextId++}`;
const pause = () => new Promise((r) => setTimeout(r, 120)); // un léger délai, comme un vrai réseau

function patchItem(list, id, body) {
  const i = list.findIndex((x) => x.id === id);
  if (i > -1) list[i] = { ...list[i], ...body };
  return list[i] || {};
}

export async function demoApi(url, options = {}) {
  await pause();
  const m = (options.method || "GET").toUpperCase();
  const body = options.body || {};
  const [p] = url.split("?");
  const id = p.split("/").pop();

  if (p === "/api/transactions" && m === "GET") return state.txs;
  if (p === "/api/transactions" && m === "POST") {
    const t = { id: newId("tx"), tags: [], splits: null, notes: null, compteDestination: null, ...body };
    state.txs.unshift(t);
    return t;
  }
  if (p.startsWith("/api/transactions/") && m === "PATCH") return patchItem(state.txs, id, body);
  if (p.startsWith("/api/transactions/") && m === "DELETE") { state.txs = state.txs.filter((t) => t.id !== id); return { ok: true }; }

  if (p === "/api/meta" && m === "GET") return state.meta;
  if (p === "/api/meta" && m === "PATCH") {
    // Même logique que updateSelectOptions : un id garde la ligne (renommée), sans id elle est créée.
    const key = body.property === "Category" ? "categories" : "accounts";
    state.meta[key] = body.options.map((o) => {
      const prev = state.meta[key].find((x) => x.id === o.id);
      return prev ? { ...prev, name: o.name } : { id: newId(key === "categories" ? "cat" : "acc"), name: o.name, color: null, parent_id: null, bank_id: null };
    });
    return { ok: true };
  }
  if (p.startsWith("/api/accounts/") && m === "PATCH") {
    const a = state.meta.accounts.find((x) => x.id === id);
    if (a && body.bankId !== undefined) a.bank_id = body.bankId;
    if (a && body.isCore !== undefined) a.is_core = body.isCore;
    return { ok: true };
  }
  if (p.startsWith("/api/categories/") && m === "PATCH") { patchItem(state.meta.categories, id, body); return { ok: true }; }

  for (const [route, key, prefix] of [["/api/subscriptions", "subs", "sub"], ["/api/goals", "goals", "goal"], ["/api/budgets", "budgets", "bud"], ["/api/category-rules", "rules", "rule"], ["/api/api-keys", "keys", "key"]]) {
    if (p === route && m === "GET") return state[key];
    if (p === route && m === "POST") {
      const item = { id: newId(prefix), active: true, ...body };
      state[key].push(item);
      return key === "keys" ? { token: "eak_demo_fictif" } : item;
    }
    if (p.startsWith(`${route}/`) && m === "PATCH") return patchItem(state[key], id, body);
    if (p.startsWith(`${route}/`) && m === "DELETE") { state[key] = state[key].filter((x) => x.id !== id); return { ok: true }; }
  }

  if (p === "/api/billing/plan") return state.plan;
  if (p === "/api/onboarding/complete") return { ok: true };
  if (p === "/api/transactions/import") return { imported: 0, errors: ["Import désactivé en mode démo."] };
  throw new Error("Indisponible en mode démo.");
}

// Authentification factice : toujours connecté avec l'utilisateur fictif.
const session = { access_token: "demo", user: seed.user };
export const demoAuth = {
  getSession: async () => ({ data: { session } }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
  signOut: async () => ({ error: null }),
  signInWithPassword: async () => ({ data: { session }, error: null }),
  signUp: async () => ({ data: { session }, error: null }),
  resetPasswordForEmail: async () => ({ error: null }),
  updateUser: async () => ({ data: {}, error: null }),
  resend: async () => ({ error: null }),
};
