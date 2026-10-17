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

// Chaque scénario : { name, opts?, run(page) }. La capture est prise à la fin de run().
const scenarios = [
  { name: "00-login", opts: { authed: false }, run: async () => {} },
  { name: "01-chargement", opts: { apiDelay: 4000 }, wait: 400, run: async () => {} },
  { name: "02-accueil-patrimoine", run: async () => {} },
  { name: "03-accueil-courant", run: async (p) => { await clickText(p, "courant"); } },
  { name: "04-accueil-pro", run: async (p) => { await clickText(p, "pro"); } },
  { name: "05-accueil-periode", run: async (p) => { await clickText(p, "Mois…"); } },
  { name: "06-flux-depenses", run: async (p) => { await clickText(p, "DÉPENSES"); } },
  { name: "07-flux-revenus", run: async (p) => { await clickText(p, "REVENUS"); } },
  { name: "08-epargne-detail", run: async (p) => { await p.getByText("Livret A").first().click(); } },
  { name: "09-objectifs", run: async (p) => { await clickText(p, "Objectifs"); } },
  { name: "10-pea", run: async (p) => { await clickText(p, "Simulateur PEA"); } },
  { name: "11-activite", run: async (p) => { await tab(p, 1); } },
  { name: "12-activite-filtres", run: async (p) => { await tab(p, 1); await p.locator("input[placeholder^='Rechercher'] ~ button").last().click(); } },
  { name: "13-budgets", run: async (p) => { await tab(p, 2); } },
  { name: "14-budgets-bas", run: async (p) => { await tab(p, 2); await settle(p, 300); await p.mouse.move(200, 400); await p.evaluate(() => { document.getElementById("__next").scrollTo(0, 99999); }); } },
  { name: "15-abonnements", run: async (p) => { await tab(p, 2); await p.getByText("ABONNEMENTS").first().click(); } },
  { name: "16-plafond-sheet", run: async (p) => { await tab(p, 2); await clickText(p, "+ Ajouter"); } },
  { name: "17-reglages", run: async (p) => { await tab(p, 3); } },
  ...["Apparence", "Affichage", "Comptes", "Catégories", "Raccourci iOS", "Export", "Abonnement", "Compte"].map((s, i) => ({
    name: `18-reglages-${String(i).padStart(2, "0")}-${s.replace(/[^a-zA-Z]/g, "").toLowerCase()}`,
    run: async (p) => { await tab(p, 3); await settle(p, 300); await clickText(p, s); },
  })),
  { name: "20-ajout-categories", run: async (p) => { await add(p); } },
  { name: "21-ajout-sous-categories", run: async (p) => { await add(p); await clickText(p, "Alimentation"); } },
  { name: "22-ajout-revenus", run: async (p) => { await add(p); await clickText(p, "Revenus"); } },
  { name: "23-ajout-montant", run: async (p) => { await add(p); await clickText(p, "Alimentation"); await clickText(p, "Courses"); await clickText(p, "4"); await clickText(p, "2"); await clickText(p, ","); await clickText(p, "5"); } },
  { name: "24-ajout-details", run: async (p) => { await add(p); await clickText(p, "Alimentation"); await clickText(p, "Courses"); await clickText(p, "4"); await clickText(p, "2"); await clickText(p, "Suivant"); } },
  { name: "25-ajout-details-clavier", run: async (p) => { await add(p); await clickText(p, "Alimentation"); await clickText(p, "Courses"); await clickText(p, "4"); await clickText(p, "Suivant"); await p.getByPlaceholder(/bougie/).fill("Courses du soir"); } },
  { name: "26-ajout-virement", run: async (p) => { await add(p); await clickText(p, "Ou faire un virement entre mes comptes"); await clickText(p, "5"); await clickText(p, "Suivant"); } },
  { name: "27-ajout-erreur", run: async (p) => { await add(p); await clickText(p, "Alimentation"); await clickText(p, "Courses"); await clickText(p, "Suivant"); } },
  { name: "30-edition", run: async (p) => { await openTx(p, "Billet de train"); } },
  { name: "31-edition-fractionnee", run: async (p) => { await openTx(p, "Courses + produits ménagers"); } },
  { name: "32-edition-categorie", run: async (p) => { await openTx(p, "Billet de train"); await settle(p, 300); await p.getByText("Billets (avion, train)").last().click(); } },
  { name: "33-edition-scroll", run: async (p) => { await openTx(p, "Billet de train"); await settle(p, 300); await p.evaluate(() => { document.querySelector(".sheet-panel").scrollTo(0, 99999); }); } },
  { name: "40-suppression-toast", run: async (p) => { await openTx(p, "Billet de train"); await settle(p, 400); await p.locator("button:has(svg[class*='trash'])").first().click(); } },
  { name: "50-tour-guide", opts: { onboardingSeen: false }, run: async () => {} },
];

let server = null;
if (!process.env.BASE) {
  const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "demo", SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "demo" };
  server = spawn("npx", ["next", "start", "-p", "3100"], { cwd: REPO, env, stdio: "ignore" });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }
}
const browser = await launch();
const report = [];
for (const size of sizes) for (const theme of themes) for (const sc of scenarios) {
  if (only && !only.some((o) => sc.name.includes(o))) continue;
  const page = await newPage(browser, { theme, size, ...(sc.opts || {}) });
  try {
    if (!sc.opts?.apiDelay) await page.waitForSelector("nav button, input[type=email], input[type=password]", { timeout: 15000 }).catch(() => {});
    await settle(page, 1000);
    await sc.run(page);
    await settle(page, sc.wait ?? 900);
    await page.screenshot({ path: outPath(size, theme, `${sc.name}.png`) });
    if (page.logs.length) report.push({ size, theme, scenario: sc.name, logs: page.logs.slice(0, 5) });
  } catch (e) {
    report.push({ size, theme, scenario: sc.name, error: e.message.split("\n")[0] });
  }
  await page.context().close();
}
await browser.close();
server?.kill();
console.log(JSON.stringify(report, null, 1));
