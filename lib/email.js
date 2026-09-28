/**
 * Envoi d'emails transactionnels via Resend.
 *
 * Pourquoi pas Supabase : son service intégré est limité à quelques messages
 * par heure et n'est pas prévu pour la production. Resend fonctionne depuis
 * Vercel sans dépendance supplémentaire, avec un simple appel HTTP.
 *
 * Sans RESEND_API_KEY, les fonctions renvoient un échec explicite plutôt que
 * de faire croire à un envoi réussi.
 */
const ENDPOINT = "https://api.resend.com/emails";

export function emailConfigure() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_EXPEDITEUR);
}

export async function envoyerEmail({ destinataire, sujet, html, texte }) {
  if (!emailConfigure()) {
    return {
      ok: false,
      error:
        "Service d'emails non configuré : renseignez RESEND_API_KEY et EMAIL_EXPEDITEUR.",
    };
  }

  try {
    const reponse = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_EXPEDITEUR,
        to: [destinataire],
        subject: sujet,
        html,
        text: texte,
      }),
    });

    if (!reponse.ok) {
      const detail = await reponse.text();
      console.error("Échec d'envoi d'email :", detail);
      return { ok: false, error: "L'envoi a échoué." };
    }

    return { ok: true };
  } catch (error) {
    console.error("Erreur réseau lors de l'envoi :", error);
    return { ok: false, error: "L'envoi a échoué." };
  }
}

/** Contenu de la relance de panier abandonné. */
export function emailPanierAbandonne({ prenom, boxLabel, lienReprise }) {
  const bonjour = prenom ? `Bonjour ${prenom},` : "Bonjour,";

  const texte = `${bonjour}

Vous avez composé votre ${boxLabel} sur Healthy Box, mais la commande n'a pas été finalisée.

Votre sélection vous attend, il ne reste qu'à confirmer : ${lienReprise}

Si vous avez une question ou une hésitation, répondez simplement à cet email.

À bientôt,
L'équipe Healthy Box`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#3C4238;line-height:1.6">
    <p style="font-size:22px;font-weight:bold;color:#C2184B;margin-bottom:24px">Healthy Box</p>
    <p>${bonjour}</p>
    <p>Vous avez composé votre <strong>${boxLabel}</strong> sur Healthy Box, mais la commande n'a pas été finalisée.</p>
    <p>Votre sélection vous attend, il ne reste qu'à confirmer.</p>
    <p style="margin:28px 0">
      <a href="${lienReprise}"
         style="background:#C2184B;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold;display:inline-block">
        Reprendre ma commande
      </a>
    </p>
    <p>Si vous avez une question ou une hésitation, répondez simplement à cet email.</p>
    <p style="margin-top:28px">À bientôt,<br>L'équipe Healthy Box</p>
  </div>`;

  return { texte, html };
}
