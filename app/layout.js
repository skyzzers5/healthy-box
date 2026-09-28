import { Caveat, DM_Sans } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata = {
  title: "Healthy Box — Box repas santé, livrée en Corse",
  description:
    "Des repas simples pour une vie plus saine. Vous choisissez vos recettes, nous livrons les ingrédients pré-portionnés. Livraison partout en Corse.",
  // À retirer le jour de l'ouverture au public.
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Le rôle sert uniquement à afficher le lien d'administration : l'accès
  // réel est vérifié par le proxy et par chaque page /admin.
  let estAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    estAdmin = profile?.role === "admin";
  }

  return (
    <html lang="fr" className={`${dmSans.variable} ${caveat.variable}`}>
      <body>
        <a href="#contenu" className="sr-only-focusable">Aller au contenu principal</a>
        <Nav isLoggedIn={Boolean(user)} estAdmin={estAdmin} />
        <main id="contenu" tabIndex={-1}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
