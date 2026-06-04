export function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function genId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getValueType(v: string): string {
  if (v === "") return "";
  if (!isNaN(Number(v))) return "Number";
  if (v.toLowerCase() === "true" || v.toLowerCase() === "false")
    return "Boolean";
  if (!isNaN(Date.parse(v))) return "Date";
  try {
    JSON.parse(v);
    return "JSON";
  } catch {
    return "String";
  }
}
