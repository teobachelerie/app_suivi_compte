# Expenses App

Suivi de dépenses connecté en direct à ta base Notion "Expenses".

## 1. Créer le token Notion (si pas déjà fait)

1. Va sur https://www.notion.so/my-integrations → "New integration"
2. Donne-lui un nom (ex: "Expenses App"), associe-le à ton workspace, valide
3. Copie le token affiché (commence par `secret_` ou `ntn_`)
4. Ouvre ta base "Expenses" dans Notion → bouton "..." en haut à droite → "Connections" → connecte l'intégration que tu viens de créer

## 2. Récupérer l'ID de ta base Notion

Dans l'URL de ta base Notion (vue en pleine page), tu as un ID de 32 caractères juste après le nom de la page, par exemple :
`https://www.notion.so/xxxx/Expenses-482e4115f71d82d8b2890153e4b33cd6`
→ l'ID est `482e4115f71d82d8b2890153e4b33cd6`

## 3. Tester en local (optionnel)

```
npm install
cp .env.local.example .env.local
```
Remplis `.env.local` avec ton token et ton ID de base, puis :
```
npm run dev
```
Ouvre http://localhost:3000

## 4. Déployer sur Vercel

1. Crée un dépôt GitHub et pousse ce dossier dedans :
```
git init
git add .
git commit -m "Première version"
git branch -M main
git remote add origin https://github.com/TON_USER/expenses-app.git
git push -u origin main
```
2. Va sur https://vercel.com → "Add New" → "Project" → importe ton dépôt GitHub
3. Avant de cliquer "Deploy", ouvre "Environment Variables" et ajoute :
   - `NOTION_TOKEN` = ton token Notion
   - `NOTION_DATABASE_ID` = l'ID de ta base
4. Clique "Deploy". Vercel te donne une URL du type `expenses-app.vercel.app`

Toute modification faite dans l'app se reflète en direct dans Notion, et inversement (si tu modifies une ligne dans Notion, elle apparaît au prochain rechargement de l'app).

## Notes

- Le moyen de paiement (Carte bancaire / Carte de débit / Virement / Liquide) est fixe, pas éditable dans les réglages.
- La gestion des catégories et des comptes dans les réglages modifie directement le schéma de ta base Notion (les options du champ "Category" ou "Compte").
- Supprimer une catégorie ou un compte dans les réglages ne supprime pas les transactions qui l'utilisaient déjà — elles resteront avec cette valeur dans Notion, seulement invisible comme choix futur.
