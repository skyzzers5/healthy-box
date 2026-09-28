import { NextResponse } from "next/server";
import { getAdminOrNull } from "@/lib/admin";
import { envoyerEmail, emailPanierAbandonne, emailConfigure } from "@/lib/email";
import { BOX_TYPES } from "@/lib/pricing";

/** Relance manuelle d'un panier abandonné, depuis le back-office. */
export async function POST(request) {
  const acces = await getAdminOrNull();
  if (!acces) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  if (!emailConfigure()) {
    return NextResponse.json(
      {
        error:
          "Service d'emails non configuré. Renseignez RESEND_API_KEY et EMAIL_EXPEDITEUR dans les variables d'environnement.",
      },
      { status: 503 }
    );
  }

  try {
    const { subscriptionId } = await request.json();
    const { admin } = acces;

    const { data: panier } = await admin
      .from("subscriptions")
      .select("id, status, box_category, contact_email, abandoned_email_at, profiles(full_name)")
      .eq("id", subscriptionId)
      .maybeSingle();

    if (!panier) {
      return NextResponse.json({ error: "Panier introuvable." }, { status: 404 });
    }
    if (panier.status !== "incomplete") {
      return NextResponse.json(
        { error: "Ce panier a été finalisé, aucune relance nécessaire." },
        { status: 409 }
      );
    }
    if (!panier.contact_email) {
      return NextResponse.json(
        { error: "Aucune adresse email sur ce panier." },
        { status: 400 }
      );
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const prenom = panier.profiles?.full_name?.split(" ")[0] ?? null;
    const { texte, html } = emailPanierAbandonne({
      prenom,
      boxLabel: BOX_TYPES[panier.box_category]?.label ?? "box",
      lienReprise: `${site}/formules?box=${panier.box_category}`,
    });

    const envoi = await envoyerEmail({
      destinataire: panier.contact_email,
      sujet: "Votre box Healthy Box vous attend",
      html,
      texte,
    });

    if (!envoi.ok) {
      return NextResponse.json({ error: envoi.error }, { status: 502 });
    }

    await admin
      .from("subscriptions")
      .update({ abandoned_email_at: new Date().toISOString() })
      .eq("id", panier.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur relance :", error);
    return NextResponse.json({ error: "Relance impossible." }, { status: 500 });
  }
}
