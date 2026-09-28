"use client";

import { useState } from "react";
import { PROMO_LABELS } from "@/lib/pricing";

/**
 * Saisie d'un code promo. La vérification se fait côté serveur : le
 * navigateur ne connaît jamais la liste des codes.
 */
export default function ChampCodePromo({ isLoggedIn, promo, onChange }) {
  const [ouvert, setOuvert] = useState(Boolean(promo));
  const [saisie, setSaisie] = useState(promo?.code ?? "");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function verifier(event) {
    event.preventDefault();
    if (!saisie.trim()) return;

    if (!isLoggedIn) {
      setStatus("error");
      setMessage("Connectez-vous pour utiliser un code promo.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const reponse = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: saisie.trim() }),
      });
      const data = await reponse.json();

      if (!reponse.ok) {
        setStatus("error");
        setMessage(data.error || "Code invalide.");
        onChange(null);
        return;
      }

      setStatus("success");
      setMessage(`${PROMO_LABELS[data.effect] ?? "Code appliqué"} !`);
      onChange({ code: data.code, effect: data.effect });
    } catch {
      setStatus("error");
      setMessage("Vérification impossible. Réessayez dans un instant.");
    }
  }

  function retirer() {
    onChange(null);
    setSaisie("");
    setStatus("idle");
    setMessage("");
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="text-sm font-semibold text-framboise underline underline-offset-2"
      >
        J&apos;ai un code promo
      </button>
    );
  }

  return (
    <div>
      {promo ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-framboise bg-framboise-soft px-4 py-3">
          <p className="text-sm">
            <span className="font-bold">{promo.code}</span> —{" "}
            {PROMO_LABELS[promo.effect] ?? "code appliqué"}
          </p>
          <button
            type="button"
            onClick={retirer}
            className="ml-auto text-sm font-semibold underline underline-offset-2"
          >
            Retirer
          </button>
        </div>
      ) : (
        <form onSubmit={verifier} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[160px] flex-1">
            <label htmlFor="code-promo" className="field-label">Code promo</label>
            <input
              id="code-promo"
              type="text"
              autoCapitalize="characters"
              className="field-input uppercase"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value)}
              aria-describedby={message ? "message-promo" : undefined}
            />
          </div>
          <button type="submit" disabled={status === "loading"} className="btn-outline text-sm">
            {status === "loading" ? "Vérification…" : "Appliquer"}
          </button>
        </form>
      )}

      {message && (
        <p
          id="message-promo"
          role={status === "error" ? "alert" : "status"}
          className={`mt-2 text-sm ${status === "error" ? "text-red-700" : "text-framboise"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
