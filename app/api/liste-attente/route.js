import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isValidPostalCode, normalizePostalCode } from "@/lib/delivery";

// Inscription à la liste d'attente pour une commune non desservie.
// Pas besoin d'être connecté : c'est justement un prospect.
export async function POST(request) {
  try {
    const { email, postalCode } = await request.json();

    const cp = normalizePostalCode(postalCode);
    if (!isValidPostalCode(cp)) {
      return NextResponse.json({ error: "Code postal invalide." }, { status: 400 });
    }

    const mail = String(email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) {
      return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("waitlist")
      .insert({ email: mail, postal_code: cp });

    // 23505 = doublon : la personne s'est déjà inscrite, ce n'est pas une erreur.
    if (error && error.code !== "23505") throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur liste d'attente :", error);
    return NextResponse.json(
      { error: "Inscription impossible pour le moment." },
      { status: 500 }
    );
  }
}
