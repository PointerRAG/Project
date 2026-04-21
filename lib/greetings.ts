import { APP_DATE_LOCALE, APP_TIME_ZONE } from "./date-format";

type GreetingCondition =
  | "morning"
  | "afternoon"
  | "evening"
  | "night"
  | "daytime"
  | "always"
  | `day:${string}`;

interface GreetingTemplate {
  template: string;
  condition: GreetingCondition;
}

const GREETINGS: GreetingTemplate[] = [
  // Morning (5:00 – 11:59)
  { template: "Good morning, {first_name}", condition: "morning" },

  // Afternoon (12:00 – 16:59)
  { template: "Good afternoon, {first_name}", condition: "afternoon" },

  // Evening (17:00 – 20:59)
  { template: "Good evening, {first_name}", condition: "evening" },
  { template: "Evening, {first_name}", condition: "evening" },

  // Night (21:00 – 4:59)
  { template: "Hello, night owl", condition: "night" },
  {
    template: "What's on your mind tonight, {first_name}?",
    condition: "night",
  },
  { template: "It's late-night, {first_name}", condition: "night" },

  // Daytime (12:00 – 20:59)
  { template: "How was your day, {first_name}?", condition: "daytime" },
  { template: "How was your day?", condition: "daytime" },

  // Day-of-week specific
  { template: "Happy Monday, {first_name}", condition: "day:Monday" },
  { template: "Happy Tuesday, {first_name}", condition: "day:Tuesday" },
  { template: "Happy Wednesday, {first_name}", condition: "day:Wednesday" },
  { template: "Happy Thursday, {first_name}", condition: "day:Thursday" },
  { template: "Happy Friday, {first_name}", condition: "day:Friday" },
  { template: "That Friday feeling, {first_name}", condition: "day:Friday" },
  { template: "Happy Saturday, {first_name}", condition: "day:Saturday" },
  {
    template: "Welcome to the weekend, {first_name}",
    condition: "day:Saturday",
  },
  { template: "Happy Sunday, {first_name}", condition: "day:Sunday" },
  { template: "Sunday session, {first_name}?", condition: "day:Sunday" },
  {
    template: "Welcome to the weekend, {first_name}",
    condition: "day:Sunday",
  },

  // Always applicable
  { template: "{first_name} returns!", condition: "always" },
  { template: "Back at it, {first_name}", condition: "always" },
  { template: "Greetings, {first_name}", condition: "always" },
  { template: "Hey there, {first_name}", condition: "always" },
  { template: "Hi {first_name}, how are you?", condition: "always" },
  { template: "How's it going, {first_name}?", condition: "always" },
  { template: "Welcome, {first_name}", condition: "always" },
  { template: "What's new, {first_name}?", condition: "always" },
  { template: "What's on your mind, {first_name}?", condition: "always" },
];

/**
 * Returns a context-aware greeting based on the current time and day of week,
 * using the app's configured timezone (Asia/Kolkata).
 *
 * Extracts the first name from the full name for a friendlier tone.
 */
export function getGreeting(fullName: string): string {
  const firstName = fullName.trim().split(/\s+/)[0] || "User";

  const now = new Date();

  // Use formatToParts to reliably extract the current hour in the app timezone
  const hourFormatter = new Intl.DateTimeFormat(APP_DATE_LOCALE, {
    hour: "numeric",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  });
  const hourPart = hourFormatter
    .formatToParts(now)
    .find((p) => p.type === "hour");
  const parsedHour = hourPart ? parseInt(hourPart.value, 10) : NaN;
  const hour = Number.isFinite(parsedHour)
    ? parsedHour % 24
    : new Date().getHours();

  // Use formatToParts to get the weekday name in the app timezone
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: APP_TIME_ZONE,
  });
  const dayPart = dayFormatter
    .formatToParts(now)
    .find((p) => p.type === "weekday");
  const dayOfWeek = dayPart?.value ?? "";

  // Filter greetings to only those eligible for the current context
  const eligible = GREETINGS.filter((g) => {
    switch (g.condition) {
      case "always":
        return true;
      case "morning":
        return hour >= 5 && hour < 12;
      case "afternoon":
        return hour >= 12 && hour < 17;
      case "evening":
        return hour >= 17 && hour < 21;
      case "night":
        return hour >= 21 || hour < 5;
      case "daytime":
        return hour >= 12 && hour < 21;
      default:
        if (g.condition.startsWith("day:")) {
          return g.condition.slice(4) === dayOfWeek;
        }
        return false;
    }
  });

  const pool =
    eligible.length > 0
      ? eligible
      : GREETINGS.filter((g) => g.condition === "always");

  const selected = pool[Math.floor(Math.random() * pool.length)];
  return selected.template.replaceAll("{first_name}", firstName);
}
