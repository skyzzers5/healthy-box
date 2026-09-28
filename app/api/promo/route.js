import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validerCodePromo } from "@/lib/promo";

/**
 * Vérifie un code promo saisi dans le tunnel de commande.
 *
 * Cette route se contente de dire si le code est valide. Le montant est
 * toujours recalculé par /api/checkout avant le paiement : on ne fait jamais
 * confiance à un « livraison offerte » envoyé par le navigateur.
 */
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Connectez-vous pour utiliser un code promo." },
        { status: 401 }
      );
    }

    const { code } = await request.json();
    const saisi = String(code ?? "").trim();
    if (!saisi) {
      return NextResponse.json({ error: "Saisissez un code." }, { status: 400 });
    }

    const resultat = await validerCodePromo(saisi, user.id);
    if (!resultat.ok) {
      return NextResponse.json({ error: resultat.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      code: resultat.promo.code,
      effect: resultat.promo.effect,
    });
  } catch (error) {
    console.error("Erreur code promo :", error);
    return NextResponse.json(
      { error: "Vérification impossible pour le moment." },
      { status: 500 }
    );
  }
}
