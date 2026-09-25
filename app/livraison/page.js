import { createClient } from "@/lib/supabase/server";
import { dayLabels, generateTimeSlots, formatHeure } from "@/lib/delivery";
import Link from "next/link";

export const metadata = { title: "Zones et jours de livraison — Healthy Box" };

export default async function LivraisonPage() {
  const supabase = await createClient();
  const { data: zones, error } = await supabase
    .from("delivery_zones")
    .select("city, allowed_days, slot_start, slot_end, slot_interval_minutes, delivery_postal_codes(postal_code, label)")
    .eq("active", true)
    .order("city");

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="eyebrow">Livraison</p>
      <h1 className="mb-4 font-bold text-5xl sm:text-6xl">Où et quand nous livrons</h1>
      <p className="mb-12 max-w-xl leading-relaxed text-ardoise/85">
        Les jours dépendent de nos tournées. Vous choisirez votre date exacte au
        moment de composer votre box.
      </p>

      {error ? (
        <p role="alert" className="carte p-6 text-ardoise">
          Impossible de charger les zones pour le moment.
        </p>
      ) : zones.length === 0 ? (
        <p className="carte p-6 text-ardoise">Aucune zone de livraison configurée.</p>
      ) : (
        <ul className="m-0 list-none space-y-6 p-0">
          {zones.map((zone) => {
            const creneaux = generateTimeSlots(zone);
            return (
              <li key={zone.city} className="carte p-6">
                <h2 className="mb-1 text-xl">{zone.city}</h2>
                <p className="mb-3 text-sm font-semibold capitalize text-framboise">
                  Livraison le {dayLabels(zone.allowed_days)}
                </p>

                {zone.delivery_postal_codes?.length > 0 && (
                  <ul className="m-0 mb-3 list-none space-y-1 p-0 text-sm text-ardoise">
                    {zone.delivery_postal_codes
                      .slice()
                      .sort((a, b) => a.postal_code.localeCompare(b.postal_code))
                      .map((entree) => (
                        <li key={entree.postal_code}>
                          <span className="font-semibold text-encre">{entree.postal_code}</span>{" "}
                          — {entree.label}
                        </li>
                      ))}
                  </ul>
                )}

                {creneaux.length > 0 && (
                  <p className="text-sm text-ardoise">
                    <span className="font-semibold text-encre">Créneaux :</span>{" "}
                    de {formatHeure(creneaux[0])} à {formatHeure(creneaux[creneaux.length - 1])}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-10">
        <Link href="/formules" className="btn-primary">Composer ma box</Link>
      </p>
    </div>
  );
}
