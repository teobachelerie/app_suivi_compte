# Vérification visuelle

Prérequis : `npm run build`, puis `npx playwright install webkit` (une fois).

- `npm run capture -- [--sizes 390x844,375x667,430x932] [--themes dark,light] [--only motif]` : un PNG par écran et par thème dans `tools/visual/out/<taille>/<thème>/`. Lance `next start` sur le port 3100 avec des variables Supabase factices.
- `npm run test:sheet` : fermeture animée, Échap, fond, glissé, réduction des animations, sélecteur imbriqué.
- `node tools/visual/montage.mjs sortie.png 4 a.png b.png …` : planche de comparaison.

Principe : aucune base, aucun réseau. La session Supabase est injectée dans le `localStorage` (clé `sb-127-auth-token`), toutes les routes `/api/*` sont interceptées par `page.route` (données fictives dans `fixtures.mjs`), la date est figée au 16 octobre 2026.

Ce que WebKit sous macOS ne reproduit pas : zones de sécurité, barre d'état translucide, bande noire iOS, cache des balises meta de la PWA, clavier iOS, haptiques, gestes. À valider sur l'iPhone.
