"use client";

import { useRouter } from "next/navigation";

/** Choix de la date, avec navigation jour par jour et impression. */
export default function SelecteurDate({ date, base }) {
  const router = useRouter();

  function decaler(jours) {
    const [y, m, d] = date.split("-").map(Number);
    const nouvelle = new Date(y, m - 1, d + jours);
    const iso = `${nouvelle.getFullYear()}-${String(nouvelle.getMonth() + 1).padStart(2, "0")}-${String(
      nouvelle.getDate()
    ).padStart(2, "0")}`;
    router.push(`${base}?date=${iso}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <button
        type="button"
        onClick={() => decaler(-1)}
        className="h-11 w-11 rounded-full border-2 border-black/20 text-lg font-bold hover:border-black/50"
      >
        <span className="sr-only">Jour précédent</span>
        <span aria-hidden="true">‹</span>
      </button>

      <div>
        <label htmlFor="date-selection" className="field-label">Date</label>
        <input
          id="date-selection"
          type="date"
          className="field-input"
          value={date}
          onChange={(e) => e.target.value && router.push(`${base}?date=${e.target.value}`)}
        />
      </div>

      <button
        type="button"
        onClick={() => decaler(1)}
        className="h-11 w-11 rounded-full border-2 border-black/20 text-lg font-bold hover:border-black/50"
      >
        <span className="sr-only">Jour suivant</span>
        <span aria-hidden="true">›</span>
      </button>

      <button type="button" onClick={() => window.print()} className="btn-outline ml-2 text-sm">
        Imprimer
      </button>
    </div>
  );
}
