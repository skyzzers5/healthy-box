import { requireAdmin } from "@/lib/admin";
import { formatLongDate, toISODate } from "@/lib/delivery";
import SelecteurDate from "@/components/admin/SelecteurDate";

export const dynamic = "force-dynamic";

/**
 * Liste de courses agrégée pour une date.
 *
 * On additionne les ingrédients de toutes les box du jour, en tenant compte
 * du nombre de personnes : une recette pour 4 personnes compte double par
 * rapport à la même recette pour 2.
 */
export default async function CoursesPage({ searchParams }) {
  const params = await searchParams;
  const { admin } = await requireAdmin();

  const date = params?.date || toISODate(new Date());

  const { data: commandes } = await admin
    .from("orders")
    .select("recipe_ids, subscriptions(box_category, people_count)")
    .eq("delivery_date", date)
    .neq("status", "skipped");

  const { data: variantes } = await admin
    .from("recipe_variants")
    .select("recipe_id, category, ingredients, recipes(name)");

  // ingrédient → nombre de portions
  const portionsParIngredient = {};
  // recette → portions, pour la préparation
  const portionsParRecette = {};

  for (const commande of commandes ?? []) {
    const categorie = commande.subscriptions?.box_category;
    const personnes = commande.subscriptions?.people_count ?? 1;

    for (const recipeId of commande.recipe_ids ?? []) {
      const variante = (variantes ?? []).find(
        (v) => v.recipe_id === recipeId && v.category === categorie
      );
      if (!variante) continue;

      const nom = variante.recipes?.name ?? `Recette ${recipeId}`;
      const cle = `${nom} — ${categorie === "diabete" ? "diabète" : "anti-inflam."}`;
      portionsParRecette[cle] = (portionsParRecette[cle] ?? 0) + personnes;

      for (const ingredient of variante.ingredients ?? []) {
        portionsParIngredient[ingredient] = (portionsParIngredient[ingredient] ?? 0) + personnes;
      }
    }
  }

  const ingredients = Object.entries(portionsParIngredient).sort((a, b) =>
    a[0].localeCompare(b[0], "fr")
  );
  const recettes = Object.entries(portionsParRecette).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl">Liste de courses</h2>
          <p className="text-sm capitalize text-ardoise">{formatLongDate(date)}</p>
        </div>
        <SelecteurDate date={date} base="/admin/courses" />
      </div>

      {ingredients.length === 0 ? (
        <p className="carte p-6 text-ardoise">Aucune box à préparer ce jour-là.</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <section aria-labelledby="h-ingredients">
            <h3 id="h-ingredients" className="mb-3 text-xl">
              Ingrédients{" "}
              <span className="text-base font-normal text-ardoise">
                — {ingredients.length} références
              </span>
            </h3>
            <p className="mb-4 text-sm text-ardoise">
              Le nombre indique les <strong>portions</strong> à prévoir, pas une
              quantité : à convertir selon vos grammages.
            </p>
            <ul className="m-0 list-none p-0">
              {ingredients.map(([nom, portions]) => (
                <li
                  key={nom}
                  className="flex justify-between gap-4 border-b border-black/10 py-2.5 text-sm last:border-0"
                >
                  <span>{nom}</span>
                  <span className="shrink-0 font-bold">{portions} portions</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="h-recettes">
            <h3 id="h-recettes" className="mb-3 text-xl">Plats à préparer</h3>
            <ul className="m-0 list-none p-0">
              {recettes.map(([nom, portions]) => (
                <li
                  key={nom}
                  className="flex justify-between gap-4 border-b border-black/10 py-2.5 text-sm last:border-0"
                >
                  <span>{nom}</span>
                  <span className="shrink-0 font-bold">{portions} portions</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
