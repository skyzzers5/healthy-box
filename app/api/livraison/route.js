import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isModifiable, deliverableDatesForZone, formatLongDate } from "@/lib/delivery";

const ACTIONS = ["recettes", "date", "sauter", "reprendre"];

/**
 * Modification d'une livraison à venir : changer les plats, la déplacer,
 * la sauter, ou revenir sur un saut.
 *
 * Toute modification est refusée passé la date limite de commande : à ce
 * stade les ingrédients sont commandés et la box est en préparation.
 */
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
    }

    const { action, orderId, recipeIds, newDate } = await request.json();
    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
    }

    const admin = createAdminClient();

    // La livraison doit appartenir à la personne connectée.
    const { data: commande } = await admin
      .from("orders")
      .select(
        "id, user_id, delivery_date, status, subscription_id, rescheduled_from, " +
        "subscriptions(id, meals_per_week, box_category, delivery_addresses(delivery_zones(allowed_days, lead_time_days, cutoff_time)))"
      )
      .eq("id", orderId)
      .single();

    if (!commande || commande.user_id !== user.id) {
      return NextResponse.json({ error: "Livraison introuvable." }, { status: 404 });
    }

    const abonnement = commande.subscriptions;
    const zone = abonnement?.delivery_addresses?.delivery_zones ?? {};

    // Barrière commune : la date limite.
    if (!isModifiable(commande.delivery_date, zone)) {
      return NextResponse.json(
        {
          error:
            "La date limite est dépassée pour cette livraison : elle est déjà en préparation. Vos changements s'appliqueront à la suivante.",
        },
        { status: 409 }
      );
    }

    if (commande.status === "shipped" || commande.status === "delivered") {
      return NextResponse.json(
        { error: "Cette livraison est déjà partie." },
        { status: 409 }
      );
    }

    // ---------- Changer les plats ----------
    if (action === "recettes") {
      const selection = Array.isArray(recipeIds) ? recipeIds.map(Number) : [];

      if (selection.length !== abonnement.meals_per_week) {
        return NextResponse.json(
          { error: `Votre box doit contenir exactement ${abonnement.meals_per_week} plats.` },
          { status: 400 }
        );
      }

      const uniques = [...new Set(selection)];
      const { data: valides } = await admin
        .from("recipe_variants")
        .select("recipe_id, recipes!inner(id, published)")
        .in("recipe_id", uniques)
        .eq("category", abonnement.box_category)
        .eq("recipes.published", true);

      if ((valides?.length ?? 0) !== uniques.length) {
        return NextResponse.json(
          { error: "Une des recettes choisies n'est pas disponible dans cette box." },
          { status: 400 }
        );
      }

      // La nouvelle sélection vaut aussi pour les semaines suivantes.
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        admin
          .from("orders")
          .update({ recipe_ids: selection, updated_at: new Date().toISOString() })
          .eq("id", commande.id),
        admin
          .from("subscriptions")
          .update({ recipe_ids: selection, updated_at: new Date().toISOString() })
          .eq("id", commande.subscription_id),
      ]);
      if (e1 || e2) throw e1 || e2;

      return NextResponse.json({
        ok: true,
        message: "Vos plats ont été mis à jour, ici et pour les semaines suivantes.",
      });
    }

    // ---------- Déplacer la livraison ----------
    if (action === "date") {
      const datesPossibles = deliverableDatesForZone(zone, { weeks: 6 });

      if (!datesPossibles.includes(newDate)) {
        return NextResponse.json(
          { error: "Cette date n'est pas livrable dans votre zone, ou sa date limite est passée." },
          { status: 400 }
        );
      }

      if (newDate === commande.delivery_date) {
        return NextResponse.json({ ok: true, message: "Aucun changement." });
      }

      // Pas deux livraisons le même jour pour un même abonnement.
      const { data: collision } = await admin
        .from("orders")
        .select("id")
        .eq("subscription_id", commande.subscription_id)
        .eq("delivery_date", newDate)
        .maybeSingle();

      if (collision) {
        return NextResponse.json(
          { error: "Vous avez déjà une livraison prévue ce jour-là." },
          { status: 409 }
        );
      }

      const { error } = await admin
        .from("orders")
        .update({
          delivery_date: newDate,
          // on garde la trace de la date d'origine pour ne pas la recréer
          rescheduled_from: commande.rescheduled_from ?? commande.delivery_date,
          status: "scheduled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", commande.id);
      if (error) throw error;

      return NextResponse.json({
        ok: true,
        message: `Livraison déplacée au ${formatLongDate(newDate)}.`,
      });
    }

    // ---------- Sauter cette semaine ----------
    if (action === "sauter") {
      const { error } = await admin
        .from("orders")
        .update({ status: "skipped", updated_at: new Date().toISOString() })
        .eq("id", commande.id);
      if (error) throw error;

      return NextResponse.json({
        ok: true,
        message: "Cette livraison est sautée. Votre abonnement reprend la semaine suivante.",
      });
    }

    // ---------- Revenir sur un saut ----------
    if (action === "reprendre") {
      const { error } = await admin
        .from("orders")
        .update({ status: "scheduled", updated_at: new Date().toISOString() })
        .eq("id", commande.id);
      if (error) throw error;

      return NextResponse.json({ ok: true, message: "Livraison rétablie." });
    }

    return NextResponse.json({ error: "Action non traitée." }, { status: 400 });
  } catch (error) {
    console.error("Erreur modification livraison :", error);
    return NextResponse.json(
      { error: "Modification impossible pour le moment." },
      { status: 500 }
    );
  }
}
