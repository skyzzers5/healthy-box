import { requireAdmin } from "@/lib/admin";
import { formatLongDate, formatCreneau, toISODate } from "@/lib/delivery";
import { BOX_TYPES } from "@/lib/pricing";
import SelecteurDate from "@/components/admin/SelecteurDate";

export const dynamic = "force-dynamic";

export default async function LivraisonsPage({ searchParams }) {
  const params = await searchParams;
  const { admin } = await requireAdmin();

  const date = params?.date || toISODate(new Date());

  const { data: commandes } = await admin
    .from("orders")
    .select(
      "id, delivery_date, status, recipe_ids, " +
        "subscriptions(box_category, people_count, meals_per_week, delivery_slot, contact_phone, " +
        "delivery_addresses(street, postal_code, city, notes, delivery_zones(city, slot_interval_minutes)), " +
        "profiles(full_name))"
    )
    .eq("delivery_date", date)
    .neq("status", "skipped")
    .order("id");

  const { data: recettes } = await admin.from("recipes").select("id, name");
  const nomRecette = (id) => recettes?.find((r) => r.id === id)?.name ?? `Recette ${id}`;

  // Regroupement par zone : une tournée correspond à une zone
  const parZone = {};
  for (const c of commandes ?? []) {
    const zone = c.subscriptions?.delivery_addresses?.delivery_zones?.city ?? "Zone inconnue";
    (parZone[zone] ??= []).push(c);
  }

  // À l'intérieur d'une zone, on suit l'ordre des créneaux horaires
  for (const zone of Object.keys(parZone)) {
    parZone[zone].sort((a, b) =>
      String(a.subscriptions?.delivery_slot ?? "").localeCompare(
        String(b.subscriptions?.delivery_slot ?? "")
      )
    );
  }

  const total = commandes?.length ?? 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl">Feuille de tournée</h2>
          <p className="text-sm capitalize text-ardoise">{formatLongDate(date)}</p>
        </div>
        <SelecteurDate date={date} base="/admin/livraisons" />
      </div>

      <p className="mb-6 text-sm font-semibold">
        {total} box à livrer
        {total > 0 ? ` — ${Object.keys(parZone).length} zone(s)` : ""}
      </p>

      {total === 0 ? (
        <p className="carte p-6 text-ardoise">Aucune livraison ce jour-là.</p>
      ) : (
        Object.entries(parZone).map(([zone, lignes]) => (
          <section key={zone} className="mb-10" aria-labelledby={`zone-${zone}`}>
            <h3 id={`zone-${zone}`} className="mb-3 text-xl">
              {zone}{" "}
              <span className="text-base font-normal text-ardoise">
                — {lignes.length} box
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">
                  Livraisons du {formatLongDate(date)} pour la zone {zone}
                </caption>
                <thead>
                  <tr className="border-b-2 border-black/15">
                    <th scope="col" className="py-2 pr-3">Créneau</th>
                    <th scope="col" className="py-2 pr-3">Client</th>
                    <th scope="col" className="py-2 pr-3">Adresse</th>
                    <th scope="col" className="py-2 pr-3">Téléphone</th>
                    <th scope="col" className="py-2 pr-3">Box</th>
                    <th scope="col" className="py-2">Plats</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((c) => {
                    const abo = c.subscriptions;
                    const adresse = abo?.delivery_addresses;
                    return (
                      <tr key={c.id} className="border-b border-black/10 align-top">
                        <td className="py-3 pr-3 font-bold">
                          {formatCreneau(abo?.delivery_slot, adresse?.delivery_zones)}
                        </td>
                        <td className="py-3 pr-3">
                          {abo?.profiles?.full_name || "—"}
                          <span className="block text-xs text-ardoise">
                            {abo?.people_count} pers. · {abo?.meals_per_week} plats
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          {adresse?.street}
                          <span className="block text-xs text-ardoise">
                            {adresse?.postal_code} {adresse?.city}
                          </span>
                          {adresse?.notes && (
                            <span className="block text-xs font-semibold text-framboise">
                              {adresse.notes}
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-3">{abo?.contact_phone || "—"}</td>
                        <td className="py-3 pr-3">
                          {BOX_TYPES[abo?.box_category]?.label ?? abo?.box_category}
                        </td>
                        <td className="py-3">
                          <ul className="m-0 list-disc pl-4">
                            {(c.recipe_ids ?? []).map((id, i) => (
                              <li key={`${c.id}-${i}`}>{nomRecette(id)}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </>
  );
}
