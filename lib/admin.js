import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Vérifie que la personne connectée est administratrice.
 *
 * À appeler au début de CHAQUE page et route d'administration. Le proxy
 * bloque déjà /admin, mais une seconde barrière côté serveur évite qu'une
 * faille de middleware n'ouvre tout le back-office — c'est exactement le type
 * de faille qui a touché Next.js en 2025.
 *
 * Renvoie { user, admin } où `admin` est un client Supabase en service_role :
 * les pages d'administration doivent voir les données de tous les clients,
 * ce que les politiques RLS interdisent par construction.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?suite=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    // On ne dit pas « accès refusé » : mieux vaut que la page paraisse
    // ne pas exister pour quelqu'un qui cherche le back-office.
    redirect("/");
  }

  return { user, profile, admin: createAdminClient() };
}

/** Variante pour les routes API : renvoie null au lieu de rediriger. */
export async function getAdminOrNull() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") return null;

  return { user, admin: createAdminClient() };
}
