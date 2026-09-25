import { Suspense } from "react";
import FormulaireConnexion from "@/components/FormulaireConnexion";

export const metadata = { title: "Connexion — Healthy Box" };

export default function ConnexionPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-6 py-24">Chargement…</div>}>
      <FormulaireConnexion />
    </Suspense>
  );
}
