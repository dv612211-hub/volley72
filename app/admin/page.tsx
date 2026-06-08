import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getCurrentPlayer } from "@/lib/auth";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await getCurrentPlayer();

  if (!me) redirect("/auth/login");
  if (me.role !== "admin") redirect("/");

  const { data: pending } = await supabase
    .from("players")
    .select("id, name, photo_url, city, created_at, vk_id")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const list = pending || [];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b1535",
      color: "#fff",
      padding: "24px 16px",
      fontFamily: "sans-serif",
    }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            Заявки на подтверждение
          </h1>
          <Link href="/" style={{ color: "#64748b", textDecoration: "none", fontSize: 14 }}>
            ← На главную
          </Link>
        </div>

        {list.length === 0 ? (
          <div style={{
            background: "#1a2a55", borderRadius: 12, padding: 24, textAlign: "center", color: "#94a3b8",
          }}>
            Новых заявок нет
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {list.map((p: any) => (
              <div key={p.id} style={{
                background: "#1a2a55", borderRadius: 12, padding: 16,
                display: "flex", alignItems: "center", gap: 14,
              }}>
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name}
                    style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%", background: "#f97316",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, fontWeight: 700, flexShrink: 0,
                  }}>
                    {p.name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{p.name || "Без имени"}</div>
                  <div style={{ color: "#94a3b8", fontSize: 13 }}>{p.city || ""}</div>
                </div>
                <form action={`/api/admin/approve`} method="POST">
                  <input type="hidden" name="player_id" value={p.id} />
                  <button type="submit" style={{
                    background: "#f97316", color: "#fff", border: "none",
                    borderRadius: 8, padding: "10px 16px", fontWeight: 700,
                    fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
                  }}>
                    Одобрить
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
