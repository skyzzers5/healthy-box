"use client";

import Image from "next/image";
import { useMemo } from "react";

/**
 * Sélection des recettes composant la box.
 *
 * Les 15 recettes existent dans les deux box : ce sont les INGRÉDIENTS qui
 * changent selon la box choisie. On affiche donc la variante correspondante.
 *
 * Règles :
 * - on choisit exactement autant de recettes que de plats par semaine
 * - une même recette peut être prise plusieurs fois
 *
 * La sélection est un tableau d'identifiants avec répétitions,
 * ex. [3, 3, 7] = deux fois la recette 3 et une fois la 7.
 */
export default function EtapeRecettes({
  recipes,
  boxCategory,
  mealsPerWeek,
  selection,
  onChange,
  onAnnonce,
}) {
  const total = selection.length;
  const restant = mealsPerWeek - total;
  const complet = restant === 0;

  // Pour chaque recette, la variante correspondant à la box choisie
  const avecVariante = useMemo(
    () =>
      recipes
        .map((r) => ({
          ...r,
          variante: (r.recipe_variants ?? []).find((v) => v.category === boxCategory),
        }))
        .filter((r) => r.variante),
    [recipes, boxCategory]
  );

  function quantite(id) {
    return selection.filter((x) => x === id).length;
  }

  function ajouter(recette) {
    if (total >= mealsPerWeek) return;
    const suite = [...selection, recette.id];
    onChange(suite);
    const reste = mealsPerWeek - suite.length;
    onAnnonce?.(
      reste === 0
        ? `${recette.name} ajoutée. Votre box est complète.`
        : `${recette.name} ajoutée. Encore ${reste} plat${reste > 1 ? "s" : ""} à choisir.`
    );
  }

  function retirer(recette) {
    const index = selection.lastIndexOf(recette.id);
    if (index === -1) return;
    const suite = [...selection];
    suite.splice(index, 1);
    onChange(suite);
    onAnnonce?.(`${recette.name} retirée. Encore ${mealsPerWeek - suite.length} à choisir.`);
  }

  if (!boxCategory) {
    return (
      <p className="rounded-xl border-2 border-dashed border-black/20 bg-white px-4 py-6 text-center text-ardoise/85">
        Choisissez d&apos;abord votre box : les ingrédients de chaque recette en dépendent.
      </p>
    );
  }

  if (avecVariante.length === 0) {
    return (
      <p className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-4 text-sm">
        Aucune recette disponible pour cette box. Les recettes apparaissent ici
        une fois validées par la naturopathe.
      </p>
    );
  }

  return (
    <div>
      {/* Compteur collant : reste visible pendant qu'on fait défiler la liste */}
      <div className="sticky top-20 z-10 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-black/10 bg-white px-4 py-3">
        <p className="font-bold text-encre" aria-live="polite">
          {total} plat{total > 1 ? "s" : ""} sur {mealsPerWeek} sélectionné{total > 1 ? "s" : ""}
        </p>
        <p className={`text-sm font-semibold ${complet ? "text-framboise" : "text-ardoise/85"}`}>
          {complet ? "Votre box est complète" : `Encore ${restant} à choisir`}
        </p>
      </div>

      <p className="mb-5 text-sm text-ardoise/85">
        Vous recevez les ingrédients pré-portionnés et la fiche recette. Vous
        pouvez prendre plusieurs fois le même plat.
      </p>

      <ul className="grid list-none gap-4 p-0 sm:grid-cols-2">
        {avecVariante.map((recette) => {
          const qte = quantite(recette.id);
          const choisie = qte > 0;
          const plein = total >= mealsPerWeek;
          const v = recette.variante;

          return (
            <li
              key={recette.id}
              className={`carte flex flex-col overflow-hidden ${choisie ? "border-2 border-framboise" : ""}`}
            >
              {recette.image && (
                <div className="relative aspect-[4/3] bg-sable">
                  <Image
                    src={recette.image}
                    alt={recette.image_alt ?? recette.name}
                    fill
                    sizes="(max-width: 640px) 100vw, 320px"
                    className="object-cover"
                  />
                  {choisie && (
                    <span className="absolute right-3 top-3 flex h-8 min-w-8 items-center justify-center rounded-full bg-framboise px-2 text-sm font-bold text-white">
                      ×{qte}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-1 flex-col p-5">
                <h3 className="mb-2 text-base font-bold text-encre">{recette.name}</h3>

                {recette.description && (
                  <p className="mb-3 text-sm text-ardoise/85">{recette.description}</p>
                )}

                <p className="mb-3 flex flex-wrap gap-2 text-xs">
                  {recette.prep_minutes && (
                    <span className="rounded-full bg-sable px-3 py-1 font-semibold text-framboise">
                      {recette.prep_minutes} min
                    </span>
                  )}
                  {v.glycemic_index != null && (
                    <span className="rounded-full bg-sable px-3 py-1 font-semibold text-framboise">
                      IG {v.glycemic_index}
                    </span>
                  )}
                  {v.kcal != null && (
                    <span className="rounded-full bg-black/5 px-3 py-1 font-semibold">
                      {v.kcal} kcal
                    </span>
                  )}
                </p>

                {v.highlight && (
                  <p className="mb-3 text-sm font-semibold text-framboise">{v.highlight}</p>
                )}

                {v.ingredients?.length > 0 && (
                  <details className="mb-4">
                    <summary className="cursor-pointer text-sm font-semibold text-framboise">
                      Ingrédients fournis
                    </summary>
                    <p className="mt-2 text-sm text-ardoise/85">{v.ingredients.join(", ")}</p>
                  </details>
                )}

                <div className="mt-auto flex items-center gap-2">
                  {choisie && (
                    <button
                      type="button"
                      onClick={() => retirer(recette)}
                      className="h-10 w-10 flex-shrink-0 rounded-full border-2 border-black/20 text-lg font-bold hover:border-black/50"
                    >
                      <span className="sr-only">Retirer une part de {recette.name}</span>
                      <span aria-hidden="true">−</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => ajouter(recette)}
                    disabled={plein}
                    className={`flex-1 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${
                      plein
                        ? "cursor-not-allowed bg-black/10 text-ardoise/50"
                        : choisie
                        ? "border-2 border-framboise text-framboise hover:bg-framboise-soft"
                        : "bg-framboise text-white hover:bg-framboise-dark"
                    }`}
                  >
                    {plein && !choisie ? "Box complète" : choisie ? "En ajouter un" : "Choisir ce plat"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!complet && total > 0 && (
        <p className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          Il vous reste {restant} plat{restant > 1 ? "s" : ""} à choisir pour compléter votre box.
        </p>
      )}
    </div>
  );
}
