"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormulaireRecette from "@/components/admin/FormulaireRecette";

export default function GestionRecettes({ recettes }) {
  const router = useRouter();
  const [edition, setEdition] = useState(null); // null | "nouvelle" | objet recette

  async function basculerPublication(recette) {
    const reponse = await fetch("/api/admin/recette", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: recette.id, published: !recette.published }),
    });
    if (reponse.ok) router.refresh();
  }

  if (edition) {
    return (
      <FormulaireRecette
        recette={edition === "nouvelle" ? null : edition}
        onFerme={() => setEdition(null)}
      />
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-ardoise">
          {recettes.length} recette{recettes.length > 1 ? "s" : ""} —{" "}
          {recettes.filter((r) => r.published).length} publiée
          {recettes.filter((r) => r.published).length > 1 ? "s" : ""}
        </p>
        <button type="button" onClick={() => setEdition("nouvelle")} className="btn-primary text-sm">
          Ajouter une recette
        </button>
      </div>

      {recettes.length === 0 ? (
        <p className="carte p-6 text-ardoise">Aucune recette pour l&apos;instant.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-black/15">
                <th scope="col" className="py-2 pr-3">Plat</th>
                <th scope="col" className="py-2 pr-3">Variantes</th>
                <th scope="col" className="py-2 pr-3">Validée par</th>
                <th scope="col" className="py-2 pr-3">État</th>
                <th scope="col" className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recettes.map((r) => {
                const variantes = r.recipe_variants ?? [];
                const complete = variantes.length === 2;
                return (
                  <tr key={r.id} className="border-b border-black/10 align-top">
                    <td className="py-3 pr-3">
                      <span className="font-semibold">{r.name}</span>
                      <span className="block text-xs text-ardoise">
                        {r.prep_minutes ? `${r.prep_minutes} min` : "durée non renseignée"}
                        {!r.image && " · sans photo"}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs">
                      {complete ? (
                        "diabète + anti-inflam."
                      ) : (
                        <span className="font-semibold text-red-700">
                          incomplète ({variantes.length}/2)
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-xs">{r.validated_by || "—"}</td>
                    <td className="py-3 pr-3">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                          r.published
                            ? "bg-framboise-soft text-framboise"
                            : "bg-black/10 text-ardoise"
                        }`}
                      >
                        {r.published ? "En ligne" : "Brouillon"}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setEdition(r)}
                          className="rounded-full border-2 border-black/20 px-3 py-1.5 text-xs font-semibold hover:border-black/50"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => basculerPublication(r)}
                          className="rounded-full border-2 border-framboise px-3 py-1.5 text-xs font-semibold text-framboise hover:bg-framboise-soft"
                        >
                          {r.published ? "Dépublier" : "Publier"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
