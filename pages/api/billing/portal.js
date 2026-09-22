import Stripe from "stripe";
import { getUserId } from "../../../lib/db";
import { getStripeCustomerId } from "../../../lib/billing";

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Non authentifié." });
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end(); }
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "Paiement non configuré (STRIPE_SECRET_KEY manquante)." });

  try {
    const customerId = await getStripeCustomerId(userId);
    if (!customerId) return res.status(400).json({ error: "Aucun abonnement actif à gérer." });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${origin}/` });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
