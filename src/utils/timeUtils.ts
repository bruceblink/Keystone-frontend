/**
 * 根据经度将 UTC 时间转换为当地时间
 */
export function utcToLocalByLng(
  utcTime: string | number | Date,
  longitude: number
): string {
  const lng = Number(longitude);
  if (isNaN(lng)) return formatDateTime(utcTime);

  const shangValue = Math.trunc(lng / 15);
  const yushuValue = Math.abs(lng) - 15 * Math.abs(shangValue);
  const iTimeZone =
    yushuValue <= 7.5 ? shangValue : shangValue + (lng > 0 ? 1 : -1);

  const d = parseUTC(utcTime);
  if (!d) return String(utcTime);

  let hour = d.getUTCHours() + iTimeZone;
  let day = d.getUTCDate();
  if (hour >= 24) {
    day += 1;
    hour -= 24;
  } else if (hour < 0) {
    day -= 1;
    hour += 24;
  }

  const r = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      day,
      hour,
      d.getUTCMinutes(),
      d.getUTCSeconds()
    )
  );
  return fmtUTC(r);
}

export function formatDateTime(val: string | number | Date): string {
  const d = parseUTC(val);
  return d ? fmtUTC(d) : String(val);
}

function parseUTC(val: string | number | Date): Date | null {
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  const iso = s.replace(" ", "T");
  const d = new Date(/[Zz+]/.test(iso) ? iso : iso + "Z");
  return isNaN(d.getTime()) ? null : d;
}

function fmtUTC(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(
    d.getUTCDate()
  )} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}
