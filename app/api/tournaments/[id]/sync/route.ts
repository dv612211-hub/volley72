import { supabaseAdmin } from "@/lib/supabase-admin";
import type { SideoutMixtSettings } from "@/lib/tournament";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const obj = (body ?? {}) as Record<string, unknown>;
  const state = obj.state as Record<string, unknown> | undefined;
  const savedAtIn = typeof obj.savedAt === "string" ? obj.savedAt : null;
  if (!state || typeof state !== "object") {
    return Response.json({ error: "state is required" }, { status: 400 });
  }
  const settings = (state.settings ?? state) as SideoutMixtSettings;
  if (!settings || typeof settings !== "object" || !Array.isArray(settings.rounds)) {
    return Response.json(
      { error: "state.settings must contain rounds[]" },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = { settings };
  if (typeof state.title === "string" && state.title.trim()) {
    update.title = state.title.trim();
  }
  if (typeof state.status === "string") {
    update.status = state.status;
  }

  const { error } = await supabaseAdmin
    .from("tournaments")
    .update(update)
    .eq("id", id);
  if (error) {
    console.error("sync error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    ok: true,
    savedAt: savedAtIn ?? new Date().toISOString(),
  });
}
