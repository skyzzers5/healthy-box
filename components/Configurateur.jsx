"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  BOX_TYPES,
  PLANS,
  LIMITS,
  priceBreakdown,
  mealPrice,
  formatEuros,
} from "@/lib/pricing";
import { formatCreneau, dayLabel, formatLongDate } from "@/lib/delivery";
import EtapeLivraison from "@/components/EtapeLivraison";
import EtapeRecettes from "@/components/EtapeRecettes";
import Coche from "@/components/Coche";

export default function Configurateur({
  zones,
  recipes = [],
  isLoggedIn,
  boxParDefaut = null,
  compte = null,
}) {
  const router = useRouter();

  // 1 & 2 — taille
  const [peopleCount, setPeopleCount] = useState(2);
  const [mealsPerWeek, setMealsPerWeek] = useState(3);

  // 3 — type de box (présélectionnable via /formules?box=diabete)
  const [boxCategory, setBoxCategory] = useState(
    boxParDefaut && BOX_TYPES[boxParDefaut] ? boxParDefaut : null
  );

  // 5 — durée d'engagement
  const [plan, setPlan] = useState("unite");

  // 4 — livraison, regroupée dans un seul objet
  const [livraison, setLivraison] = useState({
    postalCode: "", zone: null, weekday: null, firstDate: null,
    slot: "matin", street: "", notes: "",
    // pré-rempli depuis le profil quand on est connecté
    phone: compte?.phone ?? "",
  });

  // 5 — recettes choisies : tableau d'identifiants, répétitions autorisées
  const [recipeIds, setRecipeIds] = useState([]);

  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const detail = priceBreakdown({
    peopleCount,
    mealsPerWeek,
    depositAlreadyPaid: Boolean(compte?.depositPaid),
  });

  const recettesCompletes = recipeIds.length === mealsPerWeek;

  const pret = Boolean(
    boxCategory &&
      livraison.zone &&
      livraison.weekday &&
      livraison.firstDate &&
      livraison.street.trim() &&
      livraison.phone?.trim() &&
      recettesCompletes
  );

  function ajuster(cle, valeur, min, max, libelle) {
    const suivant = Math.min(max, Math.max(min, valeur));
    if (cle === "people") {
      setPeopleCount(suivant);
    } else {
      setMealsPerWeek(suivant);
      // on ne garde que les premières recettes si le nombre de plats diminue
      setRecipeIds((actuel) => actuel.slice(0, suivant));
    }
    setAnnouncement(`${libelle} : ${suivant}.`);
  }

  async function payer() {
    if (!pret || status === "loading") return;

    if (!isLoggedIn) {
      router.push("/connexion?suite=/formules");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const reponse = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boxCategory, plan, peopleCount, mealsPerWeek,
          postalCode: livraison.postalCode,
          street: livraison.street.trim(),
          notes: livraison.notes?.trim() ?? "",
          weekday: livraison.weekday,
          slot: livraison.slot,
          firstDate: livraison.firstDate,
          contactPhone: livraison.phone?.trim(),
          recipeIds,
        }),
      });
      const data = await reponse.json();

      if (!reponse.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Une erreur est survenue.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setStatus("error");
      setErrorMessage("Connexion impossible. Vérifiez votre réseau puis réessayez.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <p className="eyebrow">Votre box sur mesure</p>
      <h1 className="font-bold mb-3 text-5xl sm:text-6xl">Composez votre box</h1>
      <p className="mb-12 max-w-xl leading-relaxed">
        Le prix se met à jour à chaque choix. Rien n&apos;est prélevé avant la
        page de paiement sécurisée.
      </p>

      <p aria-live="polite" className="sr-only">{announcement}</p>

      {/* ÉTAPE 1 & 2 — taille */}
      <Section numero="1" titre="Pour combien de personnes ?">
        <div className="flex flex-wrap gap-6">
          <Compteur
            id="personnes" label="Nombre de personnes" valeur={peopleCount}
            min={LIMITS.people.min} max={LIMITS.people.max}
            onChange={(v) => ajuster("people", v, LIMITS.people.min, LIMITS.people.max, "Personnes")}
          />
          <Compteur
            id="plats" label="Plats par semaine" valeur={mealsPerWeek}
            min={LIMITS.meals.min} max={LIMITS.meals.max}
            onChange={(v) => ajuster("meals", v, LIMITS.meals.min, LIMITS.meals.max, "Plats par semaine")}
          />
        </div>
        <p className="mt-4 text-sm text-ardoise/85">
          Soit <strong>{peopleCount * mealsPerWeek} portions</strong> par semaine.
        </p>
      </Section>

      {/* ÉTAPE 3 — type de box */}
      <Section numero="2" titre="Quelle box vous correspond ?">
        <div role="group" aria-label="Type de box" className="grid gap-6 md:grid-cols-2">
          {Object.entries(BOX_TYPES).map(([cle, box]) => {
            const actif = boxCategory === cle;
            return (
              <button
                key={cle}
                type="button"
                aria-pressed={actif}
                onClick={() => {
                  setBoxCategory(cle);
                  // les recettes dépendent de la box : on repart de zéro
                  setRecipeIds([]);
                  setAnnouncement(`${box.label} sélectionnée.`);
                }}
                className={`carte overflow-hidden text-left transition-colors ${
                  actif ? "border-2 border-framboise" : "hover:border-black/25"
                }`}
              >
                <span className="relative block aspect-[4/3] bg-sable">
                  <Image src={box.thumbnail ?? box.image} alt={box.imageAlt} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
                </span>
                <span className="block p-5">
                  <span className="mb-1 block text-xl font-bold text-encre">{box.label}</span>
                  <span className="mb-3 block text-sm">{box.baseline}</span>
                  <span className="block font-bold text-framboise">
                    {formatEuros(mealPrice())}{" "}
                    <span className="text-sm font-normal text-ardoise/85">le repas</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ÉTAPE 4 — livraison */}
      <Section numero="3" titre="Où et quand vous livrer ?">
        <EtapeLivraison
          zones={zones}
          valeur={livraison}
          onChange={setLivraison}
          onAnnonce={setAnnouncement}
        />
      </Section>

      {/* ÉTAPE 5 — recettes */}
      <Section numero="4" titre="Choisissez vos plats">
        <EtapeRecettes
          recipes={recipes}
          boxCategory={boxCategory}
          mealsPerWeek={mealsPerWeek}
          selection={recipeIds}
          onChange={setRecipeIds}
          onAnnonce={setAnnouncement}
        />
      </Section>

      {/* ÉTAPE 6 — engagement */}
      <Section numero="5" titre="Avec ou sans engagement ?">
        <p className="mb-4 text-sm text-ardoise/85">
          Le prix au repas est le même quelle que soit la durée. Vous pouvez
          suspendre vos livraisons à tout moment, et annuler dans les conditions
          prévues par votre engagement.
        </p>
        <div role="group" aria-label="Durée d'engagement" className="flex flex-wrap gap-3">
          {Object.entries(PLANS).map(([cle, p]) => {
            const actif = plan === cle;
            return (
              <button
                key={cle}
                type="button"
                aria-pressed={actif}
                onClick={() => {
                  setPlan(cle);
                  setAnnouncement(`Engagement ${p.label}.`);
                }}
                className={`min-w-[140px] flex-1 rounded-2xl border-2 p-4 text-center transition-colors ${
                  actif ? "border-framboise bg-framboise-soft" : "border-black/15 hover:border-black/40"
                }`}
              >
                <span className="block font-bold">{p.label}</span>
                <span className="mt-1 block text-xs text-ardoise/80">
                  {p.months === 0 ? "sans engagement" : "suspension possible"}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Récapitulatif */}
      <div className="sticky bottom-4 mt-12 rounded-2xl bg-peche p-6 text-white shadow-lg sm:p-8">
        <h2 className="font-bold mb-4 text-3xl text-white">Votre commande</h2>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Détail des montants */}
          <div>
            <dl className="m-0 space-y-2 text-sm">
              <Ligne label={detail.meals.label} montant={detail.meals.amount} />
              <Ligne label={detail.delivery.label} montant={detail.delivery.amount} />
              {detail.deposit && (
                <Ligne label={detail.deposit.label} montant={detail.deposit.amount} />
              )}
            </dl>

            <div className="mt-4 border-t border-black/15 pt-4">
              {/* À l'unité : une seule box, donc un seul montant. Les formules
                  avec engagement affichent le premier prélèvement puis le
                  montant hebdomadaire, qui diffèrent à cause de la consigne. */}
              {plan === "unite" ? (
                <p className="flex items-baseline justify-between gap-4">
                  <span className="font-bold">Total à payer</span>
                  <span className="text-3xl font-bold">{formatEuros(detail.firstPayment)}</span>
                </p>
              ) : (
                <>
                  <p className="flex items-baseline justify-between gap-4">
                    <span className="font-bold">Premier prélèvement</span>
                    <span className="text-3xl font-bold">{formatEuros(detail.firstPayment)}</span>
                  </p>
                  <p className="mt-1 flex items-baseline justify-between gap-4 text-sm text-ardoise">
                    <span>Puis chaque semaine</span>
                    <span className="font-bold">{formatEuros(detail.weekly)}</span>
                  </p>
                </>
              )}
              <p className="mt-2 text-xs text-ardoise">
                {detail.deposit
                  ? "La consigne des contenants n'est réglée qu'une fois : vos box vides sont échangées à chaque livraison suivante."
                  : "Consigne déjà réglée lors d'une précédente commande, elle n'est pas refacturée."}
              </p>
              <p className="mt-1 text-xs font-bold text-peche">
                soit {formatEuros(mealPrice())} le repas, livraison comprise dans le total
              </p>
            </div>
          </div>

          {/* Ce qui a été choisi */}
          <div>
            <ul className="m-0 list-none space-y-2 p-0 text-sm text-ardoise">
              <li>
                <span className="text-ardoise">Box :</span>{" "}
                {boxCategory ? BOX_TYPES[boxCategory].label : "à choisir"}
              </li>
              <li>
                <span className="text-ardoise">Taille :</span> {peopleCount} personne
                {peopleCount > 1 ? "s" : ""} · {mealsPerWeek} plats par semaine
              </li>
              <li>
                <span className="text-ardoise">Plats :</span>{" "}
                {recettesCompletes
                  ? `${mealsPerWeek} choisis`
                  : `${recipeIds.length} sur ${mealsPerWeek} choisis`}
              </li>
              <li>
                <span className="text-ardoise">Engagement :</span> {PLANS[plan].label}
              </li>
              <li>
                <span className="text-ardoise">Livraison :</span>{" "}
                {livraison.firstDate
                  ? `tous les ${dayLabel(livraison.weekday)}s, ${formatCreneau(livraison.slot, livraison.zone)} — première le ${formatLongDate(livraison.firstDate)}`
                  : "à définir"}
              </li>
              <li>
                <span className="text-ardoise">Adresse :</span>{" "}
                {livraison.street?.trim()
                  ? `${livraison.street.trim()}${livraison.notes?.trim() ? `, ${livraison.notes.trim()}` : ""}, ${livraison.postalCode} ${livraison.commune ?? ""}`
                  : "à renseigner"}
              </li>
              <li>
                <span className="text-ardoise">Téléphone :</span>{" "}
                {livraison.phone?.trim() || "à renseigner"}
              </li>
              <li>
                <span className="text-ardoise">Email :</span>{" "}
                {compte?.email || "celui de votre compte"}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 border-t border-black/15 pt-5">
          <button
            type="button"
            onClick={payer}
            disabled={!pret || status === "loading"}
            aria-describedby="aide-paiement"
            className="btn-primary"
          >
            {status === "loading" ? "Redirection…" : "Passer au paiement"}
          </button>
          <p id="aide-paiement" className="mt-2 text-xs text-ardoise">
            {status === "loading"
              ? "Ouverture du paiement sécurisé Stripe."
              : pret
              ? isLoggedIn
                ? "Paiement sécurisé par Stripe."
                : "Vous devrez d'abord vous connecter."
              : !recettesCompletes && boxCategory
              ? `Il reste ${mealsPerWeek - recipeIds.length} plat(s) à choisir.`
              : !livraison.phone?.trim()
              ? "Renseignez votre téléphone pour continuer."
              : "Complétez les étapes ci-dessus pour continuer."}
          </p>
        </div>
      </div>

      {status === "error" && (
        <p role="alert" className="mt-6 rounded-xl border-2 border-red-400 bg-red-50 px-4 py-3 text-sm">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function Ligne({ label, montant }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ardoise">{label}</dt>
      <dd className="m-0 font-bold">{formatEuros(montant)}</dd>
    </div>
  );
}

function Section({ numero, titre, children }) {
  const id = `etape-${numero}`;
  return (
    <section aria-labelledby={id} className="mb-14">
      <h2 id={id} className="mb-5 flex items-center gap-3 text-2xl font-bold text-encre">
        <span
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-framboise font-script text-xl text-white"
          aria-hidden="true"
        >
          {numero}
        </span>
        {titre}
      </h2>
      {children}
    </section>
  );
}

function Compteur({ id, label, valeur, min, max, onChange }) {
  return (
    <div className="min-w-[240px] flex-1 rounded-2xl border border-black/10 bg-white p-5">
      <p id={`label-${id}`} className="mb-3 text-sm font-bold text-encre">{label}</p>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange(valeur - 1)}
          disabled={valeur <= min}
          className="h-11 w-11 rounded-full border-2 border-black/20 text-xl font-bold hover:border-black/50 disabled:opacity-35"
        >
          <span className="sr-only">Diminuer : {label.toLowerCase()}</span>
          <span aria-hidden="true">−</span>
        </button>
        <output aria-labelledby={`label-${id}`} className="w-8 text-center text-2xl font-bold">
          {valeur}
        </output>
        <button
          type="button"
          onClick={() => onChange(valeur + 1)}
          disabled={valeur >= max}
          className="h-11 w-11 rounded-full border-2 border-black/20 text-xl font-bold hover:border-black/50 disabled:opacity-35"
        >
          <span className="sr-only">Augmenter : {label.toLowerCase()}</span>
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  );
}
