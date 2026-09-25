"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import EtapeRecettes from "@/components/EtapeRecettes";
import { formatDeadline, formatLongDate } from "@/lib/delivery";

/**
 * Modification d'une livraison à venir, depuis l'espace client.
 * Trois actions : changer les plats, déplacer la date, sauter la semaine.
 * Tout est bloqué passé la date limite, côté client comme côté serveur.
 */
export default function ModifierLivraison({
  order,
  recipes,
  subscription,
  zone,
  datesPossibles,
  modifiable,
}) {
  const router = useRouter();
  const [panneau, setPanneau] = useState(null); // null | "recettes" | "date"
  const [selection, setSelection] = useState(order.recipe_ids ?? []);
  const [nouvelleDate, setNouvelleDate] = useState(order.delivery_date);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [annonce, setAnnonce] = useState("");

  const saute = order.status === "skipped";

  async function envoyer(action, corps = {}) {
    setStatus("loading");
    setMessage("");

    try {
      const reponse = await fetch("/api/livraison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderId: order.id, ...corps }),
      });
      const data = await reponse.json();

      if (!reponse.ok) {
        setStatus("error");
        setMessage(data.error || "Modification impossible.");
        return;
      }

      setStatus("success");
      setMessage(data.message || "C'est enregistré.");
      setTimeout(() => {
        setPanneau(null);
        router.refresh();
      }, 1400);
    } catch {
      setStatus("error");
      setMessage("Connexion impossible. Réessayez dans un instant.");
    }
  }

  if (!modifiable) {
    return (
      <p className="rounded-xl border border-black/10 bg-black/[0.03] px-4 py-3 text-sm text-ardoise/85">
        Cette livraison est en préparation, elle n&apos;est plus modifiable.
      </p>
    );
  }

  const limite = formatDeadline(order.delivery_date, {
    leadTimeDays: zone?.lead_time_days,
    cutoffTime: zone?.cutoff_time,
  });

  return (
    <div>
      <p aria-live="polite" className="sr-only">{annonce}</p>

      <p className="mb-3 text-sm text-ardoise/85">
        Modifiable jusqu&apos;au <strong>{limite}</strong>.
      </p>

      {saute ? (
        <div>
          <p className="mb-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm">
            Vous avez sauté cette livraison.
          </p>
          <button
            type="button"
            onClick={() => envoyer("reprendre")}
            disabled={status === "loading"}
            className="btn-outline text-sm"
          >
            Rétablir cette livraison
          </button>
        </div>
      ) : (
        !panneau && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPanneau("recettes")} className="btn-outline text-sm">
              Changer mes plats
            </button>
            <button type="button" onClick={() => setPanneau("date")} className="btn-outline text-sm">
              Changer la date
            </button>
            <button
              type="button"
              onClick={() => envoyer("sauter")}
              disabled={status === "loading"}
              className="rounded-full border-2 border-black/20 px-6 py-2.5 text-sm font-semibold hover:border-black/50"
            >
              Sauter cette semaine
            </button>
          </div>
        )
      )}

      {/* Changer les plats */}
      {panneau === "recettes" && (
        <div className="mt-5">
          <p className="mb-4 text-sm text-ardoise/85">
            Livraison du {formatLongDate(order.delivery_date)}. Votre nouvelle
            sélection sera aussi reconduite les semaines suivantes.
          </p>

          <EtapeRecettes
            recipes={recipes}
            boxCategory={subscription.box_category}
            mealsPerWeek={subscription.meals_per_week}
            selection={selection}
            onChange={setSelection}
            onAnnonce={setAnnonce}
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => envoyer("recettes", { recipeIds: selection })}
              disabled={selection.length !== subscription.meals_per_week || status === "loading"}
              className="btn-primary text-sm"
            >
              {status === "loading" ? "Enregistrement…" : "Enregistrer mes plats"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelection(order.recipe_ids ?? []);
                setPanneau(null);
                setMessage("");
                setStatus("idle");
              }}
              className="btn-outline text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Changer la date */}
      {panneau === "date" && (
        <div className="mt-5">
          <fieldset className="border-0 p-0">
            <legend className="field-label">
              Déplacer la livraison du {formatLongDate(order.delivery_date)}
            </legend>
            <p className="mb-4 text-sm text-ardoise/85">
              Seules les dates encore commandables dans votre zone sont proposées.
            </p>

            {datesPossibles.length === 0 ? (
              <p className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm">
                Aucune autre date disponible pour le moment.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {datesPossibles.map((date) => {
                  const actif = nouvelleDate === date;
                  const actuelle = date === order.delivery_date;
                  return (
                    <button
                      key={date}
                      type="button"
                      aria-pressed={actif}
                      onClick={() => {
                        setNouvelleDate(date);
                        setAnnonce(`Date sélectionnée : ${formatLongDate(date)}.`);
                      }}
                      className={`rounded-xl border-2 px-3 py-2.5 text-left text-sm font-medium capitalize transition-colors ${
                        actif ? "border-framboise bg-framboise-soft" : "border-black/15 hover:border-black/40"
                      }`}
                    >
                      {formatLongDate(date)}
                      {actuelle && (
                        <span className="mt-0.5 block text-xs font-normal text-ardoise/75">
                          date actuelle
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => envoyer("date", { newDate: nouvelleDate })}
              disabled={nouvelleDate === order.delivery_date || status === "loading"}
              className="btn-primary text-sm"
            >
              {status === "loading" ? "Enregistrement…" : "Déplacer la livraison"}
            </button>
            <button
              type="button"
              onClick={() => {
                setNouvelleDate(order.delivery_date);
                setPanneau(null);
                setMessage("");
                setStatus("idle");
              }}
              className="btn-outline text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          role={status === "error" ? "alert" : "status"}
          className={`mt-4 rounded-xl border-2 px-4 py-3 text-sm ${
            status === "error" ? "border-red-400 bg-red-50" : "border-framboise bg-framboise-soft"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
