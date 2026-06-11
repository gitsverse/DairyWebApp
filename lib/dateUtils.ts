import { format, parseISO, isValid } from "date-fns";

/**
 * Formats a date string (ISO or YYYY-MM-DD) or Date object to DD/MM/YYYY.
 * Returns "—" if the date is invalid or missing.
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  
  let d: Date;
  if (typeof dateStr === "string") {
    // parseISO handles YYYY-MM-DD or standard ISO timestamps accurately without local time offset shifts
    d = parseISO(dateStr);
  } else {
    d = dateStr;
  }
  
  if (!isValid(d)) {
    const parsedFallback = new Date(dateStr);
    if (!isValid(parsedFallback)) return "—";
    d = parsedFallback;
  }
  
  return format(d, "dd/MM/yyyy");
}

/**
 * Formats a date string or Date object to DD/MM (great for visual trends or charts).
 */
export function formatDateShort(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "—";
  
  let d: Date;
  if (typeof dateStr === "string") {
    d = parseISO(dateStr);
  } else {
    d = dateStr;
  }
  
  if (!isValid(d)) {
    const parsedFallback = new Date(dateStr);
    if (!isValid(parsedFallback)) return "—";
    d = parsedFallback;
  }
  
  return format(d, "dd/MM");
}

/**
 * Formats a Date object to YYYY-MM-DD in the local timezone.
 */
export function toLocalDateString(d: Date = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns the first day of the current local month formatted as YYYY-MM-DD.
 */
export function startOfLocalMonthISO(): string {
  const d = new Date();
  d.setDate(1);
  return toLocalDateString(d);
}
