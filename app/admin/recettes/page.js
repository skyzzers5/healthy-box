import { requireAdmin } from "@/lib/admin";
import GestionRecettes from "@/components/admin/GestionRecettes";

export const dynamic = "force-dynamic";

export default async function RecettesAdminPage() {
  const { admin } = await requireAdmin();

  const { data: recettes } = await admin
    .from("recipes")
    .select(
      "id, slug, name, description, image, image_alt, prep_minutes, position, published, validated_by, " +
        "recipe_variants(category, ingredients, kcal, glycemic_index, highlight)"
    )
    .order("position");

  return (
    <>
      <h2 className="mb-2 text-2xl">Recettes</h2>
      <p className="mb-6 max-w-2xl text-sm text-ardoise">
        Chaque plat existe dans les deux box : ce sont les ingrédients qui
        changent. Une recette ne peut être publiée que si le nom de la personne
        l&apos;ayant validée est renseigné.
      </p>
      <GestionRecettes recettes={recettes ?? []} />
    </>
  );
}
