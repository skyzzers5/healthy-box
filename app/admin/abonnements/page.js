import { requireAdmin } from "@/lib/admin";
import { BOX_TYPES, PLANS, weeklyPrice, formatEuros } from "@/lib/pricing";
import { formatLongDate, dayLabel } from "@/lib/delivery";

export const dynamic = "force-dynamic";

const STATUTS = {
  active: { label: "Actif", classe: "bg-framboise-soft text-framboise" },
  suspended: { label: "Suspendu", classe: "bg-amber-100 text-amber-800" },
  cancelled: { label: "Annulé", classe: "bg-black/10 text-ardoise" },
  incomplete: { label: "Non finalisé", classe: "bg-red-50 text-red-700" },
};

export default async function AbonnementsPage({ searchParams }) {
  const params = await searchParams;
  const { admin } = await requireAdmin();

  const filtre = params?.statut || "active";

  let requete = admin
    .from("subscriptions")
    .select(
      "id, status, box_category, plan, people_count, meals_per_week, delivery_weekday, " +
        "first_delivery_date, created_at, contact_phone, contact_email, free_delivery, deposit_paid, " +
        "delivery_addresses(street, postal_code, city), profiles(full_name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (filtre !== "tous") requete = requete.eq("status", filtre);

  const { data: abonnements } = await requete;

  return (
    <>
      <h2 className="mb-4 text-2xl">Abonnements</h2>

      <nav aria-label="Filtrer par statut" className="mb-6">
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {[["active", "Actifs"], ["suspended", "Suspendus"], ["cancelled", "Annulés"], ["incomplete", "Non finalisés"], ["tous", "Tous"]].map(
            ([valeur, label]) => (
              <li key={valeur}>
                <a
                  href={`/admin/abonnements?statut=${valeur}`}
                  aria-current={filtre === valeur ? "page" : undefined}
                  className={`inline-block rounded-full border-2 px-4 py-2 text-sm font-semibold ${
                    filtre === valeur
                      ? "border-framboise bg-framboise text-white"
                      : "border-black/15 hover:border-black/40"
                  }`}
                >
                  {label}
                </a>
              </li>
            )
          )}
        </ul>
      </nav>

      {!abonnements || abonnements.length === 0 ? (
        <p className="carte p-6 text-ardoise">Aucun abonnement dans cette catégorie.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-black/15">
                <th scope="col" className="py-2 pr-3">Client</th>
                <th scope="col" className="py-2 pr-3">Statut</th>
                <th scope="col" className="py-2 pr-3">Box</th>
                <th scope="col" className="py-2 pr-3">Formule</th>
                <th scope="col" className="py-2 pr-3">Livraison</th>
                <th scope="col" className="py-2 pr-3">Semaine</th>
                <th scope="col" className="py-2">Contact</th>
              </tr>
            </thead>
            <tbody>
              {abonnements.map((a) => {
                const statut = STATUTS[a.status] ?? { label: a.status, classe: "" };
                return (
                  <tr key={a.id} className="border-b border-black/10 align-top">
                    <td className="py-3 pr-3">
                      {a.profiles?.full_name || "—"}
                      <span className="block text-xs text-ardoise">
                        depuis le {formatLongDate(a.created_at.slice(0, 10))}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${statut.classe}`}>
                        {statut.label}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      {BOX_TYPES[a.box_category]?.label ?? a.box_category}
                    </td>
                    <td className="py-3 pr-3">
                      {PLANS[a.plan]?.label ?? a.plan}
                      <span className="block text-xs text-ardoise">
                        {a.people_count} pers. · {a.meals_per_week} plats
                      </span>
                      {a.free_delivery && (
                        <span className="block text-xs font-semibold text-framboise">
                          livraison offerte
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="capitalize">{dayLabel(a.delivery_weekday)}s</span>
                      <span className="block text-xs text-ardoise">
                        {a.delivery_addresses?.postal_code} {a.delivery_addresses?.city}
                      </span>
                    </td>
                    <td className="py-3 pr-3 font-bold">
                      {formatEuros(
                        weeklyPrice({
                          peopleCount: a.people_count,
                          mealsPerWeek: a.meals_per_week,
                          freeDelivery: a.free_delivery,
                        })
                      )}
                    </td>
                    <td className="py-3 text-xs">
                      {a.contact_phone || "—"}
                      <span className="block break-all text-ardoise">{a.contact_email}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
