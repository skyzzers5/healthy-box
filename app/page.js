import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BOX_TYPES, lowestMealPrice, formatEuros } from "@/lib/pricing";
import { dayLabels } from "@/lib/delivery";
import CarteBox from "@/components/CarteBox";
import Coche from "@/components/Coche";
import Picto from "@/components/Picto";

export const revalidate = 3600;

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: zones }, { count: recipeCount }] = await Promise.all([
    supabase
      .from("delivery_zones")
      .select("city, allowed_days, delivery_postal_codes(label)")
      .eq("active", true)
      .order("city"),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("published", true),
  ]);

  const zoneCount = zones?.length ?? 0;
  const fromPrice = lowestMealPrice();

  return (
    <>
      {/* Hero : slogan, bénéfices, puis la photo */}
      <section className="px-6 pb-10 pt-14">
        <div className="mx-auto max-w-6xl">
          <h1 className="max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
            Bien manger
            <span className="accent-script mt-1 block text-5xl font-normal sm:text-6xl lg:text-7xl">
              n&apos;a jamais été aussi facile.
            </span>
          </h1>
          <span className="mt-4 block h-1 w-24 rounded-full bg-peche" aria-hidden="true" />

          <p className="mt-6 max-w-2xl text-lg leading-relaxed">
            Vous choisissez vos recettes, nous livrons les ingrédients
            pré-portionnés et la fiche recette. Deux box pensées pour des
            besoins précis : index glycémique maîtrisé, ou alimentation
            anti-inflammatoire.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/formules" className="btn-primary">Composer ma box</Link>
            <Link href="/menu" className="btn-outline">Voir les recettes</Link>
          </div>

          {/* Les quatre bénéfices des stories */}
          <ul className="mt-12 grid list-none grid-cols-2 gap-8 p-0 sm:grid-cols-4">
            {[
              ["horloge", "bg-rose", "Gagnez", "du temps"],
              ["lotus", "bg-menthe", "Moins de", "charge mentale"],
              ["coeur", "bg-rose", "Mieux", "manger"],
              ["feuille", "bg-menthe", "Moins de", "gaspillage"],
            ].map(([icone, fond, l1, l2]) => (
              <li key={l2} className="text-center">
                <Picto nom={icone} fond={fond} className="mx-auto mb-3" />
                <p className="font-semibold leading-snug text-encre">
                  {l1}
                  <br />
                  {l2}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-6 pb-20" aria-label="Aperçu de nos plats">
        <div className="relative mx-auto aspect-[16/9] max-w-6xl overflow-hidden rounded-3xl sm:aspect-[21/9]">
          <Image
            src="/images/hero.jpg"
            alt="Galettes de légumes râpés dorées à la poêle, servies avec de la mâche"
            fill
            priority
            sizes="(max-width: 1152px) 100vw, 1152px"
            className="object-cover"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
            aria-hidden="true"
          />
          <p className="absolute bottom-5 left-6 right-6 text-left text-sm font-semibold text-white sm:bottom-7 sm:left-8 sm:text-base">
            Galettes de courgette et pomme de terre, mâche assaisonnée —
            <span className="font-normal"> au menu cette semaine</span>
          </p>
        </div>
      </section>

      {/* Les deux box */}
      <section className="px-6 pb-20" aria-labelledby="h-box">
        <h2 id="h-box" className="sr-only">Nos deux box</h2>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          {Object.entries(BOX_TYPES).map(([id, box]) => (
            <CarteBox key={id} id={id} box={box} fromPrice={fromPrice} />
          ))}
        </div>
      </section>

      {/* Bandeau sombre : la promesse */}
      <section className="bg-peche px-6 py-20" aria-labelledby="h-promesse">
        <div className="mx-auto max-w-5xl text-center">
          <h2 id="h-promesse" className="mx-auto mb-10 max-w-3xl text-3xl sm:text-4xl">
            Chaque recette passe entre les mains d&apos;une naturopathe
          </h2>
          <ul className="mx-auto grid max-w-3xl gap-4 text-left text-[15px] text-encre sm:grid-cols-2">
            <Coche>Aucune recette publiée sans validation professionnelle</Coche>
            <Coche>Index glycémique, calories et temps de préparation affichés</Coche>
            <Coche>Produits frais et de saison, ingrédients pré-portionnés</Coche>
            <Coche>Suspension ou annulation depuis votre espace client</Coche>
          </ul>
          <p className="mx-auto mt-8 max-w-xl text-sm text-ardoise">
            Nos box complètent votre alimentation, elles ne remplacent pas un
            suivi médical ni les conseils de votre médecin.
          </p>
        </div>
      </section>

      {/* Comment ça marche — repris des stories Instagram */}
      <section className="px-6 py-20" aria-labelledby="h-etapes">
        <div className="mx-auto max-w-6xl rounded-3xl bg-sable px-6 py-14 sm:px-12">
          <h2 id="h-etapes" className="mb-12 text-center text-3xl sm:text-4xl">
            Comment ça marche ?
          </h2>

          <ol className="grid list-none grid-cols-1 gap-8 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["ordinateur", "Vous choisissez", "vos recettes", "parmi notre sélection."],
              ["toque", "On prépare", "les ingrédients", "et les bonnes quantités pour vous."],
              ["camion", "On vous livre", "à domicile", "selon votre zone."],
              ["poele", "Vous cuisinez", "des repas simples", "et savoureux."],
            ].map(([icone, titre, sousTitre, detail], index) => (
              <li key={titre} className="relative text-center">
                <span className="relative mx-auto mb-4 block w-fit">
                  <Picto nom={icone} fond="bg-white" className="!h-20 !w-20" />
                  <span
                    className="absolute -bottom-1 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-framboise-soft text-sm font-bold text-framboise"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                </span>

                <p className="mt-3 font-bold text-encre">{titre}</p>
                <p className="text-encre">{sousTitre}</p>
                <p className="mt-1 text-sm text-ardoise">{detail}</p>

                {/* Flèche vers l'étape suivante, masquée en colonne unique */}
                {index < 3 && (
                  <span
                    className="pointer-events-none absolute -right-4 top-8 hidden text-framboise lg:block"
                    aria-hidden="true"
                  >
                    <svg width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M0 7h20m0 0-5-5m5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </li>
            ))}
          </ol>

          <p className="accent-script mt-12 text-center text-3xl sm:text-4xl">
            Prenez soin de votre temps, de votre santé et de la planète.
          </p>
        </div>
      </section>

      {/* Zones */}
      <section className="bg-sable px-6 py-20" aria-labelledby="h-zones">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow">Livraison</p>
          <h2 id="h-zones" className="font-bold mb-3 text-4xl sm:text-5xl">Où nous livrons</h2>
          <p className="mb-10 max-w-xl">
            {recipeCount ?? 0} recettes validées sont actuellement au catalogue.
            Les jours dépendent de nos tournées.
          </p>

          {zoneCount === 0 ? (
            <p className="carte p-6">
              Aucune zone de livraison n&apos;est encore configurée. Ajoutez-les dans
              la table <code>delivery_zones</code>.
            </p>
          ) : (
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {zones.map((zone) => (
                <li key={zone.city} className="carte p-4">
                  <p className="font-bold text-encre">{zone.city}</p>
                  <p className="text-sm capitalize text-ardoise/80">{dayLabels(zone.allowed_days)}</p>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-10">
            <Link href="/formules" className="btn-primary">
              Composer ma box — dès {formatEuros(fromPrice)} le repas
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
