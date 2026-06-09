"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const COURT_TYPE_OPTIONS = [
  { value: "beach_outdoor", label: "Пляжный открытый" },
  { value: "beach_indoor", label: "Пляжный крытый" },
  { value: "classic", label: "Классический" },
];

const label = { display: "block", fontSize: 14, fontWeight: 600, marginBottom: 4 } as const;
const field = { width: "100%", padding: "10px 12px", fontSize: 16, borderRadius: 8, border: "1px solid #ccc", marginBottom: 14, boxSizing: "border-box" } as const;
const checkRow = { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 15 } as const;

export default function VenueForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [venueType, setVenueType] = useState("beach");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [courtCount, setCourtCount] = useState(1);
  const [courtTypes, setCourtTypes] = useState<string[]>([]);
  const [hasParking, setHasParking] = useState(false);
  const [hasLockerRooms, setHasLockerRooms] = useState(false);
  const [hasShower, setHasShower] = useState(false);
  const [hasLighting, setHasLighting] = useState(false);
  const [contacts, setContacts] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function toggleCourtType(v: string) {
    setCourtTypes((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  async function submit() {
    setError("");
    if (!name.trim()) {
      setError("Введите название площадки");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          venue_type: venueType,
          address,
          description,
          court_count: courtCount,
          court_types: courtTypes,
          has_parking: hasParking,
          has_locker_rooms: hasLockerRooms,
          has_shower: hasShower,
          has_lighting: hasLighting,
          contacts,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Ошибка сохранения");
        setBusy(false);
        return;
      }
      router.push("/venues/" + data.id);
    } catch {
      setError("Сеть недоступна, попробуйте ещё раз");
      setBusy(false);
    }
  }

  return (
    <div>
      <label style={label}>Название *</label>
      <input style={field} value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Пляж Солнечный" />

      <label style={label}>Тип площадки</label>
      <select style={field} value={venueType} onChange={(e) => setVenueType(e.target.value)}>
        <option value="beach">Пляжный волейбол</option>
        <option value="classic">Классический волейбол</option>
        <option value="both">Оба</option>
      </select>

      <label style={label}>Адрес</label>
      <input style={field} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Улица, дом / ориентир" />

      <label style={label}>Описание</label>
      <textarea style={{ ...field, minHeight: 80 }} value={description} onChange={(e) => setDescription(e.target.value)} />

      <label style={label}>Количество кортов</label>
      <input style={field} type="number" min={1} value={courtCount} onChange={(e) => setCourtCount(Number(e.target.value))} />

      <label style={label}>Типы кортов</label>
      <div style={{ marginBottom: 14 }}>
        {COURT_TYPE_OPTIONS.map((o) => (
          <label key={o.value} style={checkRow}>
            <input type="checkbox" checked={courtTypes.includes(o.value)} onChange={() => toggleCourtType(o.value)} />
            {o.label}
          </label>
        ))}
      </div>

      <label style={label}>Удобства</label>
      <div style={{ marginBottom: 14 }}>
        <label style={checkRow}><input type="checkbox" checked={hasParking} onChange={(e) => setHasParking(e.target.checked)} /> Парковка</label>
        <label style={checkRow}><input type="checkbox" checked={hasLockerRooms} onChange={(e) => setHasLockerRooms(e.target.checked)} /> Раздевалки</label>
        <label style={checkRow}><input type="checkbox" checked={hasShower} onChange={(e) => setHasShower(e.target.checked)} /> Душ</label>
        <label style={checkRow}><input type="checkbox" checked={hasLighting} onChange={(e) => setHasLighting(e.target.checked)} /> Освещение</label>
      </div>

      <label style={label}>Контакты</label>
      <input style={field} value={contacts} onChange={(e) => setContacts(e.target.value)} placeholder="Телефон / соцсеть" />

      {error && (
        <div style={{ background: "#fde2e2", color: "#a11", padding: "10px 12px", borderRadius: 8, marginBottom: 12 }}>{error}</div>
      )}

      <button onClick={submit} disabled={busy} style={{ width: "100%", padding: 14, fontSize: 16, fontWeight: 700, color: "#fff", background: busy ? "#888" : "#1b4fd6", border: "none", borderRadius: 10 }}>
        {busy ? "Сохранение…" : "Создать площадку"}
      </button>
    </div>
  );
}
