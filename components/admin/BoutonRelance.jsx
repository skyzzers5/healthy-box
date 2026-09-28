"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BoutonRelance({ subscriptionId, dejaEnvoyee }) {
  const router = useRouter();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  async function relancer() {
    setStatus("loading");
    setMessage("");

    try {
      const reponse = await fetch("/api/admin/relance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });
      const data = await reponse.json();

      if (!reponse.ok) {
        setStatus("error");
        setMessage(data.error || "Échec de l'envoi.");
        return;
      }

      setStatus("success");
      setMessage("Relance envoyée.");
      setTimeout(() => router.refresh(), 1200);
    } catch {
      setStatus("error");
      setMessage("Connexion impossible.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={relancer}
        disabled={status === "loading" || status === "success"}
        className="rounded-full border-2 border-framboise px-4 py-2 text-xs font-semibold text-framboise hover:bg-framboise-soft disabled:opacity-45"
      >
        {status === "loading" ? "Envoi…" : dejaEnvoyee ? "Relancer à nouveau" : "Relancer"}
      </button>
      {message && (
        <p
          role={status === "error" ? "alert" : "status"}
          className={`mt-1 text-xs ${status === "error" ? "text-red-700" : "text-framboise"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
