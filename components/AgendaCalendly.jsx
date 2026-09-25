"use client";

import Script from "next/script";
import { useState } from "react";

/**
 * Agenda Calendly intégré à la page.
 *
 * Calendly gère les disponibilités réelles, les fuseaux horaires, les
 * confirmations et les rappels : on n'a donc plus à maintenir nos propres
 * créneaux. L'URL se règle par variable d'environnement pour pouvoir changer
 * de lien sans toucher au code.
 */
export default function AgendaCalendly({ url }) {
  const [scriptCharge, setScriptCharge] = useState(false);
  const [erreur, setErreur] = useState(false);

  if (!url) {
    return (
      <div className="carte p-8 text-center">
        <p className="mb-2 font-bold text-encre">Agenda non configuré</p>
        <p className="text-sm text-ardoise">
          Renseignez <code>NEXT_PUBLIC_CALENDLY_URL</code> dans les variables
          d&apos;environnement pour afficher les disponibilités.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Paramètres d'affichage : on masque les détails déjà donnés sur la page */}
      <div
        className="calendly-inline-widget min-h-[720px] w-full overflow-hidden rounded-2xl border border-black/[0.07] bg-white"
        data-url={`${url}?hide_gdpr_banner=1&background_color=ffffff&primary_color=C2184B&text_color=3C4238`}
        aria-label="Agenda de réservation"
      />

      {!scriptCharge && !erreur && (
        <p className="mt-4 text-center text-sm text-ardoise" role="status">
          Chargement des disponibilités…
        </p>
      )}

      {erreur && (
        <div className="mt-4 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-4 text-sm">
          <p className="mb-2 font-semibold">L&apos;agenda n&apos;a pas pu se charger.</p>
          <p>
            Votre navigateur ou une extension bloque peut-être Calendly. Vous
            pouvez réserver directement sur{" "}
            <a href={url} target="_blank" rel="noopener noreferrer" className="font-semibold text-framboise underline">
              cette page
            </a>
            .
          </p>
        </div>
      )}

      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
        onLoad={() => setScriptCharge(true)}
        onError={() => setErreur(true)}
      />

      {/* Lien de repli, toujours présent : un agenda embarqué reste difficile
          d'accès pour certaines aides techniques. */}
      <p className="mt-6 text-center text-sm text-ardoise">
        L&apos;agenda ne s&apos;affiche pas correctement ?{" "}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-framboise underline underline-offset-2"
        >
          Ouvrir la page de réservation
        </a>
      </p>
    </>
  );
}
