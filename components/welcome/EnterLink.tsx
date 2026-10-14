"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { markWelcomed } from "@/lib/welcome";

/** Link out of the welcome screen; marks it as seen so "/" opens the workspace. */
export function EnterLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link href={href} onClick={markWelcomed} className={className}>
      {children}
    </Link>
  );
}
