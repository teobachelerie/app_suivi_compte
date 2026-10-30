// Vérifie le choix des comptes principaux (cartes de l'accueil), enregistré en base (migration 019).
// Usage : npm run build, puis node tools/visual/core-test.mjs
import { spawn } from "node:child_process";
import { launch, newPage, settle, BASE, REPO } from "./harness.mjs";

const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "demo", SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "demo" };
const server = spawn("npx", ["next", "start", "-p", "3100"], { cwd: REPO, env, stdio: "ignore" });
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); };
const browser = await launch();

// Ouvre la page, compte les PATCH envoyés sur /api/accounts, puis lit la liste « Comptes principaux » des Réglages.
async function run(prepare) {
  const patches = [];
  const page = await newPage(browser, { prepare });
  page.on("request", (r) => { if (r.method() === "PATCH" && r.url().includes("/api/accounts/")) patches.push({ url: r.url(), body: r.postData() }); });
  await settle(page, 1200);
  await page.locator("nav button").nth(3).click();
  await settle(page, 400);
  await page.getByText("Comptes", { exact: true }).first().click();
  await settle(page, 500);
  const text = await page.evaluate(() => document.body.innerText);
  const core = text.slice(text.indexOf("COMPTES PRINCIPAUX"), text.indexOf("ÉPARGNE"));
  await page.close();
  return { patches, core };
}

{ // Migration 019 pas encore exécutée : la colonne est absente, comportement inchangé, aucune écriture.
  const { patches, core } = await run();
  check("sans migration : Courant et Pro principaux", core.includes("Compte courant") && core.includes("Compte pro") && !core.includes("Livret A"), core.replace(/\s+/g, " "));
  check("sans migration : aucune écriture", patches.length === 0, String(patches.length));
}
{ // Migration exécutée, aucun compte marqué (noms renommés) : l'app enregistre le choix affiché.
  const { patches } = await run((s) => { s.meta.accounts.forEach((a) => { a.is_core = false; }); });
  const ids = patches.map((p) => p.url.split("/").pop()).sort().join(",");
  check("reprise : enregistre les deux comptes affichés", ids === "acc-1,acc-2" && patches.every((p) => JSON.parse(p.body).isCore === true), ids);
}
{ // Choix lu en base : Pro et Livret A sont principaux, même si le localStorage est vide.
  const { patches, core } = await run((s) => { s.meta.accounts.forEach((a) => { a.is_core = a.id === "acc-2" || a.id === "acc-3"; }); });
  check("base : le choix enregistré prime", core.includes("Compte pro") && core.includes("Livret A") && !core.includes("Compte courant"), core.replace(/\s+/g, " "));
  check("base : aucune écriture", patches.length === 0, String(patches.length));
}

{ // Ajout d'un compte principal depuis la ligne vide : il est créé puis marqué principal.
  const patches = [];
  const page = await newPage(browser, { prepare: (s) => { s.meta.accounts.forEach((a) => { a.is_core = a.id === "acc-1" || a.id === "acc-2"; }); } });
  page.on("request", (r) => { if (r.method() === "PATCH" && r.url().includes("/api/accounts/")) patches.push({ url: r.url(), body: r.postData() }); });
  await settle(page, 1200);
  await page.locator("nav button").nth(3).click(); await settle(page, 400);
  await page.getByText("Comptes", { exact: true }).first().click(); await settle(page, 500);
  await page.getByText("Nouveau compte", { exact: true }).click();
  await page.keyboard.type("Compte joint");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await settle(page, 1200);
  const text = await page.evaluate(() => document.body.innerText);
  const core = text.slice(text.indexOf("COMPTES PRINCIPAUX"), text.indexOf("ÉPARGNE"));
  check("ajout : le nouveau compte est marqué principal", patches.length === 1 && JSON.parse(patches[0].body).isCore === true, String(patches.length));
  check("ajout : il apparaît sous les comptes principaux", core.includes("Compte joint"), core.replace(/\s+/g, " "));
  await page.close();
}
{ // Palier atteint (4 comptes sur 4) : plus de ligne d'ajout, une ligne qui explique la limite.
  const page = await newPage(browser, { prepare: (s) => { s.plan = { ...s.plan, limits: { ...s.plan.limits, accounts: 4, label: "Confirmé" } }; } });
  await settle(page, 1200);
  await page.locator("nav button").nth(3).click(); await settle(page, 400);
  await page.getByText("Comptes", { exact: true }).first().click(); await settle(page, 500);
  const text = await page.evaluate(() => document.body.innerText);
  check("palier atteint : aucune ligne d'ajout", !text.includes("Nouveau compte") && !text.includes("Nouveau livret"));
  check("palier atteint : la limite est expliquée", text.includes("4 comptes maximum"));
  await page.close();
}

await browser.close();
server.kill();
for (const r of results) console.log(`${r.ok ? "OK  " : "ÉCHEC"} ${r.name}${r.detail ? " (" + r.detail + ")" : ""}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
