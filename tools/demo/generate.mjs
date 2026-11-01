// Génère lib/demo/data.json (données FICTIVES du mode démo) à partir des fixtures des captures.
// Usage : node tools/demo/generate.mjs — relancé automatiquement par `npm run demo`.
import fs from "node:fs";
import path from "node:path";
import * as F from "../visual/fixtures.mjs";

const repo = process.cwd();
const data = {
  user: F.USER,
  meta: F.buildMeta(repo),
  txs: F.buildTransactions(),
  subs: F.SUBSCRIPTIONS,
  goals: F.GOALS,
  budgets: F.BUDGETS,
  rules: F.RULES,
  plan: F.PLAN,
  keys: F.API_KEYS,
};
const out = path.join(repo, "lib/demo/data.json");
fs.writeFileSync(out, JSON.stringify(data));
console.log(`Mode démo : ${path.relative(repo, out)} (${data.txs.length} transactions fictives)`);
