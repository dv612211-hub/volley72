import { supabase } from "./supabase";

export type Venue = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  photo_url: string | null;
};

export type CoachUser = {
  id: string;
  name: string | null;
};

export type Coach = {
  id: string;
  user_id: string | null;
  bio: string | null;
  photo_url: string | null;
  user: CoachUser | null;
};

export type EventRow = {
  id: string;
  title: string;
  type: string | null;
  status: string | null;
  starts_at: string;
  ends_at: string | null;
  price: number | null;
  description: string | null;
  venue: Venue | null;
  coach: Coach | null;
};

export type ApplicationInput = {
  event_id: string;
  name: string;
  phone: string;
  comment?: string | null;
};

const EVENT_SELECT =
  "id, title, type, status, starts_at, ends_at, price, description, " +
  "venue:venues(id, name, address, description, photo_url), " +
  "coach:coaches(id, user_id, bio, photo_url, user:users(id, name))";

export async function getEvents(): Promise<EventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as EventRow[];
}

export async function getVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from("venues")
    .select("id, name, address, description, photo_url")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getCoaches(): Promise<Coach[]> {
  const { data, error } = await supabase
    .from("coaches")
    .select("id, user_id, bio, photo_url, user:users(id, name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as Coach[];
}

export async function createApplication(input: ApplicationInput) {
  const { data, error } = await supabase
    .from("applications")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}
