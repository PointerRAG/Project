const APP_DATE_LOCALE = "en-IN";
const APP_TIME_ZONE = "Asia/Kolkata";

const timeFormatter = new Intl.DateTimeFormat(APP_DATE_LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
});

const longDateFormatter = new Intl.DateTimeFormat(APP_DATE_LOCALE, {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: APP_TIME_ZONE,
});

const shortDateFormatter = new Intl.DateTimeFormat(APP_DATE_LOCALE, {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: APP_TIME_ZONE,
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: APP_TIME_ZONE,
});

export function parseTimestampToMs(timestamp: string): number | null {
  const ms = Date.parse(timestamp);
  return Number.isNaN(ms) ? null : ms;
}

export function getStableDayKey(timestamp: number): string {
  const parts = dayKeyFormatter.formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

export function formatChatTime(timestamp: number): string {
  return timeFormatter.format(new Date(timestamp));
}

export function formatChatLongDate(timestamp: number): string {
  return longDateFormatter.format(new Date(timestamp));
}

export function formatChatSidebarDate(timestamp: string): string {
  const ms = parseTimestampToMs(timestamp);
  if (ms === null) {
    return timestamp;
  }

  return shortDateFormatter.format(new Date(ms));
}
