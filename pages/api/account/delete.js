import Stripe from "stripe";
import { getUserId, getStripeSubscriptionId, deleteAuthUser } from "../../../lib/supabase";

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Non authentifié." });
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end(); }

  try {
    // Annule immédiatement tout abonnement Stripe actif — supprimer le compte ne doit jamais
    // laisser un prélèvement continuer de son côté après coup.
    const subscriptionId = await getStripeSubscriptionId(userId);
    if (subscriptionId && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
        await stripe.subscriptions.cancel(subscriptionId);
      } catch (e) {
        // Déjà annulé/inexistant côté Stripe : on continue quand même la suppression du compte,
        // ce n'est jamais bloquant pour lui.
      }
    }

    await deleteAuthUser(userId);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
