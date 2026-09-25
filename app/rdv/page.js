import Link from "next/link";
import AgendaCalendly from "@/components/AgendaCalendly";
import Picto from "@/components/Picto";

export const metadata = { title: "Rendez-vous naturopathe — Healthy Box" };

export default function RdvPage() {
  const calendly = process.env.NEXT_PUBLIC_CALENDLY_URL;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="eyebrow">Rendez-vous</p>
      <h1 className="mb-4 text-4xl sm:text-5xl">Échanger avec notre naturopathe</h1>
      <p className="mb-8 max-w-2xl leading-relaxed">
        Un point personnalisé pour adapter vos recettes à vos habitudes, vos
        goûts et vos contraintes. En visio ou par téléphone, selon ce qui vous
        arrange.
      </p>

      <ul className="mb-10 grid list-none gap-6 p-0 sm:grid-cols-3">
        {[
          ["horloge", "Choisissez votre créneau", "Les disponibilités affichées sont celles de l'agenda, en temps réel."],
          ["coeur", "Un échange sur mesure", "Vos préférences alimentaires, vos aversions, votre organisation."],
          ["feuille", "Confirmation immédiate", "Vous recevez le lien de visio et un rappel avant le rendez-vous."],
        ].map(([icone, titre, texte]) => (
          <li key={titre} className="text-center">
            <Picto nom={icone} fond="bg-rose" className="mx-auto mb-3" />
            <p className="font-semibold text-encre">{titre}</p>
            <p className="mt-1 text-sm text-ardoise">{texte}</p>
          </li>
        ))}
      </ul>

      <AgendaCalendly url={calendly} />

      <div className="mt-10 rounded-2xl bg-sable p-6">
        <h2 className="mb-2 text-lg">Ce rendez-vous n&apos;est pas une consultation médicale</h2>
        <p className="text-sm text-ardoise">
          La naturopathie n&apos;est pas une profession de santé réglementée et
          ne remplace ni votre médecin, ni un diététicien-nutritionniste. Si vous
          suivez un traitement, notamment pour un diabète, parlez-en à votre
          médecin avant de modifier votre alimentation.
        </p>
        <p className="mt-4">
          <Link href="/formules" className="btn-outline text-sm">Composer ma box</Link>
        </p>
      </div>
    </div>
  );
}
