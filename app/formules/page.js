import Configurateur from "@/components/Configurateur";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Composer ma box — Healthy Box" };

export default async function FormulesPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: zones, error }, { data: recipes }, { data: { user } }] = await Promise.all([
    supabase
      .from("delivery_zones")
      // tous les champs utilisés par EtapeLivraison doivent être demandés ici,
      // sinon la recherche par code postal ne trouve jamais rien
      .select("id, city, allowed_days, slot_start, slot_end, slot_interval_minutes, lead_time_days, cutoff_time, delivery_postal_codes(postal_code, label)")
      .eq("active", true)
      .order("city"),
    supabase
      .from("recipes")
      .select("id, slug, name, description, image, image_alt, prep_minutes, recipe_variants(category, ingredients, kcal, glycemic_index, highlight)")
      .eq("published", true)
      .order("position"),
    supabase.auth.getUser(),
  ]);

  // Coordonnées connues et statut de la consigne, pour pré-remplir le formulaire
  let compte = null;
  if (user) {
    const [{ data: profile }, { data: consigne }] = await Promise.all([
      supabase.from("profiles").select("phone").eq("id", user.id).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("deposit_paid", true)
        .limit(1),
    ]);
    compte = {
      email: user.email ?? "",
      phone: profile?.phone ?? "",
      depositPaid: (consigne?.length ?? 0) > 0,
    };
  }

  if (error) {
    // Cas le plus fréquent en développement : le schéma de la base n'a pas
    // encore été mis à jour, la colonne postal_codes n'existe pas.
    const schemaObsolete = /column .* does not exist/i.test(error.message ?? "");

    return (
      <div className="mx-auto max-w-3xl px-6 py-24">
        <h1 className="font-bold mb-4 text-4xl">Service momentanément indisponible</h1>
        <p className="mb-4">
          Impossible de charger les zones de livraison. Réessayez dans quelques
          instants ou contactez-nous.
        </p>
        {process.env.NODE_ENV !== "production" && (
          <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-sm">
            <p className="mb-2 font-bold">Message pour le développeur</p>
            <p className="mb-2 font-mono text-xs">{error.message}</p>
            {schemaObsolete && (
              <p>
                Le schéma de la base est obsolète. Dans Supabase → SQL Editor,
                exécutez <code>supabase/reset.sql</code> puis{" "}
                <code>supabase/schema.sql</code>.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Configurateur
      zones={zones ?? []}
      recipes={recipes ?? []}
      isLoggedIn={Boolean(user)}
      compte={compte}
      boxParDefaut={params?.box ?? null}
    />
  );
}
