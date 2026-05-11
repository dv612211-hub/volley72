import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  applyRoundAction,
  parseRoundAction,
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

  const parsed = parseRoundAction(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("tournaments")
    .select("settings")
    .eq("id", id)
    .single();
  if (error || !data) {
    return Response.json(
      { error: error?.message ?? "tournament not found" },
      { status: 404 },
    );
  }

  const settings = data.settings as SideoutMixtSettings;
  const result = applyRoundAction(settings, parsed.data);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const upd = await supabaseAdmin
    .from("tournaments")
    .update({ settings: result.data })
    .eq("id", id);
  if (upd.error) {
    return Response.json({ error: upd.error.message }, { status: 500 });
  }

  const round = result.data.rounds.find((r) => r.id === parsed.data.roundId);
  return Response.json({ round });
}
