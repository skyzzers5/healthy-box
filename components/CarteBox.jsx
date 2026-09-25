import Image from "next/image";
import Link from "next/link";
import Coche from "@/components/Coche";
import { formatEuros } from "@/lib/pricing";

export default function CarteBox({ id, box, fromPrice }) {
  return (
    <article className="carte flex flex-col">
      {/* Paysage 3/2 : format natif des bannières de box */}
      <div className="relative aspect-[3/2] bg-sable">
        <Image
          src={box.image}
          alt={box.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col p-7">
        <h3 className="font-bold mb-2 text-3xl">{box.label}</h3>
        <p className="mb-5 text-[15px] leading-relaxed">{box.baseline}</p>

        <ul className="mb-6 space-y-2.5 text-[15px]">
          {box.points.map((point) => (
            <Coche key={point}>{point}</Coche>
          ))}
        </ul>

        <p className="mb-5 mt-auto text-sm text-ardoise/80">
          À partir de{" "}
          <strong className="text-lg text-encre">{formatEuros(fromPrice)}</strong> / repas
        </p>

        <Link href={`/formules?box=${id}`} className="btn-primary w-full">
          Découvrir la {box.label.toLowerCase()}
        </Link>
      </div>
    </article>
  );
}
