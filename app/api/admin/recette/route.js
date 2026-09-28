import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";

/**
 * Création et modification d'une recette, avec ses deux variantes.
 *
 * Une recette existe toujours dans les deux box : on écrit donc toujours
 * les deux variantes ensemble, ce qui évite les recettes à moitié configurées
 * qui n'apparaîtraient que dans une seule box.
 */
export async function POST(request) {
  const acces = await getAdminOrNull();
  if (!acces) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  try {
    const { admin } = acces;
    const body = await request.json();
    const {
      id, slug, name, description, image, imageAlt, prepMinutes,
      published, validatedBy, position, variants,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Le nom est obligatoire." }, { status: 400 });
    }

    const identifiant = (slug || name).trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    if (!identifiant) {
      return NextResponse.json({ error: "Nom invalide." }, { status: 400 });
    }

    // Publier impose d'avoir renseigné le validateur : c'est aussi imposé
    // par une contrainte SQL, on le vérifie ici pour un message clair.
    if (published && !validatedBy?.trim()) {
      return NextResponse.json(
        { error: "Indiquez qui a validé la recette avant de la publier." },
        { status: 400 }
      );
    }

    const donnees = {
      slug: identifiant,
      name: name.trim(),
      description: description?.trim() || null,
      image: image?.trim() || null,
      image_alt: imageAlt?.trim() || null,
      prep_minutes: prepMinutes ? Number(prepMinutes) : null,
      position: position ? Number(position) : 0,
      published: Boolean(published),
      validated_by: validatedBy?.trim() || null,
      validated_at: validatedBy?.trim() ? new Date().toISOString() : null,
    };

    let recetteId = id;

    if (id) {
      const { error } = await admin.from("recipes").update(donnees).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await admin.from("recipes").insert(donnees).select("id").single();
      if (error) {
        if (error.code === "23505") {
          return NextResponse.json(
            { error: "Une recette porte déjà ce nom." },
            { status: 409 }
          );
        }
        throw error;
      }
      recetteId = data.id;
    }

    // Les deux variantes, systématiquement
    for (const categorie of ["diabete", "antiinflam"]) {
      const v = variants?.[categorie] ?? {};
      const ingredients = String(v.ingredients ?? "")
        .split(/[\n,]+/)
        .map((i) => i.trim())
        .filter(Boolean);

      const { error } = await admin.from("recipe_variants").upsert(
        {
          recipe_id: recetteId,
          category: categorie,
          ingredients,
          kcal: v.kcal ? Number(v.kcal) : null,
          glycemic_index: categorie === "diabete" && v.glycemicIndex ? Number(v.glycemicIndex) : null,
          highlight: v.highlight?.trim() || null,
        },
        { onConflict: "recipe_id,category" }
      );
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, id: recetteId });
  } catch (error) {
    console.error("Erreur recette :", error);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }
}

/** Dépublication : on ne supprime jamais, des commandes y font référence. */
export async function PATCH(request) {
  const acces = await getAdminOrNull();
  if (!acces) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

  try {
    const { id, published } = await request.json();
    const { error } = await acces.admin
      .from("recipes")
      .update({ published: Boolean(published) })
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: "Impossible de publier : vérifiez que la recette a un validateur." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Opération impossible." }, { status: 500 });
  }
}
