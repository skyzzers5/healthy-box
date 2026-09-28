"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const VIDE = {
  id: null, slug: "", name: "", description: "", image: "", imageAlt: "",
  prepMinutes: "", position: "", published: false, validatedBy: "",
  variants: {
    diabete: { ingredients: "", kcal: "", glycemicIndex: "", highlight: "" },
    antiinflam: { ingredients: "", kcal: "", highlight: "" },
  },
};

export default function FormulaireRecette({ recette = null, onFerme }) {
  const router = useRouter();
  const [valeurs, setValeurs] = useState(() => (recette ? versFormulaire(recette) : VIDE));
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  function champ(cle, valeur) {
    setValeurs((v) => ({ ...v, [cle]: valeur }));
  }
  function champVariante(categorie, cle, valeur) {
    setValeurs((v) => ({
      ...v,
      variants: { ...v.variants, [categorie]: { ...v.variants[categorie], [cle]: valeur } },
    }));
  }

  async function enregistrer(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const reponse = await fetch("/api/admin/recette", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(valeurs),
      });
      const data = await reponse.json();

      if (!reponse.ok) {
        setStatus("error");
        setMessage(data.error || "Enregistrement impossible.");
        return;
      }

      setStatus("success");
      setMessage("Recette enregistrée.");
      setTimeout(() => {
        onFerme?.();
        router.refresh();
      }, 900);
    } catch {
      setStatus("error");
      setMessage("Connexion impossible.");
    }
  }

  return (
    <form onSubmit={enregistrer} className="carte p-6" noValidate>
      <h3 className="mb-5 text-xl">
        {valeurs.id ? "Modifier la recette" : "Nouvelle recette"}
      </h3>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="r-nom" className="field-label">Nom du plat</label>
          <input id="r-nom" type="text" className="field-input" required
            value={valeurs.name} onChange={(e) => champ("name", e.target.value)} />
        </div>
        <div>
          <label htmlFor="r-minutes" className="field-label">Temps de préparation (min)</label>
          <input id="r-minutes" type="number" min="5" max="180" className="field-input"
            value={valeurs.prepMinutes} onChange={(e) => champ("prepMinutes", e.target.value)} />
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="r-desc" className="field-label">Description</label>
        <textarea id="r-desc" rows={2} className="field-input"
          value={valeurs.description} onChange={(e) => champ("description", e.target.value)} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="r-image" className="field-label">
            Photo <span className="font-normal text-ardoise">(chemin)</span>
          </label>
          <input id="r-image" type="text" className="field-input"
            placeholder="/images/recettes/mon-plat.jpg"
            aria-describedby="aide-image"
            value={valeurs.image} onChange={(e) => champ("image", e.target.value)} />
          <p id="aide-image" className="mt-1 text-xs text-ardoise">
            Déposez d&apos;abord le fichier dans public/images/recettes/
          </p>
        </div>
        <div>
          <label htmlFor="r-alt" className="field-label">Description de la photo</label>
          <input id="r-alt" type="text" className="field-input"
            aria-describedby="aide-alt"
            value={valeurs.imageAlt} onChange={(e) => champ("imageAlt", e.target.value)} />
          <p id="aide-alt" className="mt-1 text-xs text-ardoise">
            Lue par les lecteurs d&apos;écran : décrivez ce que montre la photo.
          </p>
        </div>
      </div>

      {[
        ["diabete", "Variante box diabète", true],
        ["antiinflam", "Variante box anti-inflammatoire", false],
      ].map(([categorie, titre, avecIG]) => (
        <fieldset key={categorie} className="mb-6 rounded-xl border-2 border-black/10 p-4">
          <legend className="px-2 font-bold">{titre}</legend>

          <div className="mb-3">
            <label htmlFor={`ing-${categorie}`} className="field-label">
              Ingrédients <span className="font-normal text-ardoise">(un par ligne)</span>
            </label>
            <textarea id={`ing-${categorie}`} rows={4} className="field-input"
              value={valeurs.variants[categorie].ingredients}
              onChange={(e) => champVariante(categorie, "ingredients", e.target.value)} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor={`kcal-${categorie}`} className="field-label">Calories</label>
              <input id={`kcal-${categorie}`} type="number" className="field-input"
                value={valeurs.variants[categorie].kcal}
                onChange={(e) => champVariante(categorie, "kcal", e.target.value)} />
            </div>
            {avecIG && (
              <div>
                <label htmlFor="ig" className="field-label">Index glycémique</label>
                <input id="ig" type="number" min="0" max="110" className="field-input"
                  value={valeurs.variants.diabete.glycemicIndex}
                  onChange={(e) => champVariante("diabete", "glycemicIndex", e.target.value)} />
              </div>
            )}
            <div className={avecIG ? "" : "sm:col-span-2"}>
              <label htmlFor={`hl-${categorie}`} className="field-label">Atout mis en avant</label>
              <input id={`hl-${categorie}`} type="text" className="field-input"
                value={valeurs.variants[categorie].highlight}
                onChange={(e) => champVariante(categorie, "highlight", e.target.value)} />
            </div>
          </div>
        </fieldset>
      ))}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="r-valide" className="field-label">Validée par</label>
          <input id="r-valide" type="text" className="field-input"
            placeholder="Nom de la naturopathe"
            aria-describedby="aide-valide"
            value={valeurs.validatedBy} onChange={(e) => champ("validatedBy", e.target.value)} />
          <p id="aide-valide" className="mt-1 text-xs text-ardoise">
            Obligatoire pour publier : la recette ne peut pas être mise en ligne sans validation.
          </p>
        </div>
        <div>
          <label htmlFor="r-position" className="field-label">Ordre d&apos;affichage</label>
          <input id="r-position" type="number" className="field-input"
            value={valeurs.position} onChange={(e) => champ("position", e.target.value)} />
        </div>
      </div>

      <label className="mb-6 flex items-center gap-3">
        <input type="checkbox" className="h-5 w-5"
          checked={valeurs.published} onChange={(e) => champ("published", e.target.checked)} />
        <span className="font-semibold">Publier sur le site</span>
      </label>

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={status === "loading"} className="btn-primary">
          {status === "loading" ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" onClick={onFerme} className="btn-outline">Annuler</button>
      </div>

      {message && (
        <p role={status === "error" ? "alert" : "status"}
          className={`mt-4 rounded-xl border-2 px-4 py-3 text-sm ${
            status === "error" ? "border-red-400 bg-red-50" : "border-framboise bg-framboise-soft"
          }`}>
          {message}
        </p>
      )}
    </form>
  );
}

function versFormulaire(r) {
  const trouve = (cat) => (r.recipe_variants ?? []).find((v) => v.category === cat) ?? {};
  const d = trouve("diabete");
  const a = trouve("antiinflam");
  return {
    id: r.id,
    slug: r.slug ?? "",
    name: r.name ?? "",
    description: r.description ?? "",
    image: r.image ?? "",
    imageAlt: r.image_alt ?? "",
    prepMinutes: r.prep_minutes ?? "",
    position: r.position ?? "",
    published: Boolean(r.published),
    validatedBy: r.validated_by ?? "",
    variants: {
      diabete: {
        ingredients: (d.ingredients ?? []).join("\n"),
        kcal: d.kcal ?? "",
        glycemicIndex: d.glycemic_index ?? "",
        highlight: d.highlight ?? "",
      },
      antiinflam: {
        ingredients: (a.ingredients ?? []).join("\n"),
        kcal: a.kcal ?? "",
        highlight: a.highlight ?? "",
      },
    },
  };
}
