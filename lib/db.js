import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

// Clé "service role" : accès complet, utilisée UNIQUEMENT ici, côté serveur (routes pages/api/*).
// Ne jamais importer ce fichier depuis un composant React ou l'exposer au navigateur.
//
// Important : la clé service role CONTOURNE totalement les policies RLS de Supabase. Ça veut
// dire que la sécurité multi-utilisateur de cette app ne repose PAS sur RLS (qui n'existe qu'en
// filet de sécurité pour un futur accès direct côté client), mais sur le fait que CHAQUE fonction
// des fichiers lib/*.js filtre explicitement par `userId` — y compris sur les updates/deletes,
// pour qu'un utilisateur ne puisse jamais modifier ou lire les données d'un autre en devinant un id.
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export function toNumber(v) {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(",", "."));
  return Number(v);
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function resolveId(table, name, userId, { required } = { required: true }) {
  if (!name) return null;
  // ilike (sans jokers % / _) = comparaison insensible à la casse, exacte sinon — évite
  // qu'un écart de casse (renommage, cache local, etc.) fasse échouer la résolution.
  // Les caractères % et _ du nom lui-même sont échappés pour ne pas être pris pour des jokers.
  const escaped = name.replace(/[%_\\]/g, (c) => `\\${c}`);
  const { data, error } = await supabase.from(table).select("id").ilike("name", escaped).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data && required) throw new Error(`"${name}" introuvable dans ${table} pour cet utilisateur.`);
  return data?.id ?? null;
}

// Comme resolveId, mais crée la catégorie si elle n'existe pas encore au lieu d'échouer —
// utilisé uniquement pour "Virement automatique", catégorie technique auto-provisionnée au
// premier virement interne de chaque utilisateur (jamais pour une catégorie tapée par l'utilisateur),
// et pour "Abonnements" (voir lib/billing.js).
export async function ensureCategory(userId, name) {
  const existing = await resolveId("categories", name, userId, { required: false });
  if (existing) return existing;
  const { data, error } = await supabase.from("categories").insert({ user_id: userId, name }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

// Vérifie soit un jeton de session (Authorization: Bearer <token>, utilisé par l'app web),
// soit une clé d'API (en-tête X-Api-Key, utilisée par les Raccourcis iOS). Retourne l'id de
// l'utilisateur authentifié, ou null si aucun des deux n'est valide.
//
// Le jeton Bearer est vérifié LOCALEMENT (signature HS256 avec SUPABASE_JWT_SECRET), pas via un
// appel réseau à Supabase Auth — chaque requête gagne l'aller-retour réseau qu'elle payait avant.
// Si la variable n'est pas configurée, on retombe sur l'ancienne vérification réseau (plus lente
// mais toujours correcte) pour ne rien casser tant qu'elle n'a pas été ajoutée sur Vercel.
export async function getUserId(req) {
  const authHeader = req.headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (bearerToken) {
    if (process.env.SUPABASE_JWT_SECRET) {
      try {
        const payload = jwt.verify(bearerToken, process.env.SUPABASE_JWT_SECRET, { algorithms: ["HS256"] });
        if (payload?.sub) return payload.sub;
      } catch (e) {
        // Jeton invalide ou expiré : pas authentifié, on continue vers la clé API ci-dessous.
      }
    } else {
      const { data, error } = await supabase.auth.getUser(bearerToken);
      if (!error && data.user) return data.user.id;
    }
  }

  const apiKey = req.headers["x-api-key"];
  if (apiKey) {
    const { data } = await supabase.from("api_keys").select("id, user_id").eq("token_hash", hashToken(apiKey)).maybeSingle();
    if (data) {
      supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id).then(() => {});
      return data.user_id;
    }
  }

  return null;
}
