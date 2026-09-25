// Puce cochée réutilisée dans les listes d'arguments.
export default function Coche({ children }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg
        className="mt-0.5 h-5 w-5 flex-shrink-0 text-framboise"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5l4 4 8-9" />
      </svg>
      <span>{children}</span>
    </li>
  );
}
