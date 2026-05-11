import type { Tournament } from "@/lib/tournament";
import { generateId } from "@/lib/tournament-actions";

const DB_NAME = "volley72_tournaments";
const DB_VERSION = 1;
const STORE = "tournament_states";

export const LOCAL_ID_PREFIX = "local-";

export function isLocalId(id: string): boolean {
  return typeof id === "string" && id.startsWith(LOCAL_ID_PREFIX);
}

export function generateLocalTournamentId(): string {
  return LOCAL_ID_PREFIX + generateId();
}

export type StoredState = {
  tournamentId: string;
  state: Tournament;
  savedAt: number;
};

function isDBSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "tournamentId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
  });
}

export async function saveTournamentState(
  tournamentId: string,
  state: Tournament,
): Promise<number> {
  if (!isDBSupported()) return Date.now();
  const db = await openDB();
  const savedAt = Date.now();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ tournamentId, state, savedAt });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB write failed"));
    tx.onabort = () => reject(tx.error ?? new Error("IDB tx aborted"));
  });
  db.close();
  return savedAt;
}

export async function loadTournamentState(
  tournamentId: string,
): Promise<StoredState | null> {
  if (!isDBSupported()) return null;
  const db = await openDB();
  const result = await new Promise<StoredState | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(tournamentId);
    req.onsuccess = () =>
      resolve((req.result as StoredState | undefined) ?? null);
    req.onerror = () => reject(req.error ?? new Error("IDB read failed"));
  });
  db.close();
  return result;
}

export async function deleteTournamentState(
  tournamentId: string,
): Promise<void> {
  if (!isDBSupported()) return;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(tournamentId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IDB delete failed"));
  });
  db.close();
}

export async function listAllTournamentStates(): Promise<StoredState[]> {
  if (!isDBSupported()) return [];
  const db = await openDB();
  const result = await new Promise<StoredState[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as StoredState[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error("IDB getAll failed"));
  });
  db.close();
  return result;
}

export async function migrateLocalToServer(
  localState: Tournament,
): Promise<Tournament> {
  if (!isLocalId(localState.id)) return localState;

  const orderedPlayers = [...localState.settings.players]
    .sort((a, b) => {
      if (a.gender !== b.gender) return a.gender === "male" ? -1 : 1;
      if (a.court !== b.court) return a.court - b.court;
      return a.slot - b.slot;
    })
    .map((p) => ({ name: p.name, gender: p.gender }));

  const createRes = await fetch("/api/tournaments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: localState.title,
      players: orderedPlayers,
    }),
  });
  if (!createRes.ok) {
    const payload = (await createRes.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(
      payload.error ?? `Server create failed: HTTP ${createRes.status}`,
    );
  }
  const { tournament: serverTournament } = (await createRes.json()) as {
    tournament: Tournament;
  };

  const migratedState: Tournament = {
    ...localState,
    id: serverTournament.id,
    created_at: serverTournament.created_at ?? localState.created_at,
  };

  const syncRes = await fetch(
    `/api/tournaments/${serverTournament.id}/sync`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        state: migratedState,
        savedAt: new Date().toISOString(),
      }),
    },
  );
  if (!syncRes.ok) {
    throw new Error(
      `Migration sync failed: HTTP ${syncRes.status}`,
    );
  }

  await saveTournamentState(serverTournament.id, migratedState);
  await deleteTournamentState(localState.id);

  return migratedState;
}

export type SyncStatus =
  | "synced"
  | "syncing"
  | "local"
  | "local_unsaved"
  | "error";

export type BackupPayload = {
  format: "volley72_tournament_backup";
  schema_version: 1;
  exported_at: string;
  tournament: Tournament;
};

export function buildBackup(tournament: Tournament): BackupPayload {
  return {
    format: "volley72_tournament_backup",
    schema_version: 1,
    exported_at: new Date().toISOString(),
    tournament,
  };
}

export function isBackupPayload(x: unknown): x is BackupPayload {
  if (!x || typeof x !== "object") return false;
  const obj = x as Record<string, unknown>;
  if (obj.format !== "volley72_tournament_backup") return false;
  if (!obj.tournament || typeof obj.tournament !== "object") return false;
  const t = obj.tournament as Record<string, unknown>;
  if (typeof t.id !== "string") return false;
  if (!t.settings || typeof t.settings !== "object") return false;
  return true;
}

export function downloadBackup(tournament: Tournament): void {
  const payload = buildBackup(tournament);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const dateStr = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const filename = `volley72_tournament_${tournament.id}_${dateStr}.json`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
