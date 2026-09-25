/**
 * Pictogrammes au trait, dans l'esprit des stories Instagram :
 * une pastille pastel, un tracé fin, pas de remplissage.
 */
const TRAITS = {
  // Bénéfices
  horloge: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></>,
  lotus: (
    <>
      <path d="M12 20c-3.5 0-6.5-2.4-7.5-5.5 2.6-1 5.4-.2 7.5 2 2.1-2.2 4.9-3 7.5-2C18.5 17.6 15.5 20 12 20Z" />
      <path d="M12 16.5c-1.2-2.6-1-5.6.8-8 .3-.4.9-.4 1.2 0 1.8 2.4 2 5.4.8 8" />
    </>
  ),
  coeur: <path d="M12 19.5 4.8 12.6a4.3 4.3 0 0 1 6.1-6l1.1 1.1 1.1-1.1a4.3 4.3 0 0 1 6.1 6L12 19.5Z" />,
  feuille: (
    <>
      <path d="M19 5c0 7.5-4 11.5-9.5 11.5C7 16.5 5 14.5 5 12 5 7 10.5 5 19 5Z" />
      <path d="M15 9 6 19" />
    </>
  ),
  // Étapes
  ordinateur: (
    <>
      <rect x="3.5" y="5.5" width="17" height="11" rx="1.5" />
      <path d="M2 19.5h20" />
    </>
  ),
  toque: (
    <>
      <path d="M7 19v-4.6A4.2 4.2 0 0 1 6 7.2a3.6 3.6 0 0 1 6-2.4 3.6 3.6 0 0 1 6 2.4 4.2 4.2 0 0 1-1 7.2V19" />
      <path d="M7 19h10" />
    </>
  ),
  camion: (
    <>
      <path d="M2.5 7.5h11v9h-11z" />
      <path d="M13.5 11h4l3 3v2.5h-7z" />
      <circle cx="7" cy="18" r="1.6" />
      <circle cx="17" cy="18" r="1.6" />
    </>
  ),
  poele: (
    <>
      <path d="M3.5 12.5h12a0 0 0 0 1 0 0v1.5a6 6 0 0 1-6 6h0a6 6 0 0 1-6-6v-1.5Z" />
      <path d="M15.5 14h5" />
      <path d="M7 9c0-1.2 1-1.6 1-2.8S7 3.8 7 3.8M11 9c0-1.2 1-1.6 1-2.8s-1-2.4-1-2.4" />
    </>
  ),
};

export default function Picto({ nom, fond = "bg-rose", className = "" }) {
  return (
    <span className={`pastille ${fond} ${className}`} aria-hidden="true">
      <svg
        className="h-8 w-8 text-framboise"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {TRAITS[nom]}
      </svg>
    </span>
  );
}
