import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-peche py-16 text-encre">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 grid gap-10 md:grid-cols-4">
          <div>
            <p className="logo-marque mb-1 text-xl">Healthy Box</p>
            <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-ardoise">
              Des repas simples pour une vie plus saine
            </p>
            <p className="text-sm leading-relaxed text-ardoise">
              Des box repas équilibrées, préparées à Ajaccio et validées par une
              naturopathe. Livrées partout en Corse.
            </p>
          </div>
          <nav aria-label="Nos box">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-framboise">Nos box</h2>
            <ul className="space-y-2.5 text-sm text-ardoise">
              <li><Link href="/formules?box=diabete" className="hover:text-framboise">Box diabète</Link></li>
              <li><Link href="/formules?box=antiinflam" className="hover:text-framboise">Box anti-inflammatoire</Link></li>
              <li><Link href="/menu" className="hover:text-framboise">Nos recettes</Link></li>
            </ul>
          </nav>
          <nav aria-label="Services">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-framboise">Services</h2>
            <ul className="space-y-2.5 text-sm text-ardoise">
              <li><Link href="/livraison" className="hover:text-framboise">Zones de livraison</Link></li>
              <li><Link href="/rdv" className="hover:text-framboise">RDV naturopathe</Link></li>
              <li><Link href="/compte" className="hover:text-framboise">Gérer mon abonnement</Link></li>
            </ul>
          </nav>
          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-framboise">Mentions</h2>
            <p className="text-sm leading-relaxed text-ardoise">
              CGV, politique de confidentialité et mentions légales à rédiger
              avant l&apos;ouverture au public.
            </p>
          </div>
        </div>
        <div className="mb-10 flex justify-center">
          <a
            href="https://www.instagram.com/healthy.box.corse/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 rounded-full border-2 border-framboise px-5 py-2.5 font-semibold text-framboise transition-colors hover:bg-framboise hover:text-white"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
            </svg>
            Suivez-nous sur Instagram
          </a>
        </div>

        <div className="border-t border-black/10 pt-8 text-center text-sm text-ardoise">
          <p>Healthy Box — Corse. Nos box ne remplacent pas un suivi médical.</p>
        </div>
      </div>
    </footer>
  );
}
