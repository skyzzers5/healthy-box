"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { evaluerMotDePasse, estTropCourant, LONGUEUR_MINIMALE } from "@/lib/password";

const MESSAGES_ERREUR_URL = {
  lien_invalide: "Ce lien est incomplet. Demandez-en un nouveau.",
  lien_expire: "Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.",
};

export default function FormulaireConnexion() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const suite = searchParams.get("suite") || "/compte";
  const erreurUrl = searchParams.get("erreur");

  const [mode, setMode] = useState("connexion"); // connexion | inscription | oubli
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState(
    erreurUrl ? MESSAGES_ERREUR_URL[erreurUrl] ?? "Lien invalide." : ""
  );
  const [typeMessage, setTypeMessage] = useState(erreurUrl ? "error" : null);

  const force = evaluerMotDePasse(password);

  function afficher(type, texte) {
    setTypeMessage(type);
    setMessage(texte);
    setStatus(type === "error" ? "error" : "success");
  }

  // ---------- Google ----------
  async function connexionGoogle() {
    setStatus("loading");
    setMessage("");
    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(suite)}`,
      },
    });

    if (error) {
      afficher("error", "Connexion Google impossible pour le moment.");
    }
    // En cas de succès le navigateur part chez Google : rien à faire ici.
  }

  // ---------- Email + mot de passe ----------
  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const supabase = createClient();

    // --- Mot de passe oublié ---
    if (mode === "oubli") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reinitialiser-mot-de-passe`,
      });

      if (error) {
        afficher("error", traduireErreur(error.message));
        return;
      }

      // Réponse volontairement identique que l'adresse existe ou non :
      // sinon ce formulaire permettrait de savoir qui est client.
      afficher(
        "success",
        "Si un compte existe avec cette adresse, un lien de réinitialisation vient d'être envoyé. Pensez à regarder vos indésirables."
      );
      return;
    }

    // --- Inscription ---
    if (mode === "inscription") {
      if (!force.valide) {
        afficher("error", "Votre mot de passe ne respecte pas encore toutes les règles.");
        return;
      }
      if (estTropCourant(password)) {
        afficher("error", "Ce mot de passe est trop courant. Choisissez-en un autre.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(suite)}`,
        },
      });

      if (error) {
        afficher("error", traduireErreur(error.message));
        return;
      }

      // Session immédiate = la confirmation par email est désactivée côté Supabase.
      if (data.session) {
        router.push(suite);
        router.refresh();
        return;
      }

      afficher(
        "success",
        `Un email de confirmation vient d'être envoyé à ${email}. Cliquez sur le lien qu'il contient pour activer votre compte.`
      );
      setMode("connexion");
      setPassword("");
      return;
    }

    // --- Connexion ---
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      afficher("error", traduireErreur(error.message));
      return;
    }

    router.push(suite);
    router.refresh();
  }

  const titres = {
    connexion: "Connexion",
    inscription: "Créer un compte",
    oubli: "Mot de passe oublié",
  };
  const sousTitres = {
    connexion: "Accédez à votre abonnement et à vos livraisons.",
    inscription: "Quelques secondes suffisent pour commencer.",
    oubli: "Indiquez votre adresse : nous vous enverrons un lien pour choisir un nouveau mot de passe.",
  };

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <div className="carte p-8">
        <h1 className="mb-2 text-center text-3xl">{titres[mode]}</h1>
        <p className="mb-6 text-center text-sm text-ardoise">{sousTitres[mode]}</p>

        {mode !== "oubli" && (
          <>
            <button
              type="button"
              onClick={connexionGoogle}
              disabled={status === "loading"}
              className="mb-5 flex w-full items-center justify-center gap-3 rounded-full border-2 border-black/15 bg-white px-6 py-3 font-semibold text-encre transition-colors hover:border-black/40 disabled:opacity-45"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z" />
                <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z" />
                <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.7l4-3Z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z" />
              </svg>
              Continuer avec Google
            </button>

            <div className="mb-5 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-black/10" />
              <span className="text-xs uppercase tracking-wider text-ardoise/70">ou</span>
              <span className="h-px flex-1 bg-black/10" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {mode === "inscription" && (
            <div className="mb-4">
              <label htmlFor="nom" className="field-label">Nom complet</label>
              <input
                id="nom"
                type="text"
                autoComplete="name"
                className="field-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="field-label">Adresse email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode !== "oubli" && (
            <div className="mb-6">
              <label htmlFor="motdepasse" className="field-label">Mot de passe</label>
              <input
                id="motdepasse"
                type="password"
                autoComplete={mode === "connexion" ? "current-password" : "new-password"}
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-describedby={mode === "inscription" ? "regles-mdp" : undefined}
                required
              />

              {mode === "inscription" && (
                <div id="regles-mdp" className="mt-3">
                  <p className="mb-2 text-xs font-semibold text-ardoise">
                    Votre mot de passe doit contenir :
                  </p>
                  <ul className="m-0 list-none space-y-1 p-0">
                    {force.regles.map((regle) => (
                      <li
                        key={regle.id}
                        className={`flex items-center gap-2 text-xs ${
                          regle.valide ? "text-framboise" : "text-ardoise/75"
                        }`}
                      >
                        <span aria-hidden="true" className="w-3">
                          {regle.valide ? "✓" : "○"}
                        </span>
                        {regle.libelle}
                      </li>
                    ))}
                  </ul>
                  <p aria-live="polite" className="sr-only">
                    {force.nbValides} règle(s) sur {force.regles.length} respectée(s).
                  </p>
                </div>
              )}

              {mode === "connexion" && (
                <p className="mt-3 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("oubli");
                      setMessage("");
                      setTypeMessage(null);
                      setStatus("idle");
                    }}
                    className="text-sm font-semibold text-framboise underline underline-offset-2"
                  >
                    J&apos;ai oublié mon mot de passe
                  </button>
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading" || (mode === "inscription" && !force.valide)}
            className="btn-primary w-full"
          >
            {status === "loading"
              ? "Un instant…"
              : mode === "connexion"
              ? "Se connecter"
              : mode === "inscription"
              ? "Créer mon compte"
              : "Envoyer le lien"}
          </button>
        </form>

        {message && (
          <p
            role={typeMessage === "error" ? "alert" : "status"}
            className={`mt-4 rounded-xl border-2 px-4 py-3 text-sm ${
              typeMessage === "error"
                ? "border-red-400 bg-red-50"
                : "border-framboise bg-framboise-soft"
            }`}
          >
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-sm">
          {mode === "oubli" ? (
            <button
              type="button"
              onClick={() => {
                setMode("connexion");
                setMessage("");
                setTypeMessage(null);
                setStatus("idle");
              }}
              className="font-semibold text-framboise underline underline-offset-2"
            >
              Revenir à la connexion
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode(mode === "connexion" ? "inscription" : "connexion");
                setMessage("");
                setTypeMessage(null);
                setStatus("idle");
              }}
              className="font-semibold text-framboise underline underline-offset-2"
            >
              {mode === "connexion" ? "Créer un compte" : "J'ai déjà un compte"}
            </button>
          )}
        </p>
      </div>
    </div>
  );
}

function traduireErreur(message = "") {
  if (message.includes("Invalid login credentials")) {
    return "Email ou mot de passe incorrect.";
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return "Un compte existe déjà avec cette adresse email.";
  }
  if (message.includes("Email not confirmed")) {
    return "Votre adresse email n'a pas encore été confirmée. Vérifiez votre boîte mail, y compris les indésirables.";
  }
  if (message.includes("Password should be at least")) {
    return `Votre mot de passe doit contenir au moins ${LONGUEUR_MINIMALE} caractères.`;
  }
  if (message.includes("rate limit") || message.includes("Too many")) {
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  }
  return "Une erreur est survenue. Réessayez dans un instant.";
}
