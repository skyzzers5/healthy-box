import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  validateConfig,
  weeklyPriceInCents,
  depositInCents,
  PRICING,
  BOX_TYPES,
  PLANS,
} from "@/lib/pricing";
import {
  isDeliverable,
  isValidPostalCode,
  normalizePostalCode,
  dayLabel,
  isValidSlot,
  generateTimeSlots,
  formatCreneau,
} from "@/lib/delivery";

export async function POST(request) {
  try {
    // 1. L'utilisateur doit être connecté.
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
    }

    const body = await request.json();
    const {
      boxCategory, plan, peopleCount, mealsPerWeek,
      postalCode, street, notes, weekday, slot, firstDate, recipeIds,
      contactPhone,
    } = body;

    // 2. On revalide TOUT côté serveur. Le navigateur n'envoie jamais de prix :
    //    on le recalcule ici à partir de la configuration.
    const check = validateConfig({ boxCategory, plan, peopleCount, mealsPerWeek });
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const cp = normalizePostalCode(postalCode);
    if (!isValidPostalCode(cp)) {
      return NextResponse.json({ error: "Code postal invalide." }, { status: 400 });
    }
    if (!street || !String(street).trim()) {
      return NextResponse.json({ error: "Adresse de livraison manquante." }, { status: 400 });
    }

    // L'email n'est plus demandé dans le formulaire : on prend celui du
    // compte, déjà vérifié à l'inscription.
    const email = String(user.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: "Votre compte n'a pas d'adresse email valide." },
        { status: 400 }
      );
    }

    // Numéro français : 10 chiffres, ou +33 suivi de 9 chiffres.
    const telephone = String(contactPhone ?? "").replace(/[\s.\-]/g, "");
    if (!/^(?:0\d{9}|\+33\d{9})$/.test(telephone)) {
      return NextResponse.json(
        { error: "Numéro de téléphone invalide. Format attendu : 06 12 34 56 78." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 3. Le code postal doit correspondre à une tournée active.
    const { data: entreePostale } = await admin
      .from("delivery_postal_codes")
      .select("label, delivery_zones(id, city, allowed_days, slot_start, slot_end, slot_interval_minutes, lead_time_days, cutoff_time, active)")
      .eq("postal_code", cp)
      .maybeSingle();

    const zone = entreePostale?.delivery_zones?.active ? entreePostale.delivery_zones : null;

    if (!zone) {
      return NextResponse.json(
        { error: "Nous ne livrons pas encore à ce code postal." },
        { status: 400 }
      );
    }

    // 4. Le jour choisi doit faire partie de la tournée.
    const jour = Number(weekday);
    if (!zone.allowed_days.includes(jour)) {
      return NextResponse.json(
        { error: `${zone.city} n'est pas livré le ${dayLabel(jour)}.` },
        { status: 400 }
      );
    }

    // 5. Le créneau doit exister sur cette zone : les heures proposées
    //    diffèrent d'une tournée à l'autre (Ajaccio va jusqu'à 18h30).
    const creneau = isValidSlot(slot, zone) ? slot : generateTimeSlots(zone)[0];
    if (!creneau) {
      return NextResponse.json(
        { error: "Aucun créneau de livraison disponible sur cette zone." },
        { status: 400 }
      );
    }

    // 6. La date de première livraison doit encore être commandable.
    //    Elle a pu expirer pendant que la page était ouverte.
    if (!isDeliverable(firstDate, jour, zone)) {
      return NextResponse.json(
        { error: "Cette date de livraison n'est plus disponible. Choisissez-en une autre." },
        { status: 400 }
      );
    }

    // 6 bis. La sélection de recettes doit être complète et cohérente.
    //        Sans cette vérification, on pourrait envoyer 20 plats pour le
    //        prix de 3, ou des recettes d'une autre box.
    const selection = Array.isArray(recipeIds) ? recipeIds.map(Number) : [];

    if (selection.length !== Number(mealsPerWeek)) {
      return NextResponse.json(
        { error: `Votre box doit contenir exactement ${mealsPerWeek} plats.` },
        { status: 400 }
      );
    }

    // Chaque recette doit exister, être publiée, et posséder une variante
    // d'ingrédients pour la box choisie.
    const identifiantsUniques = [...new Set(selection)];
    const { data: variantesValides } = await admin
      .from("recipe_variants")
      .select("recipe_id, recipes!inner(id, published)")
      .in("recipe_id", identifiantsUniques)
      .eq("category", boxCategory)
      .eq("recipes.published", true);

    if ((variantesValides?.length ?? 0) !== identifiantsUniques.length) {
      return NextResponse.json(
        { error: "Une des recettes choisies n'est pas disponible dans cette box." },
        { status: 400 }
      );
    }

    // 6 ter. La consigne n'est due qu'une fois. On regarde si cette personne
    //        l'a déjà réglée lors d'un abonnement précédent.
    const { data: abonnementsPasses } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("deposit_paid", true)
      .limit(1);

    const consigneDejaPayee = (abonnementsPasses?.length ?? 0) > 0;

    // 7. Enregistrement de l'adresse.
    const { data: address, error: addrError } = await admin
      .from("delivery_addresses")
      .insert({
        user_id: user.id,
        zone_id: zone.id,
        street: String(street).trim(),
        postal_code: cp,
        city: entreePostale.label,
        notes: notes ? String(notes).trim() : null,
      })
      .select("id")
      .single();
    if (addrError) throw addrError;

    // 8. Abonnement en attente : il ne deviendra actif que via le webhook.
    const amountInCents = weeklyPriceInCents({ boxCategory, plan, peopleCount, mealsPerWeek });

    const commitmentMonths = PLANS[plan].months;
    const commitmentEndsAt =
      commitmentMonths > 0
        ? new Date(new Date().setMonth(new Date().getMonth() + commitmentMonths)).toISOString()
        : null;

    const { data: subscription, error: subError } = await admin
      .from("subscriptions")
      .insert({
        user_id: user.id,
        box_category: boxCategory,
        plan,
        people_count: peopleCount,
        meals_per_week: mealsPerWeek,
        address_id: address.id,
        delivery_weekday: jour,
        delivery_slot: creneau,
        first_delivery_date: firstDate,
        recipe_ids: selection,
        contact_email: email,
        contact_phone: telephone,
        deposit_amount_cents: consigneDejaPayee ? 0 : depositInCents(),
        status: "incomplete",
        commitment_ends_at: commitmentEndsAt,
      })
      .select("id")
      .single();
    if (subError) throw subError;

    // 9. Session Stripe. Le prix est construit ici, jamais reçu du client.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      // Le prélèvement hebdomadaire : repas + frais de livraison.
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amountInCents,
            recurring: { interval: "week" },
            product_data: {
              // BOX_TYPES[].label vaut déjà "Box diabète" / "Box anti-inflammatoire"
              name: `Healthy Box — ${BOX_TYPES[boxCategory].label}`,
              description: `${mealsPerWeek} plats par semaine pour ${peopleCount} personne(s), livraison comprise — tous les ${dayLabel(jour)}s, ${formatCreneau(creneau, zone)}`,
            },
          },
        },
      ],
      subscription_data: {
        // La consigne est ajoutée à la PREMIÈRE facture uniquement.
        // add_invoice_items ne se répète pas aux échéances suivantes : c'est
        // exactement ce qu'il faut pour un montant dû une seule fois.
        ...(consigneDejaPayee
          ? {}
          : {
              add_invoice_items: [
                {
                  quantity: 1,
                  price_data: {
                    currency: "eur",
                    unit_amount: depositInCents(),
                    product_data: {
                      name: "Consigne des contenants",
                      description:
                        "Réglée une seule fois. Les box vides sont échangées à chaque livraison suivante.",
                    },
                  },
                },
              ],
            }),
        metadata: {
          supabase_subscription_id: String(subscription.id),
          supabase_user_id: user.id,
        },
      },
      metadata: {
        supabase_subscription_id: String(subscription.id),
        supabase_user_id: user.id,
        first_delivery_date: firstDate,
      },
      success_url: `${siteUrl}/compte?paiement=ok`,
      cancel_url: `${siteUrl}/formules?paiement=annule`,
      locale: "fr",
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Erreur checkout :", error);
    return NextResponse.json(
      { error: "Impossible de démarrer le paiement. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}
