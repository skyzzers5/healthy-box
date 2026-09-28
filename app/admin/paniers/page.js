import { requireAdmin } from "@/lib/admin";
import { BOX_TYPES, weeklyPrice, formatEuros } from "@/lib/pricing";
import { formatLongDate } from "@/lib/delivery";
import BoutonRelance from "@/components/admin/BoutonRelance";

export const dynamic = "force-dynamic";

/**
 * Paniers abandonnés : abonnements restés au statut « incomplete ».
 * Ils correspondent à quelqu'un qui a tout configuré puis n'a pas payé.
 */
export default async function PaniersPage() {
  const { admin } = await requireAdmin();

  const { data: paniers } = await admin
    .from("subscriptions")
    .select(
      "id, created_at, box_category, people_count, meals_per_week, contact_email, contact_phone, " +
        "abandoned_email_at, delivery_addresses(postal_code, city), profiles(full_name)"
    )
    .eq("status", "incomplete")
    .order("created_at", { ascending: false })
    .limit(100);

  const total = (paniers ?? []).reduce(
    (somme, p) =>
      somme + weeklyPrice({ peopleCount: p.people_count, mealsPerWeek: p.meals_per_week }),
    0
  );

  return (
    <>
      <h2 className="mb-2 text-2xl">Paniers abandonnés</h2>
      <p className="mb-6 max-w-2xl text-sm text-ardoise">
        Ces personnes ont composé leur box sans aller au bout du paiement.
        {(paniers?.length ?? 0) > 0 && (
          <>
            {" "}
            Soit <strong>{formatEuros(total)}</strong> de chiffre d&apos;affaires
            hebdomadaire potentiel.
          </>
        )}
      </p>

      {!paniers || paniers.length === 0 ? (
        <p className="carte p-6 text-ardoise">Aucun panier abandonné.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-2 border-black/15">
                <th scope="col" className="py-2 pr-3">Date</th>
                <th scope="col" className="py-2 pr-3">Client</th>
                <th scope="col" className="py-2 pr-3">Box</th>
                <th scope="col" className="py-2 pr-3">Zone</th>
                <th scope="col" className="py-2 pr-3">Relance</th>
                <th scope="col" className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {paniers.map((p) => (
                <tr key={p.id} className="border-b border-black/10 align-top">
                  <td className="py-3 pr-3">{formatLongDate(p.created_at.slice(0, 10))}</td>
                  <td className="py-3 pr-3">
                    {p.profiles?.full_name || "—"}
                    <span className="block break-all text-xs text-ardoise">{p.contact_email}</span>
                  </td>
                  <td className="py-3 pr-3">
                    {BOX_TYPES[p.box_category]?.label ?? p.box_category}
                    <span className="block text-xs text-ardoise">
                      {p.people_count} pers. · {p.meals_per_week} plats
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-xs">
                    {p.delivery_addresses?.postal_code} {p.delivery_addresses?.city}
                  </td>
                  <td className="py-3 pr-3 text-xs">
                    {p.abandoned_email_at
                      ? `envoyée le ${formatLongDate(p.abandoned_email_at.slice(0, 10))}`
                      : "—"}
                  </td>
                  <td className="py-3">
                    <BoutonRelance
                      subscriptionId={p.id}
                      dejaEnvoyee={Boolean(p.abandoned_email_at)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
