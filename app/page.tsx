import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WELCOME_COOKIE } from "@/lib/welcome";

/**
 * "/" is an alias: the welcome screen once per browser session (presentation
 * only, not auth), the Overview after that.
 */
export default async function RootPage() {
  redirect((await cookies()).has(WELCOME_COOKIE) ? "/overview" : "/welcome");
}
