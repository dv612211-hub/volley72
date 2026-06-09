import { getCurrentPlayer } from "@/lib/auth";
import { redirect } from "next/navigation";
import VenueForm from "./VenueForm";

export const dynamic = "force-dynamic";

export default async function CreateVenuePage() {
  const me = await getCurrentPlayer();
  if (!me) redirect("/");
  if (me.role !== "admin") redirect("/venues");

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Новая площадка</h1>
      <VenueForm />
    </main>
  );
}
