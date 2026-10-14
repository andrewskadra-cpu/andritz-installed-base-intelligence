/**
 * Presentation-only "seen the welcome screen" marker. This is NOT
 * authentication: it is a session cookie that only decides whether opening
 * the app at "/" shows the welcome screen first. Every route stays directly
 * reachable without it.
 */
export const WELCOME_COOKIE = "ibis_welcomed";

/** Mark the welcome screen as seen for this browser session (client only). */
export function markWelcomed() {
  try {
    document.cookie = `${WELCOME_COOKIE}=1; path=/; SameSite=Lax`;
  } catch {
    /* cookies blocked: the welcome screen simply shows again at "/" */
  }
}
