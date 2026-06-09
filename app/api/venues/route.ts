import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentPlayer } from "@/lib/auth";

export async function POST(req: Request) {
  const me = await getCurrentPlayer();
  if (!me || me.role !== "admin") {
    return Response.json({ error: "Только для администратора" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json({ error: "Название обязательно" }, { status: 400 });
  }

  const allowedTypes = ["beach", "classic", "both"];
  const venue_type = allowedTypes.includes(body?.venue_type) ? body.venue_type : "beach";

  const allowedCourtTypes = ["beach_outdoor", "beach_indoor", "classic"];
  const court_types = Array.isArray(body?.court_types)
    ? body.court_types.filter((t: unknown) => allowedCourtTypes.includes(t as string))
    : [];

  const court_count = Number.isFinite(Number(body?.court_count))
    ? Math.max(1, Math.floor(Number(body.court_count)))
    : 1;

  const insert = {
    name,
    venue_type,
    address: typeof body?.address === "string" ? body.address.trim() : null,
    description: typeof body?.description === "string" ? body.description.trim() : null,
    court_count,
    court_types,
    has_parking: !!body?.has_parking,
    has_locker_rooms: !!body?.has_locker_rooms,
    has_shower: !!body?.has_shower,
    has_lighting: !!body?.has_lighting,
    contacts: typeof body?.contacts === "string" ? body.contacts.trim() : null,
    created_by: me.id,
  };

  const { data, error } = await supabaseAdmin
    .from("venues")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ id: data.id });
}
