"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const BOXES = [
  { id: "diabete", label: "Box diabète" },
  { id: "antiinflam", label: "Box anti-inflammatoire" },
];

/**
 * Catalogue des recettes. Les 15 plats sont les mêmes dans les deux box :
 * le sélecteur change les ingrédients et les valeurs nutritionnelles affichés.
 */
export default function MenuSemaine({ recipes }) {
  const [categorie, setCategorie] = useState("diabete");

  return (
    <>
      <div
        role="group"
        aria-label="Voir les ingrédients pour"
        className="mb-8 inline-flex flex-wrap gap-2 rounded-full border-2 border-black/10 bg-white p-1.5"
      >
        {BOXES.map((box) => {
          const actif = categorie === box.id;
          return (
            <button
              key={box.id}
              type="button"
              aria-pressed={actif}
              onClick={() => setCategorie(box.id)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
                actif ? "bg-framboise text-white" : "text-encre hover:bg-framboise-soft"
              }`}
            >
              {box.label}
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="sr-only">
        Ingrédients affichés pour la {BOXES.find((b) => b.id === categorie).label}.
      </p>

      <ul className="grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {recipes.map((recette) => {
          const v = (recette.recipe_variants ?? []).find((x) => x.category === categorie);
          if (!v) return null;

          return (
            <li key={recette.id} className="carte flex flex-col overflow-hidden">
              <div className="relative aspect-[4/3] bg-sable">
                {recette.image ? (
                  <Image
                    src={recette.image}
                    alt={recette.image_alt ?? recette.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center px-4 text-center text-sm text-ardoise/70">
                    Photo à venir
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h2 className="mb-2 text-base font-bold text-encre">{recette.name}</h2>

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
                  <details className="mt-auto">
                    <summary className="cursor-pointer text-sm font-semibold text-framboise">
                      Ingrédients fournis
                    </summary>
                    <p className="mt-2 text-sm text-ardoise/85">{v.ingredients.join(", ")}</p>
                  </details>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-12">
        <Link href="/formules" className="btn-primary">Composer ma box</Link>
      </p>
    </>
  );
}
