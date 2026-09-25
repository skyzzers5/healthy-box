// Calcul des jours et dates de livraison.
//
// Principe : un abonnement est livré un JOUR RÉCURRENT (tous les mardis, par
// exemple), pas à une date isolée. La personne choisit son jour habituel, puis
// la date de sa toute première livraison. Les suivantes se déduisent.

const DAY_LABELS = [
  "", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche",
];

/**
 * Créneaux de livraison d'une zone.
 *
 * Ils sont générés à partir de slot_start, slot_end et slot_interval_minutes.
 * slot_end est l'heure de DÉBUT du dernier créneau : une zone réglée de 11:00
 * à 18:30 propose donc un dernier passage entre 18h30 et 19h00.
 */
export function generateTimeSlots(zone = {}) {
  const debut = toMinutes(zone.slot_start ?? "11:00");
  const fin = toMinutes(zone.slot_end ?? "18:00");
  const pas = Number(zone.slot_interval_minutes) || 30;

  const creneaux = [];
  for (let m = debut; m <= fin; m += pas) {
    creneaux.push(fromMinutes(m));
  }
  return creneaux;
}

function toMinutes(heure) {
  const [h, m] = String(heure).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function fromMinutes(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "14:30" → "14h30" */
export function formatHeure(heure) {
  return String(heure).replace(":", "h");
}

/** "14:30" → "14h30 – 15h00", avec l'heure de fin du créneau. */
export function formatCreneau(heure, zone = {}) {
  const pas = Number(zone.slot_interval_minutes) || 30;
  const fin = fromMinutes(toMinutes(heure) + pas);
  return `${formatHeure(heure)} – ${formatHeure(fin)}`;
}

/** Le créneau demandé existe-t-il vraiment sur cette zone ? */
export function isValidSlot(heure, zone = {}) {
  return generateTimeSlots(zone).includes(heure);
}

/** Date JS (0=dimanche) vers norme ISO (1=lundi … 7=dimanche). */
export function isoWeekday(date) {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatLongDate(isoDate) {
  return parseISODate(isoDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatShortDate(isoDate) {
  return parseISODate(isoDate).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
}

/** "mardi", ou "mardi, jeudi et samedi" pour une liste. */
export function dayLabel(isoDay) {
  return DAY_LABELS[isoDay] ?? "";
}

export function dayLabels(isoDays) {
  const labels = (isoDays ?? []).map(dayLabel);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} et ${labels[labels.length - 1]}`;
}

/** Normalise un code postal saisi : espaces retirés, 5 chiffres attendus. */
export function normalizePostalCode(value) {
  return String(value ?? "").replace(/\s/g, "").slice(0, 5);
}

export function isValidPostalCode(value) {
  return /^\d{5}$/.test(normalizePostalCode(value));
}

/** Un jour ouvré : du lundi au vendredi. */
export function isWorkingDay(date) {
  const d = date.getDay();
  return d !== 0 && d !== 6;
}

/** Décale d'un nombre de jours OUVRÉS (négatif pour reculer). */
export function shiftWorkingDays(date, count) {
  const result = new Date(date);
  const step = count < 0 ? -1 : 1;
  let restant = Math.abs(count);
  while (restant > 0) {
    result.setDate(result.getDate() + step);
    if (isWorkingDay(result)) restant--;
  }
  return result;
}

/**
 * Date limite pour commander en vue d'une livraison donnée.
 *
 * Le délai est compté en JOURS OUVRÉS : on ne prépare pas les box le week-end.
 * Exemple : livraison mardi, leadTimeDays = 3 → lundi, vendredi, jeudi, donc
 *           date limite le jeudi précédent à l'heure de coupure.
 *
 * Minimum 2 jours ouvrés : jamais de livraison le jour même ni le lendemain,
 * il faut le temps de commander les ingrédients et de préparer les box.
 */
export const MIN_LEAD_TIME_WORKING_DAYS = 2;

export function orderDeadline(deliveryISODate, { leadTimeDays = 3, cutoffTime = "20:00" } = {}) {
  const jours = Math.max(MIN_LEAD_TIME_WORKING_DAYS, Number(leadTimeDays) || 3);
  const deadline = shiftWorkingDays(parseISODate(deliveryISODate), -jours);
  const [h, m] = String(cutoffTime).split(":").map(Number);
  deadline.setHours(Number.isFinite(h) ? h : 20, Number.isFinite(m) ? m : 0, 0, 0);
  return deadline;
}

export function formatDeadline(deliveryISODate, options) {
  const deadline = orderDeadline(deliveryISODate, options);
  const jour = deadline.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const heure = deadline.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${jour} à ${heure}`;
}

/**
 * Les prochaines dates possibles pour un jour de la semaine donné.
 * Une date n'est proposée que si sa date limite de commande n'est pas dépassée.
 *
 * @param {number} weekday  1 = lundi … 7 = dimanche
 * @param {object} zone     { lead_time_days, cutoff_time }
 * @param {number} count    nombre de dates à proposer (3 par défaut)
 */
export function nextDeliveryDates(weekday, zone = {}, count = 3) {
  const leadTimeDays = zone.lead_time_days ?? 3;
  const cutoffTime = zone.cutoff_time ?? "20:00";
  const now = new Date();

  const dates = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // On explore 10 semaines au maximum, largement suffisant.
  for (let i = 0; i < 70 && dates.length < count; i++) {
    cursor.setDate(cursor.getDate() + 1);
    if (isoWeekday(cursor) !== weekday) continue;

    const iso = toISODate(cursor);
    if (orderDeadline(iso, { leadTimeDays, cutoffTime }) > now) {
      dates.push(iso);
    }
  }
  return dates;
}

/**
 * Vérification serveur : cette première livraison est-elle réellement possible ?
 * Utilisée avant de créer la session de paiement — ne jamais se fier au
 * navigateur, une date peut avoir expiré pendant que la page était ouverte.
 */
export function isDeliverable(isoDate, weekday, zone = {}) {
  if (!isoDate || !weekday) return false;
  if (isoWeekday(parseISODate(isoDate)) !== weekday) return false;
  return nextDeliveryDates(weekday, zone, 6).includes(isoDate);
}

/**
 * Les livraisons suivantes d'un abonnement hebdomadaire.
 * On part de la première date et on avance de semaine en semaine.
 */
export function upcomingDeliveries(firstISODate, count = 4) {
  const dates = [];
  const cursor = parseISODate(firstISODate);
  for (let i = 0; i < count; i++) {
    dates.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return dates;
}

/**
 * Toutes les dates livrables d'une zone, tous jours desservis confondus.
 * Sert à proposer un report : on peut déplacer une livraison vers n'importe
 * quel jour de la tournée, pas seulement son jour habituel.
 */
export function deliverableDatesForZone(zone = {}, { weeks = 6 } = {}) {
  const jours = zone.allowed_days ?? [];
  const dates = [];
  for (const jour of jours) {
    dates.push(...nextDeliveryDates(jour, zone, weeks));
  }
  return [...new Set(dates)].sort();
}

/** Une livraison est modifiable tant que sa date limite n'est pas passée. */
export function isModifiable(deliveryISODate, zone = {}) {
  return orderDeadline(deliveryISODate, {
    leadTimeDays: zone.lead_time_days,
    cutoffTime: zone.cutoff_time,
  }) > new Date();
}
