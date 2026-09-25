import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { BOX_TYPES, PLANS, weeklyPrice, priceBreakdown, formatEuros } from "@/lib/pricing";
import {
  formatLongDate,
  dayLabel,
  formatCreneau,
  deliverableDatesForZone,
  isModifiable,
  formatDeadline,
} from "@/lib/delivery";
import { ensureUpcomingOrders } from "@/lib/orders";
import GestionAbonnement from "@/components/GestionAbonnement";
import BoutonDeconnexion from "@/components/BoutonDeconnexion";
import ModifierLivraison from "@/components/ModifierLivraison";

export const metadata = { title: "Mon espace client — Healthy Box" };
export const dynamic = "force-dynamic";

const STATUS_LABELS = {
  active: { label: "Abonnement actif", className: "border-framboise bg-framboise-soft" },
  suspended: { label: "Abonnement suspendu", className: "border-amber-400 bg-amber-100" },
  cancelled: { label: "Abonnement annulé", className: "border-red-400 bg-red-50" },
  incomplete: { label: "Paiement non finalisé", className: "border-black/20 bg-black/5" },
};

export default async function ComptePage({ searchParams }) {
  // Next 16 : searchParams est une Promise.
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Le middleware protège déjà cette page, ceci est une seconde barrière.
  if (!user) redirect("/connexion?suite=/compte");

  // L'abonnement en cours, pour générer les livraisons à venir avant lecture.
  const { data: abonnementsExistants } = await supabase
    .from("subscriptions")
    .select("id, user_id, status, first_delivery_date, recipe_ids")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const abonnementActif = abonnementsExistants?.find((a) => a.status === "active");
  if (abonnementActif) {
    // Idempotent : aucune duplication si les livraisons existent déjà.
    await ensureUpcomingOrders(createAdminClient(), abonnementActif);
  }

  const [{ data: profile }, { data: subscriptions }, { data: orders }, { data: recipes }] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("subscriptions")
        .select("*, delivery_addresses(street, postal_code, delivery_zones(city, allowed_days, slot_start, slot_end, slot_interval_minutes, lead_time_days, cutoff_time))")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("id, delivery_date, status, recipe_ids, rescheduled_from")
        .eq("user_id", user.id)
        .gte("delivery_date", new Date().toISOString().slice(0, 10))
        .order("delivery_date")
        .limit(6),
      supabase
        .from("recipes")
        .select("id, slug, name, description, image, image_alt, prep_minutes, recipe_variants(category, ingredients, kcal, glycemic_index, highlight)")
        .eq("published", true)
        .order("position"),
    ]);

  const current = subscriptions?.find((s) => s.status !== "cancelled") ?? subscriptions?.[0] ?? null;

  // Dates vers lesquelles une livraison peut être déplacée (calculé une fois).
  const datesPossibles = current?.delivery_addresses?.delivery_zones
    ? deliverableDatesForZone(current.delivery_addresses.delivery_zones, { weeks: 6 })
    : [];
  const statusInfo = current ? STATUS_LABELS[current.status] : null;
  const justPaid = params?.paiement === "ok";

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <p className="eyebrow">Espace client</p>
      <h1 className="mb-6 font-bold text-5xl sm:text-6xl">
        Bonjour{profile?.full_name ? ` ${profile.full_name.split(" ")[0]}` : ""}
      </h1>

      {justPaid && (
        <p role="status" className="mb-8 rounded-xl border-2 border-framboise bg-framboise-soft px-4 py-3">
          Paiement confirmé. Votre abonnement s&apos;active dans quelques secondes —
          rafraîchissez la page si le statut n&apos;est pas encore à jour.
        </p>
      )}

      {statusInfo && (
        <p className={`mb-8 inline-block rounded-xl border-2 px-4 py-2.5 text-sm font-semibold ${statusInfo.className}`}>
          {statusInfo.label}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="carte p-6" aria-labelledby="abo">
            <h2 id="abo" className="mb-4 text-xl font-bold">Mon abonnement</h2>
            {!current ? (
              <>
                <p className="mb-3 text-sm text-ardoise/85">Vous n&apos;avez pas encore d&apos;abonnement.</p>
                <Link href="/formules" className="btn-outline text-sm">Composer ma box</Link>
              </>
            ) : (
              <dl className="m-0">
                <Row label="Formule" value={BOX_TYPES[current.box_category]?.label ?? current.box_category} />
                <Row label="Durée" value={PLANS[current.plan]?.label ?? current.plan} />
                <Row
                  label="Taille"
                  value={`${current.people_count} personne(s) · ${current.meals_per_week} repas par semaine`}
                />
                <Row
                  label="Prélèvement hebdomadaire"
                  value={`${formatEuros(
                    weeklyPrice({
                      peopleCount: current.people_count,
                      mealsPerWeek: current.meals_per_week,
                    })
                  )} (repas + livraison)`}
                />
                <Row
                  label="Consigne"
                  value={
                    current.deposit_paid
                      ? "réglée, non refacturée"
                      : "sera ajoutée au premier prélèvement"
                  }
                />
                {current.contact_phone && (
                  <Row label="Téléphone" value={current.contact_phone} />
                )}
                {current.contact_email && (
                  <Row label="Email" value={current.contact_email} />
                )}
                {current.delivery_addresses && (
                  <Row
                    label="Adresse"
                    value={`${current.delivery_addresses.street}, ${current.delivery_addresses.postal_code ?? ""} ${current.delivery_addresses.delivery_zones?.city ?? ""}`}
                  />
                )}
                {current.delivery_weekday && (
                  <Row
                    label="Livraison"
                    value={`tous les ${dayLabel(current.delivery_weekday)}s — ${formatCreneau(current.delivery_slot, current.delivery_addresses?.delivery_zones)}`}
                  />
                )}
                {current.commitment_ends_at && (
                  <Row
                    label="Engagement jusqu'au"
                    value={formatLongDate(current.commitment_ends_at.slice(0, 10))}
                  />
                )}
              </dl>
            )}
          </section>

          <section className="carte p-6" aria-labelledby="livraisons">
            <h2 id="livraisons" className="mb-4 text-xl font-bold">Prochaines livraisons</h2>
            {!orders || orders.length === 0 ? (
              <p className="text-sm text-ardoise/85">Aucune livraison programmée pour le moment.</p>
            ) : (
              <ul className="m-0 list-none space-y-6 p-0">
                {orders.map((order) => {
                  const plats = (order.recipe_ids ?? [])
                    .map((id) => (recipes ?? []).find((r) => r.id === id)?.name)
                    .filter(Boolean);

                  const zone = current?.delivery_addresses?.delivery_zones;
                  const modifiable =
                    Boolean(current) &&
                    order.status !== "shipped" &&
                    order.status !== "delivered" &&
                    isModifiable(order.delivery_date, zone ?? {});

                  return (
                    <li key={order.id} className="border-b border-black/10 pb-6 last:border-0 last:pb-0">
                      <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                        <span className="font-bold capitalize text-encre">
                          {formatLongDate(order.delivery_date)}
                        </span>
                        <span className={`font-semibold ${order.status === "skipped" ? "text-amber-700" : ""}`}>
                          {traduireStatutCommande(order.status)}
                        </span>
                      </div>

                      {order.rescheduled_from && (
                        <p className="mb-2 text-xs text-ardoise/75">
                          Déplacée depuis le {formatLongDate(order.rescheduled_from)}
                        </p>
                      )}

                      {order.status !== "skipped" &&
                        (plats.length > 0 ? (
                          <ul className="m-0 mb-3 list-disc pl-5 text-sm text-ardoise/85">
                            {plats.map((nom, i) => (
                              <li key={`${order.id}-${i}`}>{nom}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mb-3 text-sm text-ardoise/85">Aucun plat enregistré.</p>
                        ))}

                      {current && (
                        <ModifierLivraison
                          order={order}
                          recipes={recipes ?? []}
                          subscription={current}
                          zone={zone}
                          datesPossibles={datesPossibles}
                          modifiable={modifiable}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="carte p-6" aria-labelledby="rdv">
            <h2 id="rdv" className="mb-4 text-xl font-bold">Rendez-vous naturopathe</h2>
            <p className="mb-3 text-sm text-ardoise">
              Vos rendez-vous sont gérés par notre agenda en ligne. Vous
              retrouvez le lien de visio, le report et l&apos;annulation dans
              l&apos;email de confirmation que vous avez reçu.
            </p>
            <Link href="/rdv" className="btn-outline text-sm">Prendre rendez-vous</Link>
          </section>
        </div>

        <div className="space-y-6">
          {current && current.stripe_subscription_id && <GestionAbonnement subscription={current} />}
          <section className="carte p-6">
            <h2 className="sr-only">Compte</h2>
            <p className="mb-4 text-sm text-ardoise/85">Connecté avec {user.email}</p>
            <BoutonDeconnexion />
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/10 py-2.5 text-sm last:border-0">
      <dt className="text-ardoise/85">{label}</dt>
      <dd className="m-0 text-right font-semibold">{value}</dd>
    </div>
  );
}

function traduireStatutCommande(status) {
  return {
    scheduled: "Programmée",
    preparing: "En préparation",
    shipped: "Expédiée",
    delivered: "Livrée",
    skipped: "Sautée",
  }[status] ?? status;
}
