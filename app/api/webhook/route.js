import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

// Le webhook doit lire le corps brut de la requête pour vérifier la signature.
export const dynamic = "force-dynamic";

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event;
  try {
    // Cette vérification est essentielle : sans elle, n'importe qui pourrait
    // appeler cette URL et activer un abonnement sans avoir payé.
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Signature webhook invalide :", error.message);
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      // Paiement initial réussi : on active l'abonnement.
      case "checkout.session.completed": {
        const session = event.data.object;
        const subId = session.metadata?.supabase_subscription_id;
        const userId = session.metadata?.supabase_user_id;
        const deliveryDate = session.metadata?.first_delivery_date;
        if (!subId) break;

        // On relit l'abonnement pour récupérer la sélection de recettes.
        const { data: abonnement } = await admin
          .from("subscriptions")
          .select("recipe_ids, deposit_amount_cents, contact_phone, promo_code_id")
          .eq("id", Number(subId))
          .single();

        await admin
          .from("subscriptions")
          .update({
            status: "active",
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // La consigne figurait sur cette première facture : elle est réglée.
            // Les échéances suivantes ne la refactureront pas.
            deposit_paid: (abonnement?.deposit_amount_cents ?? 0) > 0,
          })
          .eq("id", Number(subId));

        // Le compteur d'utilisations du code n'est incrémenté qu'ici :
        // un panier abandonné ne doit pas consommer le quota.
        if (abonnement?.promo_code_id) {
          await admin.rpc("increment_promo_usage", { promo_id: abonnement.promo_code_id });
        }

        // On garde le téléphone au profil, pour les commandes suivantes.
        if (userId && abonnement?.contact_phone) {
          await admin
            .from("profiles")
            .update({ phone: abonnement.contact_phone })
            .eq("id", userId);
        }

        // Première livraison programmée
        if (deliveryDate && userId) {
          await admin.from("orders").insert({
            subscription_id: Number(subId),
            user_id: userId,
            delivery_date: deliveryDate,
            recipe_ids: abonnement?.recipe_ids ?? [],
            status: "scheduled",
          });
        }
        break;
      }

      // Suspension, reprise ou annulation programmée côté Stripe.
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const paused = Boolean(sub.pause_collection);
        let status = "active";
        if (sub.status === "canceled") status = "cancelled";
        else if (paused) status = "suspended";
        else if (sub.status === "unpaid" || sub.status === "past_due") status = "suspended";

        await admin
          .from("subscriptions")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await admin
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", sub.id);
        break;
      }

      // Échec de prélèvement : on suspend pour ne pas préparer une box impayée.
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await admin
            .from("subscriptions")
            .update({ status: "suspended", updated_at: new Date().toISOString() })
            .eq("stripe_subscription_id", invoice.subscription);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erreur traitement webhook :", error);
    // On renvoie une erreur pour que Stripe réessaie l'événement.
    return NextResponse.json({ error: "Traitement échoué." }, { status: 500 });
  }
}
