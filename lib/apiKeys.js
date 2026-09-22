import crypto from "crypto";
import { supabase, hashToken } from "./db";

// Génère une clé d'API pour `userId` (utilisée par les Raccourcis iOS, qui ne peuvent pas faire
// de connexion par mot de passe). Le token brut n'est renvoyé qu'ici, à la création — il n'est
// jamais récupérable ensuite, seule son empreinte est stockée.
export async function createApiKey(userId, label) {
  const raw = "eak_" + crypto.randomBytes(24).toString("base64url");
  const { error } = await supabase.from("api_keys").insert({ user_id: userId, label: label || null, token_hash: hashToken(raw) });
  if (error) throw new Error(error.message);
  return raw;
}

export async function listApiKeys(userId) {
  const { data, error } = await supabase.from("api_keys").select("id, label, created_at, last_used_at").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteApiKey(userId, id) {
  const { error } = await supabase.from("api_keys").delete().eq("id", id).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return true;
}
