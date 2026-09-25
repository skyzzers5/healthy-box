import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <h1 className="font-bold mb-4 text-5xl">Page introuvable</h1>
      <p className="mb-8 text-ardoise/85">Cette page n&apos;existe pas ou a été déplacée.</p>
      <Link href="/" className="btn-primary">Retour à l&apos;accueil</Link>
    </div>
  );
}
