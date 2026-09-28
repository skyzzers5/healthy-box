import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export const metadata = {
  title: "Administration — Healthy Box",
  robots: { index: false, follow: false },
};

const LIENS = [
  { href: "/admin", label: "Tableau de bord" },
  { href: "/admin/livraisons", label: "Livraisons" },
  { href: "/admin/courses", label: "Liste de courses" },
  { href: "/admin/abonnements", label: "Abonnements" },
  { href: "/admin/recettes", label: "Recettes" },
  { href: "/admin/paniers", label: "Paniers abandonnés" },
];

export default async function AdminLayout({ children }) {
  const { profile } = await requireAdmin();

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <header className="mb-8 border-b border-black/10 pb-6">
        <p className="eyebrow">Administration</p>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h1 className="text-3xl">Healthy Box</h1>
          <p className="text-sm text-ardoise">
            Connecté : {profile?.full_name || "administrateur"}
          </p>
        </div>

        <nav aria-label="Navigation administration" className="mt-5">
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {LIENS.map((lien) => (
              <li key={lien.href}>
                <Link
                  href={lien.href}
                  className="inline-block rounded-full border-2 border-black/15 px-4 py-2 text-sm font-semibold transition-colors hover:border-framboise hover:text-framboise"
                >
                  {lien.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      {children}
    </div>
  );
}
