import { createClient } from "@supabase/supabase-js";

// Client Supabase CÔTÉ NAVIGATEUR — utilisé uniquement pour l'authentification (inscription,
// connexion, déconnexion, session). Il n'accède à aucune table directement : toutes les
// données passent par nos routes /api/*, protégées par lib/supabase.js (clé service role,
// jamais exposée ici).
//
// La clé "anon" ci-dessous est faite pour être publique — elle est sans danger à exposer au
// navigateur, contrairement à la clé service role.
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
