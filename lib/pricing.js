// Tarification partagée entre le client et le serveur.
// IMPORTANT : le serveur recalcule toujours le prix avant de créer la
// session Stripe. Ne jamais faire confiance au montant envoyé par le
// navigateur, sinon n'importe qui peut s'abonner à 0,01 €.

// ---------------------------------------------------------------------
// Grille tarifaire
// ---------------------------------------------------------------------
export const PRICING = {
  // prix d'un repas, par personne
  mealPrice: 9,
  // frais de livraison, facturés à chaque livraison
  deliveryFee: 3,
  // consigne des contenants : facturée UNE SEULE FOIS, à la première
  // commande. Les semaines suivantes, les box vides sont échangées.
  deposit: 2,
};

export const BOX_TYPES = {
  diabete: {
    label: "Box diabète",
    baseline: "Des recettes à index glycémique maîtrisé, sans renoncer au goût.",
    image: "/images/box-diabete.jpg",
    thumbnail: "/images/box-diabete-vignette.jpg",
    // Alternative textuelle : décrit ce que montre réellement la photo.
    imageAlt:
      "Visuel « IG bas » : indice glycémique bas, charge glycémique maîtrisée, sur fond de mer et d'oliviers",
    points: [
      "Index glycémique indiqué sur chaque recette",
      "Ingrédients pré-portionnés, zéro gaspillage",
      "Fiche recette pas à pas dans chaque box",
      "Recettes relues par une naturopathe",
    ],
  },
  antiinflam: {
    label: "Box anti-inflammatoire",
    baseline: "Oméga-3, curcuma et légumes verts, dans des plats du quotidien.",
    image: "/images/box-antiinflam.jpg",
    thumbnail: "/images/box-antiinflam-vignette.jpg",
    imageAlt:
      "Visuel « Alimentation méditerranéenne » : ingrédients anti-inflammatoires, sur fond de mer et d'oliviers",
    points: [
      "Riche en oméga-3 et en polyphénols",
      "Ingrédients pré-portionnés, zéro gaspillage",
      "Fiche recette pas à pas dans chaque box",
      "Recettes relues par une naturopathe",
    ],
  },
};

// Durées d'engagement. Le prix est identique quelle que soit la durée :
// il n'y a plus de remise liée à l'engagement.
export const PLANS = {
  unite: { label: "À l'unité", months: 0 },
  m3: { label: "3 mois", months: 3 },
  m6: { label: "6 mois", months: 6 },
  m12: { label: "12 mois", months: 12 },
};

export const LIMITS = {
  people: { min: 1, max: 8 },
  meals: { min: 2, max: 7 },
};

/** Valide une configuration. Renvoie { ok } ou { ok:false, error }. */
export function validateConfig({ boxCategory, plan, peopleCount, mealsPerWeek }) {
  if (!BOX_TYPES[boxCategory]) return { ok: false, error: "Type de box inconnu." };
  if (!PLANS[plan]) return { ok: false, error: "Durée d'engagement inconnue." };

  const people = Number(peopleCount);
  const meals = Number(mealsPerWeek);

  if (!Number.isInteger(people) || people < LIMITS.people.min || people > LIMITS.people.max) {
    return { ok: false, error: "Nombre de personnes invalide." };
  }
  if (!Number.isInteger(meals) || meals < LIMITS.meals.min || meals > LIMITS.meals.max) {
    return { ok: false, error: "Nombre de repas invalide." };
  }
  return { ok: true };
}

/** Prix d'un repas, par personne. */
export function mealPrice() {
  return PRICING.mealPrice;
}

/** Coût des repas seuls, hors livraison et hors consigne. */
export function mealsSubtotal({ peopleCount, mealsPerWeek }) {
  return PRICING.mealPrice * Number(mealsPerWeek) * Number(peopleCount);
}

/**
 * Montant prélevé chaque semaine : repas + frais de livraison.
 * La consigne n'en fait PAS partie : elle n'est due qu'une fois.
 */
export function weeklyPrice({ peopleCount, mealsPerWeek }) {
  return mealsSubtotal({ peopleCount, mealsPerWeek }) + PRICING.deliveryFee;
}

/**
 * Montant du tout premier prélèvement : la semaine, plus la consigne.
 * `depositAlreadyPaid` permet de ne pas la refacturer à quelqu'un qui a
 * déjà des contenants (réabonnement après une annulation, par exemple).
 */
export function firstPaymentTotal({ peopleCount, mealsPerWeek, depositAlreadyPaid = false }) {
  const semaine = weeklyPrice({ peopleCount, mealsPerWeek });
  return depositAlreadyPaid ? semaine : semaine + PRICING.deposit;
}

/** Détail ligne à ligne, pour le récapitulatif. */
export function priceBreakdown({ peopleCount, mealsPerWeek, depositAlreadyPaid = false }) {
  return {
    meals: {
      label: `${mealsPerWeek} repas × ${peopleCount} personne${peopleCount > 1 ? "s" : ""}`,
      amount: mealsSubtotal({ peopleCount, mealsPerWeek }),
    },
    delivery: { label: "Livraison", amount: PRICING.deliveryFee },
    deposit: depositAlreadyPaid
      ? null
      : { label: "Consigne des contenants (une seule fois)", amount: PRICING.deposit },
    weekly: weeklyPrice({ peopleCount, mealsPerWeek }),
    firstPayment: firstPaymentTotal({ peopleCount, mealsPerWeek, depositAlreadyPaid }),
  };
}

/** Montants en centimes, pour Stripe. */
export function weeklyPriceInCents(config) {
  return Math.round(weeklyPrice(config) * 100);
}

export function depositInCents() {
  return Math.round(PRICING.deposit * 100);
}

/** Prix affiché en "à partir de" : le prix d'un repas. */
export function lowestMealPrice() {
  return PRICING.mealPrice;
}

export function formatEuros(value) {
  // Garde-fou : une valeur manquante affiche un tiret au lieu de faire
  // planter toute la page. C'est arrivé quand basePrice a été retiré des
  // box sans nettoyer tous les appels.
  // null et "" seraient convertis en 0 par Number() : un prix inconnu
  // n'est pas un prix nul, on affiche un tiret dans les deux cas.
  if (value === null || value === undefined || value === "") return "—";
  const nombre = Number(value);
  if (!Number.isFinite(nombre)) return "—";

  return nombre.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}
