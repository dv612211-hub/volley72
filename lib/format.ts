const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Yekaterinburg",
});

export function formatEventDate(iso: string) {
  const parts = dateFormatter.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPart["type"]) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday").replace(".", "");
  const day = get("day");
  const month = get("month");
  const hour = get("hour");
  const minute = get("minute");
  return `${weekday}, ${day} ${month} · ${hour}:${minute}`;
}

const priceFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

export function formatPrice(price: number | null | undefined) {
  if (price == null || price <= 0) return "Бесплатно";
  return priceFormatter.format(price);
}
