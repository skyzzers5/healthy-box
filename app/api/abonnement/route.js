import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const ACTIONS = ["suspendre", "reactiver", "annuler"];

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
    }

    const { action, subscriptionId } = await request.json();
    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }

    const admin = createAdminClient();

    // On vérifie que l'abonnement appartient bien à la personne connectée.
    // Sans ce contrôle, quelqu'un pourrait annuler l'abonnement d'un autre
    // en devinant un identifiant.
    const { data: sub } = await admin
      .from("subscriptions")
      .select("id, user_id, stripe_subscription_id, status, commitment_ends_at")
      .eq("id", subscriptionId)
      .single();

    if (!sub || sub.user_id !== user.id) {
      return NextResponse.json({ error: "Abonnement introuvable." }, { status: 404 });
    }
    if (!sub.stripe_subscription_id) {
      return NextResponse.json({ error: "Abonnement non finalisé." }, { status: 400 });
    }

    if (action === "suspendre") {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        pause_collection: { behavior: "void" },
      });
    }

    if (action === "reactiver") {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        pause_collection: "",
      });
    }

    if (action === "annuler") {
      // Engagement en cours : l'annulation prend effet à la fin de la période
      // d'engagement, pas immédiatement. À vérifier avec vos CGV.
      const stillCommitted =
        sub.commitment_ends_at && new Date(sub.commitment_ends_at) > new Date();

      if (stillCommitted) {
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
          cancel_at: Math.floor(new Date(sub.commitment_ends_at).getTime() / 1000),
        });
        return NextResponse.json({
          ok: true,
          message:
            "Annulation enregistrée. Vos livraisons continuent jusqu'à la fin de votre période d'engagement.",
        });
      }

      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    }

    // Le statut définitif est écrit par le webhook, seule source de vérité.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur gestion abonnement :", error);
    return NextResponse.json({ error: "Action impossible pour le moment." }, { status: 500 });
  }
}
