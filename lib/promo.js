import { createAdminClient } from "@/lib/supabase/server";

/**
 * Validation d'un code promo, partagée entre /api/promo et /api/checkout.
 *
 * La table promo_codes n'a aucune politique de lecture : elle est inaccessible
 * depuis le navigateur. Sans cela, il suffirait d'interroger Supabase avec la
 * clé publique pour récupérer la liste de tous les codes.
 *
 * Le message d'échec est volontairement le même dans tous les cas : préciser
 * « code expiré » ou « code épuisé » révélerait qu'un code existe.
 */
export async function validerCodePromo(codeSaisi, userId) {
  const INVALIDE = { ok: false, error: "Ce code n'est pas valide ou n'est plus utilisable." };

  const code = String(codeSaisi ?? "").trim().toUpperCase();
  if (!code || !userId) return INVALIDE;

  const admin = createAdminClient();

  const { data: promo } = await admin
    .from("promo_codes")
    .select("id, code, effect, active, max_uses, used_count, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (!promo || !promo.active) return INVALIDE;
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return INVALIDE;
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) return INVALIDE;

  // Une seule utilisation par personne.
  const { data: dejaUtilise } = await admin
    .from("promo_redemptions")
    .select("id")
    .eq("promo_code_id", promo.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (dejaUtilise) {
    return { ok: false, error: "Vous avez déjà utilisé ce code." };
  }

  return { ok: true, promo };
}
