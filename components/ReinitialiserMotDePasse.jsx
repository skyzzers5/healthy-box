"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { evaluerMotDePasse, estTropCourant } from "@/lib/password";

/**
 * Choix d'un nouveau mot de passe.
 *
 * On arrive ici depuis le lien reçu par email, après que /auth/callback a
 * échangé le code contre une session. Sans session valide, la page refuse
 * la modification : c'est ce qui empêche n'importe qui de changer le mot de
 * passe d'un autre en devinant l'URL.
 */
export default function ReinitialiserMotDePasse() {
  const router = useRouter();
  const [sessionValide, setSessionValide] = useState(null); // null = en cours
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const force = evaluerMotDePasse(password);
  const identiques = password.length > 0 && password === confirmation;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSessionValide(Boolean(data.session));
    });
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!force.valide) {
      setStatus("error");
      setMessage("Votre mot de passe ne respecte pas encore toutes les règles.");
      return;
    }
    if (estTropCourant(password)) {
      setStatus("error");
      setMessage("Ce mot de passe est trop courant. Choisissez-en un autre.");
      return;
    }
    if (!identiques) {
      setStatus("error");
      setMessage("Les deux mots de passe ne sont pas identiques.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus("error");
      setMessage(
        error.message.includes("same as the old")
          ? "Ce mot de passe est identique à l'ancien. Choisissez-en un autre."
          : "Modification impossible. Le lien a peut-être expiré : demandez-en un nouveau."
      );
      return;
    }

    setStatus("success");
    setMessage("Mot de passe modifié. Redirection vers votre espace client…");
    setTimeout(() => {
      router.push("/compte");
      router.refresh();
    }, 1600);
  }

  if (sessionValide === null) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <p className="carte p-8 text-center text-ardoise">Vérification du lien…</p>
      </div>
    );
  }

  if (!sessionValide) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <div className="carte p-8 text-center">
          <h1 className="mb-3 text-2xl">Lien invalide ou expiré</h1>
          <p className="mb-6 text-sm text-ardoise">
            Les liens de réinitialisation sont valables une heure et ne servent
            qu&apos;une fois. Demandez-en un nouveau depuis la page de connexion.
          </p>
          <Link href="/connexion" className="btn-primary">Retour à la connexion</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <div className="carte p-8">
        <h1 className="mb-2 text-center text-3xl">Nouveau mot de passe</h1>
        <p className="mb-6 text-center text-sm text-ardoise">
          Choisissez un mot de passe que vous n&apos;utilisez nulle part ailleurs.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="nouveau" className="field-label">Nouveau mot de passe</label>
            <input
              id="nouveau"
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby="regles"
              required
            />
            <div id="regles" className="mt-3">
              <ul className="m-0 list-none space-y-1 p-0">
                {force.regles.map((regle) => (
                  <li
                    key={regle.id}
                    className={`flex items-center gap-2 text-xs ${
                      regle.valide ? "text-framboise" : "text-ardoise/75"
                    }`}
                  >
                    <span aria-hidden="true" className="w-3">{regle.valide ? "✓" : "○"}</span>
                    {regle.libelle}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="confirmation" className="field-label">Confirmez le mot de passe</label>
            <input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              className="field-input"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
            />
            {confirmation.length > 0 && !identiques && (
              <p className="mt-2 text-xs text-red-700">
                Les deux mots de passe ne sont pas identiques.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={status === "loading" || status === "success" || !force.valide || !identiques}
            className="btn-primary w-full"
          >
            {status === "loading" ? "Enregistrement…" : "Enregistrer mon mot de passe"}
          </button>
        </form>

        {message && (
          <p
            role={status === "error" ? "alert" : "status"}
            className={`mt-4 rounded-xl border-2 px-4 py-3 text-sm ${
              status === "error" ? "border-red-400 bg-red-50" : "border-framboise bg-framboise-soft"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
