import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Point d'atterrissage des liens envoyés par email et des retours OAuth.
 *
 * Supabase renvoie ici avec un paramètre `code` qu'il faut échanger contre
 * une session. Trois cas arrivent sur cette route :
 *   - confirmation d'inscription
 *   - retour de connexion Google
 *   - lien de réinitialisation de mot de passe (avec next=/reinitialiser…)
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const erreur = searchParams.get("error_description") ?? searchParams.get("error");

  // `next` est fourni par nos propres liens. On n'accepte qu'un chemin interne :
  // sans ce contrôle, un lien forgé pourrait rediriger vers un site tiers.
  const demande = searchParams.get("next") ?? "/compte";
  const suite = demande.startsWith("/") && !demande.startsWith("//") ? demande : "/compte";

  if (erreur) {
    return NextResponse.redirect(
      `${origin}/connexion?erreur=${encodeURIComponent(erreur)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/connexion?erreur=lien_invalide`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Échec de l'échange du code :", error.message);
    return NextResponse.redirect(`${origin}/connexion?erreur=lien_expire`);
  }

  return NextResponse.redirect(`${origin}${suite}`);
}
