import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentPlayer } from "@/lib/auth";
import Link from "next/link";

const TYPE_LABEL: Record<string, string> = { beach: "Пляжный", classic: "Классический", both: "Пляж + классика" };

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  const me = await getCurrentPlayer();
  const { data: venues } = await supabaseAdmin
    .from("venues")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Площадки</h1>
        {me?.role === "admin" && (
          <Link href="/venues/create" style={{ padding: "8px 14px", background: "#1b4fd6", color: "#fff", borderRadius: 8, fontWeight: 600, textDecoration: "none" }}>+ Добавить</Link>
        )}
      </div>

      {(!venues || venues.length === 0) && (
        <p style={{ color: "#666" }}>Площадок пока нет.</p>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {venues?.map((v: any) => (
          <Link key={v.id} href={"/venues/" + v.id} style={{ display: "block", padding: 16, border: "1px solid #e3e3e3", borderRadius: 12, textDecoration: "none", color: "inherit" }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{v.name}</div>
            <div style={{ fontSize: 14, color: "#666", marginTop: 4 }}>{TYPE_LABEL[v.venue_type] || v.venue_type} · кортов: {v.court_count}</div>
            {v.address && <div style={{ fontSize: 14, color: "#888", marginTop: 4 }}>{v.address}</div>}
          </Link>
        ))}
      </div>
    </main>
  );
}
