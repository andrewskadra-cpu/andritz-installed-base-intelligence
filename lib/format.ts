const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-03-18" → "18 Mar 2026". Deterministic so server and client render identically. */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** ISO timestamp → "HH:MM:SS" in UTC, so server and client render identical text. */
export function formatTime(iso: string): string {
  return iso.slice(11, 19);
}

export function formatNumber(value: number | null): string {
  if (value === null) return "—";
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
