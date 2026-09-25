"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GestionAbonnement({ subscription }) {
  const router = useRouter();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  async function run(action) {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/abonnement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, subscriptionId: subscription.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setMessage(data.error || "Action impossible.");
        return;
      }

      setStatus("success");
      setMessage(data.message || "Votre demande a bien été prise en compte.");
      setConfirmingCancel(false);
      // Le statut définitif arrive via le webhook Stripe : on recharge après un court délai.
      setTimeout(() => router.refresh(), 1500);
    } catch {
      setStatus("error");
      setMessage("Connexion impossible. Réessayez dans un instant.");
    }
  }

  const suspended = subscription.status === "suspended";
  const cancelled = subscription.status === "cancelled";
  const busy = status === "loading";

  return (
    <section className="carte p-6" aria-labelledby="gestion">
      <h2 id="gestion" className="mb-2 text-xl font-bold">Gérer mon abonnement</h2>
      <p className="mb-4 text-sm text-ardoise/85">
        Suspendez temporairement vos livraisons ou annulez, sans avoir à nous appeler.
      </p>

      {!cancelled && (
        <>
          <button
            type="button"
            onClick={() => run(suspended ? "reactiver" : "suspendre")}
            disabled={busy}
            className="btn-outline mb-3 w-full text-sm"
          >
            {busy ? "Un instant…" : suspended ? "Réactiver mon abonnement" : "Suspendre mon abonnement"}
          </button>

          {confirmingCancel ? (
            <div className="rounded-xl border-2 border-red-400 bg-red-50 p-4">
              <p className="mb-3 text-sm font-semibold">
                Confirmer l&apos;annulation de votre abonnement ?
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => run("annuler")} disabled={busy}
                  className="flex-1 rounded-full border-2 border-red-600 bg-red-600 px-4 py-2 text-sm font-semibold text-white">
                  Oui, annuler
                </button>
                <button type="button" onClick={() => setConfirmingCancel(false)} disabled={busy}
                  className="flex-1 rounded-full border-2 border-framboise px-4 py-2 text-sm font-semibold">
                  Non, garder
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingCancel(true)}
              disabled={busy}
              className="w-full rounded-full border-2 border-framboise px-6 py-3 text-sm font-semibold text-framboise transition-all hover:bg-red-50 disabled:opacity-45"
            >
              Annuler mon abonnement
            </button>
          )}
        </>
      )}

      {cancelled && (
        <p className="text-sm text-ardoise/85">
          Cet abonnement est annulé. Vous pouvez en créer un nouveau à tout moment.
        </p>
      )}

      {message && (
        <p role={status === "error" ? "alert" : "status"}
          className={`mt-4 rounded-xl border-2 px-4 py-3 text-sm ${
            status === "error" ? "border-red-400 bg-red-50" : "border-framboise bg-framboise-soft"
          }`}>
          {message}
        </p>
      )}
    </section>
  );
}
