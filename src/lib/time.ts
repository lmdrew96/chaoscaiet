import "server-only";
import { cookies } from "next/headers";

export const TZ_COOKIE = "caiet_tz";
const FALLBACK_TZ = "America/New_York";

const isTimeZone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/**
 * Nae's timezone, as her browser reported it (root layout script sets the
 * cookie). The Worker runs in UTC, so anything shown or bucketed by day uses this.
 */
export const ownerTimeZone = async (): Promise<string> => {
  const tz = decodeURIComponent((await cookies()).get(TZ_COOKIE)?.value ?? "");
  return tz && isTimeZone(tz) ? tz : FALLBACK_TZ;
};

/** "oct 28 · 9:14pm", with the year when it isn't this year: "oct 28, 2025 · 9:14pm". */
export const formatWhen = (iso: string, tz: string, now = new Date()): string => {
  const parts = (d: Date): Record<string, string> =>
    Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
        .formatToParts(d)
        .map((p) => [p.type, p.value]),
    );
  const p = parts(new Date(iso));
  const thisYear = parts(now).year;
  const date = `${p.month.toLowerCase()} ${p.day}${p.year === thisYear ? "" : `, ${p.year}`}`;
  return `${date} · ${p.hour}:${p.minute}${p.dayPeriod.toLowerCase()}`;
};

/** Layer headers: "today", "oct 28", or "oct 28, 2025" when it isn't this year. */
export const formatDay = (iso: string, tz: string, now = new Date()): string => {
  const day = (d: Date): string => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d); // YYYY-MM-DD
  if (day(new Date(iso)) === day(now)) return "today";
  return formatWhen(iso, tz, now).split(" · ")[0];
};
