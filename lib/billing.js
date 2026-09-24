import { supabase, resolveId, ensureCategory } from "./db";
import { TIER_LIMITS } from "./constants";

export async function getUserIdByStripeCustomer(customerId) {
  const { data, error } = await supabase.from("user_plans").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.user_id || null;
}

// Le compte "par défaut" du formulaire n'existe que côté navigateur (localStorage) — invisible
// depuis un webhook serveur. On retombe sur le plus ancien compte actif de l'utilisateur, qui
// correspond à "Compte courant" pour la quasi-totalité des cas (le tout premier compte créé).
async function getOldestAccountName(userId) {
  const { data, error } = await supabase.from("accounts").select("name").eq("user_id", userId).eq("archived", false).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.name || null;
}

// Crée ou met à jour la ligne représentant l'abonnement à Finelio lui-même dans le suivi des
// abonnements récurrents de l'utilisateur — pour qu'il apparaisse comme une dépense automatique,
// exactement comme Netflix ou n'importe quel autre abonnement suivi dans l'app.
export async function upsertAppSubscription(userId, tier) {
  const amount = TIER_LIMITS[tier]?.price;
  if (!amount) return; // "amateur" n'a pas de coût, rien à suivre
  const accountName = await getOldestAccountName(userId);
  if (!accountName) return; // pas encore de compte — cas limite improbable, on ignore proprement

  const category_id = await ensureCategory(userId, "Abonnements");
  const account_id = await resolveId("accounts", accountName, userId);
  const title = `Finelio (${TIER_LIMITS[tier].label})`;
  const billingDay = Math.min(28, new Date().getDate());

  // Cherche aussi l'ancien nom "Cap Finances" : une ligne créée avant le renommage doit être
  // retrouvée et mise à jour vers le nouveau nom, pas dupliquée.
  const { data: existing, error: findErr } = await supabase.from("subscriptions").select("id").eq("user_id", userId).or("title.ilike.Cap Finances%,title.ilike.Finelio%").maybeSingle();
  if (findErr) throw new Error(findErr.message);

  if (existing) {
    const { error } = await supabase.from("subscriptions").update({ title, amount, category_id, account_id, active: true }).eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("subscriptions").insert({ user_id: userId, title, amount, category_id, account_id, payment_method: "Carte bancaire", billing_day: billingDay, active: true });
    if (error) throw new Error(error.message);
  }
}

// Sur annulation : désactive la ligne (n'en génère plus) sans supprimer l'historique déjà créé —
// même logique que désactiver n'importe quel autre abonnement dans l'app.
export async function deactivateAppSubscription(userId) {
  const { error } = await supabase.from("subscriptions").update({ active: false }).eq("user_id", userId).or("title.ilike.Cap Finances%,title.ilike.Finelio%");
  if (error) throw new Error(error.message);
}

export async function getStripeSubscriptionId(userId) {
  const { data, error } = await supabase.from("user_plans").select("stripe_subscription_id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.stripe_subscription_id || null;
}

export async function getUserPlan(userId) {
  const { data, error } = await supabase.from("user_plans").select("tier, stripe_subscription_status, cancel_at_period_end, current_period_end, onboarding_seen").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  // Si la ligne n'existe pas encore (compte créé avant cette fonctionnalité, migration pas encore
  // passée dessus, ou tout autre cas limite) : "amateur" par défaut plutôt que de faire planter la
  // requête — jamais bloquant, jamais une erreur 500 juste parce que le palier est inconnu.
  const tier = data?.tier || "amateur";
  return { tier, limits: TIER_LIMITS[tier], stripeStatus: data?.stripe_subscription_status || null, cancelAtPeriodEnd: data?.cancel_at_period_end || false, currentPeriodEnd: data?.current_period_end || null, onboardingSeen: data?.onboarding_seen || false };
}

// Source de vérité pour "l'utilisateur a déjà vu la visite guidée + le questionnaire" — côté
// serveur, pour ne pas dépendre d'un localStorage que Safari peut effacer entre deux sessions PWA.
export async function markOnboardingSeen(userId) {
  const { error } = await supabase.from("user_plans").update({ onboarding_seen: true }).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// Appelée uniquement par le webhook Stripe (checkout.session.completed) — associe le client
// Stripe qui vient de payer à l'utilisateur qui a initié le paiement (via client_reference_id).
export async function setUserPlanFromCheckout(userId, tier, customerId, subscriptionId, status, currentPeriodEnd) {
  const { error } = await supabase.from("user_plans").update({
    tier, stripe_customer_id: customerId, stripe_subscription_id: subscriptionId,
    stripe_subscription_status: status, cancel_at_period_end: false, current_period_end: currentPeriodEnd, updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// Appelée par le webhook pour les événements suivants (renouvellement, changement de statut,
// annulation) — on retrouve l'utilisateur par son identifiant client Stripe, pas par userId,
// puisque ces événements ne portent pas toujours les métadonnées d'origine.
export async function updatePlanByStripeCustomer(customerId, patch) {
  const { error } = await supabase.from("user_plans").update({ ...patch, updated_at: new Date().toISOString() }).eq("stripe_customer_id", customerId);
  if (error) throw new Error(error.message);
}

export async function getStripeCustomerId(userId) {
  const { data, error } = await supabase.from("user_plans").select("stripe_customer_id").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.stripe_customer_id || null;
}
