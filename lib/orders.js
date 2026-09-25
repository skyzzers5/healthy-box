import { upcomingDeliveries, parseISODate, toISODate, isoWeekday } from "@/lib/delivery";

/**
 * Nombre de livraisons créées à l'avance. Assez pour que le client puisse
 * s'organiser, pas trop pour ne pas encombrer la base.
 */
export const HORIZON_LIVRAISONS = 4;

/**
 * Crée les livraisons à venir d'un abonnement actif, si elles n'existent pas.
 *
 * Idempotent : la contrainte d'unicité (subscription_id, delivery_date) fait
 * que relancer cette fonction ne crée jamais de doublon. On peut donc l'appeler
 * à chaque affichage de l'espace client sans précaution particulière.
 *
 * Les livraisons héritent de la sélection de recettes de l'abonnement — c'est
 * ce qui fait la reconduction automatique d'une semaine sur l'autre.
 *
 * @param {object} admin        client Supabase avec la clé service_role
 * @param {object} subscription l'abonnement, avec first_delivery_date et recipe_ids
 */
export async function ensureUpcomingOrders(admin, subscription) {
  if (!subscription || subscription.status !== "active") return;
  if (!subscription.first_delivery_date) return;

  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);

  // Point de départ : la première date encore à venir sur le rythme hebdomadaire.
  let curseur = parseISODate(subscription.first_delivery_date);
  while (curseur < aujourdhui) {
    curseur.setDate(curseur.getDate() + 7);
  }

  const dates = upcomingDeliveries(toISODate(curseur), HORIZON_LIVRAISONS);

  // Ce qui existe déjà, y compris les livraisons déplacées ou sautées :
  // on ne recrée pas une date qu'on vient de libérer par un report.
  const { data: existantes } = await admin
    .from("orders")
    .select("delivery_date, rescheduled_from")
    .eq("subscription_id", subscription.id)
    .gte("delivery_date", toISODate(aujourdhui));

  const dejaPresentes = new Set();
  for (const o of existantes ?? []) {
    dejaPresentes.add(o.delivery_date);
    // une livraison déplacée libère sa date d'origine : il ne faut pas la
    // recréer, sinon le report serait annulé au rechargement de la page
    if (o.rescheduled_from) dejaPresentes.add(o.rescheduled_from);
  }

  const aCreer = dates
    .filter((date) => !dejaPresentes.has(date))
    .map((date) => ({
      subscription_id: subscription.id,
      user_id: subscription.user_id,
      delivery_date: date,
      recipe_ids: subscription.recipe_ids ?? [],
      status: "scheduled",
    }));

  if (aCreer.length === 0) return;

  // onConflict : si deux onglets chargent la page en même temps, la contrainte
  // d'unicité joue et on ignore simplement les doublons.
  await admin.from("orders").upsert(aCreer, {
    onConflict: "subscription_id,delivery_date",
    ignoreDuplicates: true,
  });
}

/** Le jour de la semaine d'une date, au format ISO (1 = lundi). */
export function weekdayOf(isoDate) {
  return isoWeekday(parseISODate(isoDate));
}
