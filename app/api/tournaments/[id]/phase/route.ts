import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  applyPhaseAction,
  parsePhaseAction,
} from "@/lib/tournament-actions";
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

  const parsed = parsePhaseAction(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const t = await supabaseAdmin
    .from("tournaments")
    .select("settings, status")
    .eq("id", id)
    .single();
  if (t.error || !t.data) {
    return Response.json(
      { error: t.error?.message ?? "tournament not found" },
      { status: 404 },
    );
  }

  const settings = t.data.settings as SideoutMixtSettings;
  const result = applyPhaseAction(settings, parsed.data);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const updateBody: Record<string, unknown> = { settings: result.data.settings };
  if (result.data.status) updateBody.status = result.data.status;

  const upd = await supabaseAdmin
    .from("tournaments")
    .update(updateBody)
    .eq("id", id);
  if (upd.error) {
    return Response.json({ error: upd.error.message }, { status: 500 });
  }

  return Response.json({ ok: true, phase: result.data.settings.phase });
}
