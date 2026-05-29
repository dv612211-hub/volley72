import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");

  if (!session?.value) {
    redirect("/auth/login");
  }

  let sessionData;
  try {
    sessionData = JSON.parse(session.value);
  } catch {
    redirect("/auth/login");
  }

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", sessionData.player_id)
    .single();

  if (!player) {
    redirect("/auth/login");
  }

  const levelLabels: Record<string, string> = {
    novice: "Новичок",
    medium: "Средний",
    "medium_plus": "Средний+",
    high: "Высокий",
    pro: "Профи",
  };

  const directionLabels: Record<string, string> = {
    beach: "Пляжный",
    classic: "Классический",
    both: "Оба направления",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0b1535",
      color: "#fff",
      padding: "24px 16px",
      fontFamily: "sans-serif",
    }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.name}
              style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "#f97316", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 28, fontWeight: 700,
            }}>
              {player.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{player.name}</h1>
            <p style={{ color: "#f97316", margin: "4px 0 0", fontSize: 14 }}>
              {levelLabels[player.level] || player.level || "Уровень не определён"}
            </p>
          </div>
        </div>

        <div style={{
          background: "#1a2a55", borderRadius: 12, padding: 16, marginBottom: 16,
        }}>
          <h2 style={{ fontSize: 16, color: "#94a3b8", marginBottom: 12 }}>Информация</h2>
          {player.direction && (
            <p style={{ marginBottom: 8 }}>Направление: {directionLabels[player.direction] || player.direction}</p>
          )}
          {player.dominant_hand && (
            <p style={{ marginBottom: 8 }}>Рабочая рука: {player.dominant_hand === "right" ? "Правша" : "Левша"}</p>
          )}
          {player.city && (
            <p style={{ marginBottom: 8 }}>Город: {player.city}</p>
          )}
          {player.height && (
            <p style={{ marginBottom: 8 }}>Рост: {player.height} см</p>
          )}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href={"/players/" + player.id + "/edit"}
            style={{
              flex: 1, textAlign: "center", padding: "14px",
              background: "#f97316", color: "#fff", borderRadius: 10,
              fontWeight: 700, textDecoration: "none", fontSize: 16,
            }}
          >
            Редактировать
          </Link>
          <a
            href="/api/auth/logout"
            style={{
              flex: 1, textAlign: "center", padding: "14px",
              background: "#1a2a55", color: "#fff", borderRadius: 10,
              fontWeight: 700, textDecoration: "none", fontSize: 16,
            }}
          >
            Выйти
          </a>
        </div>

        <Link
          href="/"
          style={{ display: "block", textAlign: "center", marginTop: 24, color: "#64748b", textDecoration: "none" }}
        >
          ← На главную
        </Link>
      </div>
    </div>
  );
}
