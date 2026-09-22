import Stripe from "stripe";
import { getUserId } from "../../../lib/db";

const PRICE_BY_TIER = {
  confirme: process.env.STRIPE_PRICE_CONFIRME,
  investisseur: process.env.STRIPE_PRICE_INVESTISSEUR,
};

export default async function handler(req, res) {
  const userId = await getUserId(req);
  if (!userId) return res.status(401).json({ error: "Non authentifié." });
  if (req.method !== "POST") { res.setHeader("Allow", ["POST"]); return res.status(405).end(); }
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "Paiement non configuré (STRIPE_SECRET_KEY manquante)." });

  const { tier } = req.body || {};
  const priceId = PRICE_BY_TIER[tier];
  if (!priceId) return res.status(400).json({ error: "Palier invalide." });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = req.headers.origin || `https://${req.headers.host}`;

    // Un nouveau client Stripe est créé à chaque paiement si aucun n'existe déjà — le webhook
    // (checkout.session.completed) enregistre ensuite son identifiant dans user_plans.
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      metadata: { userId, tier },
      subscription_data: { metadata: { userId, tier } },
      success_url: `${origin}/?upgrade=success`,
      cancel_url: `${origin}/?upgrade=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
