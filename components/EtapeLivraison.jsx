"use client";

import { useMemo, useState } from "react";
import {
  generateTimeSlots,
  formatCreneau,
  dayLabel,
  dayLabels,
  formatDeadline,
  formatLongDate,
  formatShortDate,
  isValidPostalCode,
  nextDeliveryDates,
  normalizePostalCode,
} from "@/lib/delivery";

/**
 * Étape de livraison du configurateur.
 *
 * Le parcours : code postal → on trouve la tournée → choix du jour habituel
 * → choix de la date de première livraison → créneau → adresse.
 * Si le code postal n'est pas desservi, on propose la liste d'attente.
 */
export default function EtapeLivraison({ zones, valeur, onChange, onAnnonce }) {
  const [codePostal, setCodePostal] = useState(valeur.postalCode ?? "");
  const [recherche, setRecherche] = useState("idle"); // idle | introuvable | trouvee
  const [emailAttente, setEmailAttente] = useState("");
  const [statutAttente, setStatutAttente] = useState("idle");
  const [messageAttente, setMessageAttente] = useState("");

  const zone = valeur.zone;

  const joursPossibles = zone?.allowed_days ?? [];
  const creneaux = zone ? generateTimeSlots(zone) : [];

  const datesPossibles = useMemo(
    () => (zone && valeur.weekday ? nextDeliveryDates(valeur.weekday, zone, 3) : []),
    [zone, valeur.weekday]
  );

  function chercherZone(event) {
    event.preventDefault();
    const cp = normalizePostalCode(codePostal);

    if (!isValidPostalCode(cp)) {
      setRecherche("invalide");
      return;
    }

    // On cherche le code postal exact, pour pouvoir afficher les communes
    // qu'il couvre : 20117 = Cauro, Ocana et Eccica-Suarella.
    let trouvee = null;
    let communeTrouvee = null;
    for (const z of zones) {
      const entree = (z.delivery_postal_codes ?? []).find(
        (e) => normalizePostalCode(e.postal_code) === cp
      );
      if (entree) {
        trouvee = z;
        communeTrouvee = entree.label;
        break;
      }
    }

    if (!trouvee) {
      setRecherche("introuvable");
      onChange({ ...valeur, postalCode: cp, zone: null, weekday: null, firstDate: null });
      onAnnonce?.(`Nous ne livrons pas encore le code postal ${cp}.`);
      return;
    }

    // Un seul jour possible : on le présélectionne, ça évite un clic.
    const jourParDefaut = trouvee.allowed_days.length === 1 ? trouvee.allowed_days[0] : null;
    const datesParDefaut = jourParDefaut ? nextDeliveryDates(jourParDefaut, trouvee, 3) : [];

    setRecherche("trouvee");
    onChange({
      ...valeur,
      postalCode: cp,
      commune: communeTrouvee,
      zone: trouvee,
      weekday: jourParDefaut,
      firstDate: datesParDefaut[0] ?? null,
      slot: generateTimeSlots(trouvee)[0] ?? "11:00",
    });
    onAnnonce?.(
      `${communeTrouvee} : livraison le ${dayLabels(trouvee.allowed_days)}.`
    );
  }

  function choisirJour(jour) {
    const dates = nextDeliveryDates(jour, zone, 3);
    onChange({ ...valeur, weekday: jour, firstDate: dates[0] ?? null });
    onAnnonce?.(`Livraison tous les ${dayLabel(jour)}s.`);
  }

  async function inscrireListeAttente(event) {
    event.preventDefault();
    setStatutAttente("loading");
    setMessageAttente("");

    try {
      const reponse = await fetch("/api/liste-attente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAttente, postalCode: normalizePostalCode(codePostal) }),
      });
      const data = await reponse.json();

      if (!reponse.ok) {
        setStatutAttente("error");
        setMessageAttente(data.error || "Inscription impossible.");
        return;
      }
      setStatutAttente("success");
      setMessageAttente("C'est noté, nous vous préviendrons dès que nous livrerons chez vous.");
    } catch {
      setStatutAttente("error");
      setMessageAttente("Connexion impossible. Réessayez dans un instant.");
    }
  }

  // Garde-fou de développement : des zones existent mais aucune n'a de code
  // postal renseigné. Sans ce message, on croirait qu'aucune commune n'est
  // desservie alors que c'est la base qui est mal remplie.
  const zonesSansCodePostal =
    zones.length > 0 && zones.every((z) => !(z.delivery_postal_codes ?? []).length);

  return (
    <div className="space-y-8">
      {zonesSansCodePostal && process.env.NODE_ENV !== "production" && (
        <p className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          <strong>Message pour le développeur :</strong> aucune zone n&apos;a de
          code postal renseigné. Exécutez <code>reset.sql</code> puis{" "}
          <code>schema.sql</code> dans Supabase.
        </p>
      )}

      {/* 1. Code postal */}
      <div>
        <form onSubmit={chercherZone} className="flex flex-wrap items-end gap-3" noValidate>
          <div className="min-w-[180px] flex-1">
            <label htmlFor="code-postal" className="field-label">
              Votre code postal
            </label>
            <input
              id="code-postal"
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={5}
              placeholder="20130"
              className="field-input"
              value={codePostal}
              onChange={(e) => {
                setCodePostal(e.target.value);
                setRecherche("idle");
              }}
              aria-describedby={recherche === "invalide" ? "erreur-cp" : undefined}
              aria-invalid={recherche === "invalide"}
            />
          </div>
          <button type="submit" className="btn-primary">Vérifier</button>
        </form>

        {recherche === "invalide" && (
          <p id="erreur-cp" role="alert" className="mt-3 rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-sm">
            Un code postal contient 5 chiffres.
          </p>
        )}

        {recherche === "introuvable" && (
          <div className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
            <p className="mb-1 font-bold text-encre">Nous ne livrons pas encore chez vous</p>
            <p className="mb-4 text-sm">
              Laissez votre email : nous vous préviendrons dès que la tournée
              passera par le {normalizePostalCode(codePostal)}.
            </p>

            {statutAttente === "success" ? (
              <p role="status" className="rounded-xl border-2 border-framboise bg-framboise-soft px-4 py-3 text-sm">
                {messageAttente}
              </p>
            ) : (
              <form onSubmit={inscrireListeAttente} className="flex flex-wrap items-end gap-3" noValidate>
                <div className="min-w-[220px] flex-1">
                  <label htmlFor="email-attente" className="field-label">Votre email</label>
                  <input
                    id="email-attente"
                    type="email"
                    autoComplete="email"
                    required
                    className="field-input"
                    value={emailAttente}
                    onChange={(e) => setEmailAttente(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={statutAttente === "loading"} className="btn-outline">
                  {statutAttente === "loading" ? "Un instant…" : "Me prévenir"}
                </button>
              </form>
            )}

            {statutAttente === "error" && (
              <p role="alert" className="mt-3 text-sm text-red-700">{messageAttente}</p>
            )}
          </div>
        )}
      </div>

      {/* 2. Jour récurrent */}
      {zone && (
        <>
          <p className="rounded-xl border-2 border-framboise bg-framboise-soft px-4 py-3 text-sm">
            <strong>{valeur.commune ?? zone.city}</strong> ({valeur.postalCode}) :
            livraison le {dayLabels(zone.allowed_days)}.
          </p>

          {joursPossibles.length > 1 && (
            <fieldset className="border-0 p-0">
              <legend className="field-label">Votre jour de livraison habituel</legend>
              <p className="mb-3 text-sm text-ardoise/85">
                Vous serez livré ce jour-là chaque semaine. Modifiable à tout
                moment depuis votre espace client.
              </p>
              <div className="flex flex-wrap gap-2">
                {joursPossibles.map((jour) => {
                  const actif = valeur.weekday === jour;
                  return (
                    <button
                      key={jour}
                      type="button"
                      aria-pressed={actif}
                      onClick={() => choisirJour(jour)}
                      className={`rounded-full border-2 px-5 py-2.5 text-sm font-semibold capitalize transition-colors ${
                        actif
                          ? "border-framboise bg-framboise text-white"
                          : "border-black/15 hover:border-black/40"
                      }`}
                    >
                      {dayLabel(jour)}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* 3. Date de première livraison */}
          {valeur.weekday && (
            <fieldset className="border-0 p-0">
              <legend className="field-label">Votre première livraison</legend>
              {datesPossibles.length === 0 ? (
                <p className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm">
                  Plus aucune date disponible pour ce jour. Choisissez un autre
                  jour de livraison.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  {datesPossibles.map((date, index) => {
                    const actif = valeur.firstDate === date;
                    return (
                      <button
                        key={date}
                        type="button"
                        aria-pressed={actif}
                        onClick={() => {
                          onChange({ ...valeur, firstDate: date });
                          onAnnonce?.(`Première livraison le ${formatLongDate(date)}.`);
                        }}
                        className={`rounded-2xl border-2 p-4 text-left transition-colors ${
                          actif ? "border-framboise bg-framboise-soft" : "border-black/15 hover:border-black/40"
                        }`}
                      >
                        <span className="block text-xs font-bold uppercase tracking-wider text-framboise">
                          {index === 0 ? "Au plus tôt" : `Semaine +${index}`}
                        </span>
                        <span className="mt-1 block font-bold capitalize text-encre">
                          {dayLabel(valeur.weekday)} {formatShortDate(date)}
                        </span>
                        <span className="mt-1 block text-xs text-ardoise/85">
                          Commandez avant{" "}
                          {formatDeadline(date, {
                            leadTimeDays: zone.lead_time_days,
                            cutoffTime: zone.cutoff_time,
                          })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>
          )}

          {/* 4. Créneau horaire */}
      {valeur.firstDate && creneaux.length > 0 && (
        <fieldset className="border-0 p-0">
          <legend className="field-label">Créneau de livraison</legend>
          <p className="mb-3 text-sm text-ardoise">
            Choisissez l&apos;heure qui vous arrange. Nous passons dans la
            demi-heure indiquée.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {creneaux.map((slot) => {
              const actif = valeur.slot === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  aria-pressed={actif}
                  aria-label={`Créneau ${formatCreneau(slot, zone)}`}
                  onClick={() => {
                    onChange({ ...valeur, slot });
                    onAnnonce?.(`Créneau ${formatCreneau(slot, zone)}.`);
                  }}
                  className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors ${
                    actif
                      ? "border-framboise bg-framboise text-white"
                      : "border-black/15 hover:border-black/40"
                  }`}
                >
                  {slot.replace(":", "h")}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* 5. Adresse */}
          {valeur.firstDate && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rue" className="field-label">Adresse</label>
                <input
                  id="rue"
                  type="text"
                  autoComplete="street-address"
                  placeholder="12 rue Fesch"
                  className="field-input"
                  value={valeur.street ?? ""}
                  onChange={(e) => onChange({ ...valeur, street: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="complement" className="field-label">
                  Complément <span className="font-normal text-ardoise/75">(facultatif)</span>
                </label>
                <input
                  id="complement"
                  type="text"
                  placeholder="Bâtiment B, code 1234, 2e étage"
                  className="field-input"
                  value={valeur.notes ?? ""}
                  onChange={(e) => onChange({ ...valeur, notes: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="telephone" className="field-label">Téléphone</label>
                <input
                  id="telephone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="06 12 34 56 78"
                  className="field-input"
                  aria-describedby="aide-tel"
                  value={valeur.phone ?? ""}
                  onChange={(e) => onChange({ ...valeur, phone: e.target.value })}
                />
                <p id="aide-tel" className="mt-2 text-xs text-ardoise/80">
                  Pour être prévenu le jour de la livraison.
                </p>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}
