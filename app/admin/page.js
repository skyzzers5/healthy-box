import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { formatEuros, weeklyPrice } from "@/lib/pricing";
import { formatLongDate, toISODate } from "@/lib/delivery";

export const dynamic = "force-dynamic";

export default async function TableauDeBord() {
  const { admin } = await requireAdmin();

  const aujourdhui = toISODate(new Date());
  const dans7jours = new Date();
  dans7jours.setDate(dans7jours.getDate() + 7);

  const [abonnements, livraisons, paniers, attente] = await Promise.all([
    admin.from("subscriptions").select("status, people_count, meals_per_week"),
    admin
      .from("orders")
      .select("delivery_date, status")
      .gte("delivery_date", aujourdhui)
      .lte("delivery_date", toISODate(dans7jours))
      .neq("status", "skipped"),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "incomplete"),
    admin.from("waitlist").select("postal_code"),
  ]);

  const actifs = (abonnements.data ?? []).filter((a) => a.status === "active");
  const suspendus = (abonnements.data ?? []).filter((a) => a.status === "suspended");

  // Revenu hebdomadaire théorique : somme des abonnements actifs
  const revenuSemaine = actifs.reduce(
    (total, a) =>
      total + weeklyPrice({ peopleCount: a.people_count, mealsPerWeek: a.meals_per_week }),
    0
  );

  // Codes postaux les plus demandés hors zone
  const demandes = {};
  for (const l of attente.data ?? []) {
    demandes[l.postal_code] = (demandes[l.postal_code] ?? 0) + 1;
  }
  const topDemandes = Object.entries(demandes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Livraisons par date sur la semaine
  const parDate = {};
  for (const o of livraisons.data ?? []) {
    parDate[o.delivery_date] = (parDate[o.delivery_date] ?? 0) + 1;
  }

  return (
    <>
      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Chiffre valeur={actifs.length} libelle="abonnements actifs" />
        <Chiffre valeur={suspendus.length} libelle="suspendus" />
        <Chiffre valeur={formatEuros(revenuSemaine)} libelle="par semaine (théorique)" />
        <Chiffre valeur={paniers.count ?? 0} libelle="paniers abandonnés" accent />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="carte p-6" aria-labelledby="h-semaine">
          <h2 id="h-semaine" className="mb-4 text-xl">Livraisons des 7 prochains jours</h2>
          {Object.keys(parDate).length === 0 ? (
            <p className="text-sm text-ardoise">Aucune livraison programmée.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {Object.entries(parDate)
                .sort()
                .map(([date, nombre]) => (
                  <li
                    key={date}
                    className="flex justify-between border-b border-black/10 py-2.5 text-sm last:border-0"
                  >
                    <Link href={`/admin/livraisons?date=${date}`} className="capitalize hover:text-framboise">
                      {formatLongDate(date)}
                    </Link>
                    <span className="font-bold">
                      {nombre} box
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </section>

        <section className="carte p-6" aria-labelledby="h-attente">
          <h2 id="h-attente" className="mb-4 text-xl">Communes les plus demandées</h2>
          <p className="mb-3 text-sm text-ardoise">
            Codes postaux saisis par des visiteurs hors zone. C&apos;est ce qui
            indique où étendre les tournées.
          </p>
          {topDemandes.length === 0 ? (
            <p className="text-sm text-ardoise">Aucune demande pour l&apos;instant.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {topDemandes.map(([cp, nombre]) => (
                <li key={cp} className="flex justify-between border-b border-black/10 py-2.5 text-sm last:border-0">
                  <span className="font-mono">{cp}</span>
                  <span className="font-bold">{nombre} demande{nombre > 1 ? "s" : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Chiffre({ valeur, libelle, accent = false }) {
  return (
    <div className={`carte p-5 ${accent ? "border-2 border-framboise" : ""}`}>
      <p className="text-3xl font-bold text-framboise">{valeur}</p>
      <p className="mt-1 text-sm text-ardoise">{libelle}</p>
    </div>
  );
}
