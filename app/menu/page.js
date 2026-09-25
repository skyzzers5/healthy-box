import { createClient } from "@/lib/supabase/server";
import MenuSemaine from "@/components/MenuSemaine";

export const metadata = { title: "Nos recettes — Healthy Box" };
export const revalidate = 3600;

export default async function MenuPage() {
  const supabase = await createClient();

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select(
      "id, slug, name, description, image, image_alt, prep_minutes, tags, recipe_variants(category, ingredients, kcal, glycemic_index, highlight)"
    )
    .eq("published", true)
    .order("position");

  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <p className="eyebrow">Nos recettes</p>
      <h1 className="font-bold mb-4 text-5xl sm:text-6xl">Le menu</h1>
      <p className="mb-10 max-w-2xl leading-relaxed">
        Les mêmes plats dans les deux box : ce sont les ingrédients et les
        valeurs nutritionnelles qui changent. Basculez d&apos;une box à l&apos;autre
        pour voir la différence. Ces recettes ne remplacent pas un suivi médical.
      </p>

      {error ? (
        <p role="alert" className="carte p-6">
          Impossible de charger les recettes pour le moment. Réessayez dans
          quelques instants.
          {process.env.NODE_ENV !== "production" && (
            <span className="mt-2 block font-mono text-xs">{error.message}</span>
          )}
        </p>
      ) : !recipes || recipes.length === 0 ? (
        <p className="carte p-6 text-ardoise/85">
          Aucune recette publiée pour l&apos;instant. Les recettes apparaissent
          ici une fois validées par la naturopathe.
        </p>
      ) : (
        <MenuSemaine recipes={recipes} />
      )}
    </div>
  );
}
