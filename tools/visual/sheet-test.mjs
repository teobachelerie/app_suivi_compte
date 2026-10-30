// Vérifie le comportement des feuilles : fermeture animée, glissé, réduction des animations, Échap.
// Usage : npm run test:sheet (nécessite `npm run build`).
import { spawn } from "node:child_process";
import { launch, newPage, settle, BASE, REPO } from "./harness.mjs";

const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "demo", SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_SERVICE_ROLE_KEY: "demo" };
const server = spawn("npx", ["next", "start", "-p", "3100"], { cwd: REPO, env, stdio: "ignore" });
for (let i = 0; i < 60; i++) { try { if ((await fetch(BASE)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 500)); }

const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); };
const browser = await launch();

async function open(page) {
  await page.waitForSelector("nav button");
  await settle(page, 800);
  await page.locator("nav button").nth(2).click();
  await settle(page, 400);
  await page.getByText("+ Ajouter", { exact: true }).click();
  await page.waitForSelector(".fin-sheet-panel");
  await settle(page, 500);
}
const present = (page) => page.locator(".fin-sheet-panel").count();
// Glissé lent (≈ 40 ms par pas) : la vitesse reste sous le seuil, seule la distance compte.
async function drag(page, dy) {
  const head = await page.locator(".fin-sheet-head").boundingBox();
  const x = head.x + head.width / 2, y = head.y + 10;
  await page.mouse.move(x, y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(x, y + (dy * i) / 8); await page.waitForTimeout(40); }
  await page.mouse.up();
}

{ // animations actives : la feuille reste visible pendant la sortie, puis disparaît
  const page = await newPage(browser, {});
  await open(page);
  await page.getByRole("button", { name: "Fermer" }).click();
  await page.waitForTimeout(60);
  check("sortie animée : toujours présente à 60 ms", (await present(page)) === 1);
  await page.waitForTimeout(500);
  check("sortie animée : retirée après 560 ms", (await present(page)) === 0);
}
{ // Échap
  const page = await newPage(browser, {});
  await open(page);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  check("Échap ferme la feuille", (await present(page)) === 0);
}
{ // fond
  const page = await newPage(browser, {});
  await open(page);
  await page.mouse.click(195, 60);
  await page.waitForTimeout(600);
  check("clic sur le fond ferme la feuille", (await present(page)) === 0);
}
{ // glissé court : la feuille reste
  const page = await newPage(browser, {});
  await open(page);
  await drag(page, 40);
  await page.waitForTimeout(500);
  check("glissé de 40 px : la feuille reste", (await present(page)) === 1);
  const transform = await page.locator(".fin-sheet-panel").evaluate((el) => el.style.transform);
  check("glissé de 40 px : retour en place", transform === "" || transform === "translateY(0px)", transform);
}
{ // glissé rapide (flick) : la feuille se ferme même sur courte distance
  const page = await newPage(browser, {});
  await open(page);
  const head = await page.locator(".fin-sheet-head").boundingBox();
  const x = head.x + head.width / 2, y = head.y + 10;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 60); await page.mouse.up();
  await page.waitForTimeout(500);
  check("flick de 60 px : la feuille se ferme", (await present(page)) === 0);
}
{ // glissé long : la feuille se ferme
  const page = await newPage(browser, {});
  await open(page);
  await drag(page, 200);
  await page.waitForTimeout(500);
  check("glissé de 200 px : la feuille se ferme", (await present(page)) === 0);
}
{ // réduction des animations : fermeture immédiate ; à l'entrée, un simple fondu (aucun glissement)
  const page = await newPage(browser, { reducedMotion: "reduce" });
  await open(page);
  const anim = await page.locator(".fin-sheet-panel").evaluate((el) => getComputedStyle(el).animationName);
  check("reduced-motion : entrée en fondu, sans glissement", anim === "fin-fade-in", anim);
  await page.getByRole("button", { name: "Fermer" }).click();
  await page.waitForTimeout(50);
  check("reduced-motion : fermeture immédiate", (await present(page)) === 0);
}
{ // sélecteur imbriqué : choisir une option ferme seulement la liste
  const page = await newPage(browser, {});
  await open(page);
  await page.getByLabel("Catégorie").click();
  await page.waitForSelector("[role=listbox]");
  await page.getByRole("option", { name: "Santé" }).click();
  await page.waitForTimeout(600);
  check("sélecteur : la liste se ferme, le formulaire reste", (await present(page)) === 1 && (await page.locator("[role=listbox]").count()) === 0);
  check("sélecteur : la valeur choisie s'affiche", (await page.getByLabel("Catégorie").innerText()).includes("Santé"));
}
await browser.close();
server.kill();
for (const r of results) console.log(`${r.ok ? "OK  " : "ÉCHEC"} ${r.name}${r.detail ? " (" + r.detail + ")" : ""}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
