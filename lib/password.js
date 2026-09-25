/**
 * Règles de robustesse du mot de passe.
 *
 * ⚠️ Cette validation s'exécute dans le navigateur : elle guide l'utilisateur
 * mais ne protège de rien, puisqu'on peut appeler l'API directement. La vraie
 * barrière se règle dans Supabase :
 *   Authentication > Sign In / Providers > Password
 *   → Minimum password length : 12
 *   → Required characters : lettres minuscules, majuscules, chiffres, symboles
 * Les deux doivent rester cohérentes.
 */

export const LONGUEUR_MINIMALE = 12;

export const REGLES = [
  {
    id: "longueur",
    libelle: `Au moins ${LONGUEUR_MINIMALE} caractères`,
    test: (v) => v.length >= LONGUEUR_MINIMALE,
  },
  {
    id: "minuscule",
    libelle: "Une lettre minuscule",
    test: (v) => /[a-zà-öø-ÿ]/.test(v),
  },
  {
    id: "majuscule",
    libelle: "Une lettre majuscule",
    test: (v) => /[A-ZÀ-ÖØ-Þ]/.test(v),
  },
  {
    id: "chiffre",
    libelle: "Un chiffre",
    test: (v) => /\d/.test(v),
  },
  {
    id: "special",
    libelle: "Un caractère spécial (!?*#@…)",
    test: (v) => /[^\w\sÀ-ÿ]/.test(v),
  },
];

/** Renvoie l'état de chaque règle pour un mot de passe donné. */
export function evaluerMotDePasse(valeur = "") {
  const resultats = REGLES.map((regle) => ({
    ...regle,
    valide: regle.test(valeur),
  }));
  return {
    regles: resultats,
    valide: resultats.every((r) => r.valide),
    nbValides: resultats.filter((r) => r.valide).length,
  };
}

/** Mots de passe trop évidents, refusés quelle que soit leur composition. */
const INTERDITS = [
  "motdepasse", "password", "azerty", "qwerty", "123456",
  "healthybox", "healthy-box",
];

export function estTropCourant(valeur = "") {
  const v = valeur.toLowerCase();
  return INTERDITS.some((mot) => v.includes(mot));
}
