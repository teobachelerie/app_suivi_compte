import { webkit, devices } from "playwright";
import path from "node:path";
import fs from "node:fs";
import * as F from "./fixtures.mjs";

export const REPO = process.env.REPO || process.cwd();
export const BASE = process.env.BASE || "http://127.0.0.1:3100";
export const SIZES = { "390x844": [390, 844], "375x667": [375, 667], "430x932": [430, 932] };

// Clé de stockage de supabase-js : sb-<premier label du host>-auth-token ; host = 127.0.0.1 -> "127".
const STORAGE_KEY = "sb-127-auth-token";

export async function launch() {
  return webkit.launch();
}

export async function newPage(browser, { theme = "dark", size = "390x844", authed = true, onboardingSeen = true, apiDelay = 0 } = {}) {
  const [width, height] = SIZES[size];
  const ctx = await browser.newContext({
    ...devices["iPhone 14"], viewport: { width, height }, deviceScaleFactor: 2, locale: "fr-FR", timezoneId: "Europe/Paris",
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) logs.push(`[${m.type()}] ${m.text()}`); });
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`));
  page.logs = logs;
  page.apiDelay = apiDelay;

  // Date figée (sans toucher aux minuteries) : captures reproductibles.
  await page.addInitScript((today) => {
    const fixed = new Date(`${today}T12:00:00+02:00`).getTime();
    const RealDate = Date;
    // eslint-disable-next-line no-global-assign
    Date = class extends RealDate {
      constructor(...a) { if (a.length === 0) super(fixed); else super(...a); }
      static now() { return fixed; }
    };
  }, F.TODAY);

  await page.addInitScript(([key, theme, authed, onboardingSeen, user]) => {
    try {
      localStorage.setItem("expenses-theme", theme);
      if (authed) {
        const exp = Math.floor(Date.now() / 1000) + 10 * 365 * 86400;
        localStorage.setItem(key, JSON.stringify({
          access_token: "demo", refresh_token: "demo", token_type: "bearer", expires_in: 3600 * 24 * 365 * 10, expires_at: exp,
          user: { id: user.id, email: user.email, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
        }));
      }
      if (onboardingSeen) localStorage.setItem(`expenses-onboarding-seen-${user.id}`, "1");
    } catch {}
  }, [STORAGE_KEY, theme, authed, onboardingSeen, F.USER]);

  const state = {
    meta: F.buildMeta(REPO), txs: F.buildTransactions(), subs: structuredClone(F.SUBSCRIPTIONS), goals: structuredClone(F.GOALS),
    budgets: structuredClone(F.BUDGETS), rules: structuredClone(F.RULES), plan: { ...F.PLAN, onboardingSeen }, keys: structuredClone(F.API_KEYS),
  };
  page.state = state;
  let nextId = 1000;
  await page.route("**/127.0.0.1:54321/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const m = req.method();
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
    if (page.apiDelay) await new Promise((r) => setTimeout(r, page.apiDelay));
    if (p === "/api/transactions" && m === "GET") return json(state.txs);
    if (p === "/api/transactions" && m === "POST") { const t = { id: `tx-n${nextId++}`, ...body, tags: body.tags || [], splits: body.splits || null, notes: body.notes || null }; state.txs.unshift(t); return json(t); }
    if (p.startsWith("/api/transactions/") && m === "PATCH") { const id = p.split("/").pop(); const i = state.txs.findIndex((t) => t.id === id); state.txs[i] = { ...state.txs[i], ...body }; return json(state.txs[i]); }
    if (p.startsWith("/api/transactions/") && m === "DELETE") { const id = p.split("/").pop(); state.txs = state.txs.filter((t) => t.id !== id); return json({ ok: true }); }
    if (p === "/api/meta" && m === "GET") return json(state.meta);
    if (p === "/api/subscriptions") return json(state.subs);
    if (p === "/api/goals") return json(state.goals);
    if (p === "/api/budgets") return json(state.budgets);
    if (p === "/api/category-rules") return json(state.rules);
    if (p === "/api/billing/plan") return json(state.plan);
    if (p === "/api/api-keys") return json(state.keys);
    return json({}, 200);
  });
  await page.goto(BASE + "/");
  return page;
}

export async function settle(page, ms = 900) {
  await page.waitForTimeout(ms);
}

export function outPath(...parts) {
  const p = path.join(process.env.OUT || path.join(REPO, "tools/visual/out"), ...parts);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  return p;
}
