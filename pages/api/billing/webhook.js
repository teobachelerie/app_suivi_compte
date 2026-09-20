import Stripe from "stripe";
import { setUserPlanFromCheckout, updatePlanByStripeCustomer } from "../../../lib/supabase";

// Le webhook a besoin du corps BRUT de la requête pour vérifier la signature Stripe — on désactive
// donc le parsing JSON automatique de Next.js pour cette route précise.
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const TIER_BY_PRICE = {
  [process.env.STRIPE_PRICE_CONFIRME]: "confirme",
  [process.env.STRIPE_PRICE_INVESTISSEUR]: "investisseur",
};

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end(); }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: "Webhook Stripe non configuré." });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const rawBody = await readRawBody(req);
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    // Signature invalide : requête non authentique (ou mauvais secret configuré) — rejetée sans
    // toucher à aucune donnée, plutôt que de risquer d'appliquer un changement non vérifié.
    return res.status(400).json({ error: `Signature webhook invalide : ${e.message}` });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        const tier = session.metadata?.tier;
        if (userId && tier) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await setUserPlanFromCheckout(
            userId, tier, session.customer, subscription.id, subscription.status,
            subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null
          );
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const tier = TIER_BY_PRICE[sub.items?.data?.[0]?.price?.id] || undefined;
        const patch = { stripe_subscription_status: sub.status, current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null };
        if (tier) patch.tier = tier; // changement de palier (upgrade/downgrade côté client via le portail Stripe)
        await updatePlanByStripeCustomer(sub.customer, patch);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        // Abonnement annulé/expiré : retour au palier gratuit, jamais de suppression de données.
        await updatePlanByStripeCustomer(sub.customer, { tier: "amateur", stripe_subscription_status: "canceled", current_period_end: null });
        break;
      }
      default:
        break; // Autres événements Stripe : ignorés volontairement, rien à faire pour eux ici.
    }
    return res.status(200).json({ received: true });
  } catch (e) {
    // On renvoie 500 pour que Stripe retente automatiquement cet événement plus tard plutôt que
    // de le considérer traité alors qu'une erreur a empêché la mise à jour.
    return res.status(500).json({ error: e.message });
  }
}
