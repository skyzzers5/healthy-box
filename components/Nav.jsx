"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const LINKS = [
  { href: "/formules", label: "Nos box" },
  { href: "/menu", label: "Nos recettes" },
  { href: "/livraison", label: "Livraison" },
  { href: "/rdv", label: "Naturopathe" },
];

export default function Nav({ isLoggedIn }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav aria-label="Navigation principale" className="sticky top-0 z-50 border-b border-black/5 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="whitespace-nowrap">
          <span className="logo-marque block text-lg sm:text-xl">Healthy Box</span>
          <span className="hidden text-[10px] uppercase tracking-[0.22em] text-ardoise/70 sm:block">
            Des repas simples pour une vie plus saine
          </span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className={`text-[15px] font-semibold transition-colors ${
                pathname === link.href ? "text-framboise" : "text-encre hover:text-framboise"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={isLoggedIn ? "/compte" : "/connexion"}
            className="hidden text-[15px] font-semibold text-encre hover:text-framboise sm:block"
          >
            {isLoggedIn ? "Mon compte" : "Connexion"}
          </Link>
          <Link href="/formules" className="btn-primary !px-5 !py-2.5 text-sm">
            Je commande
          </Link>
          <button
            type="button"
            className="p-2 lg:hidden"
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Ouvrir le menu de navigation</span>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id="menu-mobile" className="border-t border-black/5 px-6 py-3 lg:hidden">
          {LINKS.concat([{ href: "/compte", label: "Mon compte" }]).map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block py-2.5 font-semibold text-encre">
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
