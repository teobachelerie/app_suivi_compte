// Prérequis : `npm run build`. Usage : npm run capture -- [--sizes 390x844,...] [--themes dark,light] [--only motif]
// Démarre `next start` sur le port 3100 avec des variables Supabase factices, puis interroge uniquement des API simulées.
// Variables facultatives : OUT (dossier de sortie), BASE (serveur déjà lancé).
// Ancien usage : [--sizes 390x844,...] [--themes dark,light] [--only motif]
import { spawn } from "node:child_process";
import { launch, newPage, settle, outPath, BASE, REPO } from "./harness.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith("--") ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []));
const sizes = (args.sizes || "390x844").split(",");
const themes = (args.themes || "dark,light").split(",");
const only = args.only ? args.only.split(",") : null;

const tab = (page, i) => page.locator("nav button").nth(i).click();
const openTx = async (p, t) => { await tab(p, 1); await settle(p, 400); await p.getByText(t, { exact: true }).first().click(); };
const add = (page) => page.locator('button[aria-label="Ajouter une opération"]').click();
const clickText = (page, t, opts) => page.getByText(t, { exact: true, ...opts }).first().click();
// Tape une suite de touches sur le pavé de la saisie (chiffres, virgule, opérateurs).
const keys = async (page, seq) => { for (const k of seq.replace("-", "−").replace("*", "×").replace("/", "÷")) await page.locator(`.fin-keypad button[aria-label="${k}"]`).click(); };

// Chaque scénario : { name, opts?, run(page) }. La capture est prise à la fin de run().
const scenarios = [
  { name: "00-login", opts: { authed: false }, run: async () => {} },
  { name: "01-chargement", opts: { apiDelay: 4000 }, wait: 400, run: async () => {} },
  { name: "02-accueil-patrimoine", run: async () => {} },
  { name: "03-accueil-courant", run: async (p) => { await clickText(p, "courant"); } },
  { name: "04-accueil-pro", run: async (p) => { await clickText(p, "pro"); } },
  { name: "05-accueil-periode", run: async (p) => { await clickText(p, "Mois…"); } },
  { name: "06-flux-depenses", run: async (p) => { await clickText(p, "DÉPENSES"); } },
  { name: "06b-flux-jour", run: async (p) => { await clickText(p, "DÉPENSES"); await settle(p, 500); const box = await p.getByLabel("Choisir une période dans le graphique").boundingBox(); await p.mouse.click(box.x + box.width * 0.62, box.y + 10); } },
  { name: "07-flux-revenus", run: async (p) => { await clickText(p, "REVENUS"); } },
  { name: "08-epargne-detail", run: async (p) => { await p.getByText("ÉPARGNE", { exact: true }).scrollIntoViewIfNeeded(); await p.getByText("Livret A", { exact: true }).last().click(); } },
  { name: "09-objectifs", run: async (p) => { await clickText(p, "Objectifs"); } },
  { name: "10-pea", run: async (p) => { await clickText(p, "Simulateur PEA"); } },
  { name: "11-activite", run: async (p) => { await tab(p, 1); } },
  { name: "12-activite-filtres", run: async (p) => { await tab(p, 1); await clickText(p, "Filtrer et trier", { exact: false }); } },
  { name: "13-budgets", run: async (p) => { await tab(p, 2); } },
  { name: "14-budgets-bas", run: async (p) => { await tab(p, 2); await settle(p, 300); await p.mouse.move(200, 400); await p.evaluate(() => { document.getElementById("__next").scrollTo(0, 99999); }); } },
  { name: "15-abonnements", run: async (p) => { await tab(p, 2); await p.getByText("ABONNEMENTS").first().click(); } },
  { name: "16-plafond-sheet", run: async (p) => { await tab(p, 2); await clickText(p, "+ Ajouter"); } },
  { name: "16b-plafond-liste", run: async (p) => { await tab(p, 2); await clickText(p, "+ Ajouter"); await settle(p, 500); await p.getByLabel("Catégorie").click(); } },
  { name: "16c-plafond-erreur", run: async (p) => { await tab(p, 2); await clickText(p, "+ Ajouter"); await settle(p, 500); await clickText(p, "Confirmer"); } },
  { name: "16d-plafond-edition", run: async (p) => { await tab(p, 2); await p.getByText("Loisirs", { exact: true }).first().click(); } },
  { name: "16e-plafond-saisie", run: async (p) => { await tab(p, 2); await clickText(p, "+ Ajouter"); await settle(p, 500); await p.getByLabel("Plafond par mois").fill("250"); } },
  { name: "16f-plafond-sortie-milieu", wait: 0, run: async (p) => { await tab(p, 2); await clickText(p, "+ Ajouter"); await settle(p, 600); await p.getByRole("button", { name: "Fermer" }).click(); await p.waitForTimeout(90); } },
  { name: "16g-plafond-entree-milieu", wait: 0, run: async (p) => { await tab(p, 2); await clickText(p, "+ Ajouter"); await p.waitForTimeout(90); } },
  { name: "17-reglages", run: async (p) => { await tab(p, 3); } },
  { name: "17c-fleche-haut", run: async (p) => { await tab(p, 3); await settle(p, 300); await clickText(p, "Catégories"); } },
  { name: "06c-flux-defile", run: async (p) => { await clickText(p, "DÉPENSES"); await settle(p, 400); const box = await p.getByLabel("Choisir une période dans le graphique").boundingBox(); await p.mouse.click(box.x + box.width * 0.62, box.y + 10); await settle(p, 300); await p.mouse.move(200, 400); await p.evaluate(() => { document.getElementById("__next").scrollTo(0, 300); }); } },
  { name: "17b-entete-collant", run: async (p) => { await tab(p, 3); await settle(p, 300); await clickText(p, "Catégories"); await settle(p, 400); await p.mouse.move(200, 400); await p.evaluate(() => { document.getElementById("__next").scrollTo(0, 700); }); } },
  ...["Comptes", "Catégories", "Raccourci iOS", "Export", "Abonnement", "Compte"].map((s, i) => ({
    name: `18-reglages-${String(i).padStart(2, "0")}-${s.replace(/[^a-zA-Z]/g, "").toLowerCase()}`,
    run: async (p) => { await tab(p, 3); await settle(p, 300); await clickText(p, s); },
  })),
  { name: "20-ajout-ouverture", run: async (p) => { await add(p); } },
  { name: "21-ajout-montant", run: async (p) => { await add(p); await keys(p, "42,5"); } },
  { name: "22-ajout-categories", run: async (p) => { await add(p); await keys(p, "12"); await p.locator(".fin-pill").first().click(); } },
  { name: "23-ajout-categorie-recherche", run: async (p) => { await add(p); await p.locator(".fin-pill").first().click(); await settle(p, 400); await p.getByLabel("Rechercher une catégorie").fill("as"); } },
  { name: "23b-ajout-categories-bas", run: async (p) => { await add(p); await p.locator(".fin-pill").first().click(); await settle(p, 400); await p.evaluate(() => { document.querySelector(".fin-sheet-body").scrollTo(0, 99999); }); } },
  { name: "23c-ajout-apres-categorie", run: async (p) => { await add(p); await keys(p, "9"); await p.locator(".fin-pill").first().click(); await settle(p, 400); await p.locator(".fin-sheet-panel .fin-cat-tile", { hasText: "Boulangerie" }).first().click(); } },
  { name: "24-ajout-titre-clavier", run: async (p) => { await add(p); await keys(p, "12"); await p.getByLabel("Titre", { exact: true }).fill("Courses du soir"); } },
  { name: "25-ajout-plus-options", run: async (p) => { await add(p); await keys(p, "25"); await p.locator(".fin-link-more").first().click(); } },
  { name: "26-ajout-virement", run: async (p) => { await add(p); await p.locator(".fin-tx-head button", { hasText: "Virement" }).click(); await keys(p, "50"); } },
  { name: "27-ajout-revenu", run: async (p) => { await add(p); await p.locator(".fin-tx-head button", { hasText: "Revenu" }).click(); await keys(p, "450"); } },
  { name: "28-ajout-date", run: async (p) => { await add(p); await p.locator(".fin-pill", { hasText: "Aujourd'hui" }).click(); } },
  { name: "29-ajout-calcul", run: async (p) => { await add(p); await keys(p, "12+8"); } },
  { name: "30-edition", run: async (p) => { await openTx(p, "Billet de train"); } },
  { name: "31-edition-fractionnee", run: async (p) => { await openTx(p, "Courses + produits ménagers"); } },
  { name: "33-edition-scroll", run: async (p) => { await openTx(p, "Courses + produits ménagers"); await settle(p, 300); await p.evaluate(() => { document.querySelector(".fin-tx-body").scrollTo(0, 99999); }); } },
  { name: "34-edition-virement", run: async (p) => { await openTx(p, "Virement PEA"); } },
  { name: "40-suppression-toast", run: async (p) => { await openTx(p, "Billet de train"); await settle(p, 400); await p.getByLabel("Supprimer la transaction").click(); } },
  { name: "50-tour-guide", opts: { onboardingSeen: false }, run: async () => {} },
];

let server = null;
if (!process.env.BASE) {
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "demo", SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "demo" };
  server = spawn("npx", ["next", "start", "-p", "3100"], { cwd: REPO, env, stdio: "ignore" });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
}
// Garde-fou : un scénario qui se fige (WebKit bloqué) ne doit pas bloquer toute la série.
const withTimeout = (promise, ms, label) => Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(`délai dépassé (${label})`)), ms))]);
const browser = await launch();
const report = [];
for (const size of sizes) for (const theme of themes) for (const sc of scenarios) {
  if (only && !only.some((o) => sc.name.includes(o))) continue;
  let page;
  try {
    page = await withTimeout(newPage(browser, { theme, size, ...(sc.opts || {}) }), 45000, `${sc.name} ouverture`);
    await withTimeout((async () => {
      if (!sc.opts?.apiDelay) await page.waitForSelector("nav button, input[type=email], input[type=password]", { timeout: 15000 }).catch(() => {});
      await settle(page, 1000);
      await sc.run(page);
      await settle(page, sc.wait ?? 900);
      await page.screenshot({ path: outPath(size, theme, `${sc.name}.png`) });
    })(), 90000, sc.name);
    if (page.logs.length) report.push({ size, theme, scenario: sc.name, logs: page.logs.slice(0, 5) });
  } catch (e) {
    report.push({ size, theme, scenario: sc.name, error: e.message.split("\n")[0] });
  }
  await page?.context().close().catch(() => {});
}
await browser.close();
server?.kill();
console.log(JSON.stringify(report, null, 1));
