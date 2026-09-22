import { supabase } from "./db";

// Supprime toutes les données de l'utilisateur puis son compte Supabase Auth. Fait explicitement
// table par table, dans l'ordre des dépendances, plutôt que de compter sur la suppression en
// cascade de Postgres — "Database error deleting user" est une erreur générique de l'API Auth qui
// ne précise jamais quelle contrainte bloque ; en supprimant nous-mêmes, une éventuelle erreur
// désigne clairement la table en cause. Irréversible.
export async function deleteAuthUser(userId) {
  const tablesInOrder = ["transactions", "subscriptions", "goals", "category_rules", "api_keys", "categories", "accounts", "user_plans"];
  for (const table of tablesInOrder) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`Échec de la suppression dans "${table}" : ${error.message}`);
  }
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  return true;
}
