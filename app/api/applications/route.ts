import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY env vars",
  );
}

const supabaseAdmin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function nowYekaterinburgIso(): string {
  const shifted = new Date(Date.now() + 5 * 60 * 60 * 1000);
  return shifted.toISOString().replace("Z", "+05:00");
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event_id, name, phone, comment } =
    (body ?? {}) as Record<string, unknown>;

  if (typeof event_id !== "string" || !event_id) {
    return Response.json({ error: "event_id is required" }, { status: 400 });
  }
  if (typeof name !== "string" || !name.trim()) {
    return Response.json({ error: "name is required" }, { status: 400 });
  }
  if (typeof phone !== "string" || !phone.trim()) {
    return Response.json({ error: "phone is required" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("applications")
    .insert({
      event_id,
      name: name.trim(),
      phone: phone.trim(),
      comment:
        typeof comment === "string" && comment.trim()
          ? comment.trim()
          : null,
      created_at: nowYekaterinburgIso(),
    })
    .select()
    .single();

  if (error) {
    console.error("applications insert error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data }, { status: 201 });
}
