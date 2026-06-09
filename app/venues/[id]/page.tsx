import { supabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import Link from "next/link";

const TYPE_LABEL: Record<string, string> = { beach: "Пляжный волейбол", classic: "Классический волейбол", both: "Пляж + классика" };
const COURT_TYPE_LABEL: Record<string, string> = { beach_outdoor: "Пляжный открытый", beach_indoor: "Пляжный крытый", classic: "Классический" };

export const dynamic = "force-dynamic";

export default async function VenuePage(props: { params: any }) {
  const params = await props.params;
  const id = params.id;
  const { data: v } = await supabaseAdmin.from("venues").select("*").eq("id", id).single();
  if (!v) notFound();

  const amenities = [
    v.has_parking && "Парковка",
    v.has_locker_rooms && "Раздевалки",
    v.has_shower && "Душ",
    v.has_lighting && "Освещение",
  ].filter(Boolean);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <Link href="/venues" style={{ color: "#1b4fd6", textDecoration: "none", fontSize: 14 }}>← Все площадки</Link>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: "12px 0" }}>{v.name}</h1>
      <div style={{ color: "#666", marginBottom: 16 }}>{TYPE_LABEL[v.venue_type] || v.venue_type} · кортов: {v.court_count}</div>

      {v.address && <p><b>Адрес:</b> {v.address}</p>}
      {v.description && <p style={{ marginTop: 12 }}>{v.description}</p>}

      {v.court_types?.length > 0 && (
        <p style={{ marginTop: 12 }}><b>Типы кортов:</b> {v.court_types.map((t: string) => COURT_TYPE_LABEL[t] || t).join(", ")}</p>
      )}

      {amenities.length > 0 && (
        <p style={{ marginTop: 12 }}><b>Удобства:</b> {amenities.join(", ")}</p>
      )}

      {v.contacts && <p style={{ marginTop: 12 }}><b>Контакты:</b> {v.contacts}</p>}
    </main>
  );
}
