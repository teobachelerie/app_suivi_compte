// Usage : node montage.mjs <sortie.png> <perRow> img1 img2 ...  (chaque image affichée à 390 px de large)
import { webkit } from "playwright";
import fs from "node:fs";
const [out, per, ...imgs] = process.argv.slice(2);
const cell = imgs.map((f) => `<figure><img src="file://${f}" width="390"><figcaption>${f.split("/").pop()}</figcaption></figure>`).join("");
const html = `<body style="margin:0;background:#444;display:grid;grid-template-columns:repeat(${per},390px);gap:8px;font:12px sans-serif;color:#fff"><style>figure{margin:0}img{display:block}</style>${cell}</body>`;
fs.writeFileSync(`${process.env.TMPDIR || "/tmp"}/montage.html`, html);
const b = await webkit.launch(); const p = await b.newPage({ viewport: { width: per * 398, height: 900 } });
await p.goto(`file://${process.env.TMPDIR || "/tmp"}/montage.html`); await p.waitForTimeout(500);
await p.screenshot({ path: out, fullPage: true }); await b.close();
