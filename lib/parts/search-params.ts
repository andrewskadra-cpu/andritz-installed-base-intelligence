/** Reads a single string query parameter from a page's searchParams. */
export function param(params: Record<string, string | string[] | undefined>, key: string): string | null {
  const value = params[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}
