"use client";

import { Search } from "lucide-react";
import { openGlobalSearch } from "./CommandPalette";

/** Top-bar entry point to the global search palette (also Ctrl/⌘+K or "/"). */
export function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={openGlobalSearch}
      aria-keyshortcuts="Control+K Meta+K /"
      className="group flex h-10 w-full max-w-md items-center gap-3 rounded-lg border border-line-strong bg-raised/70 px-3.5 text-left text-sm text-ink-3 transition-colors hover:border-accent/50 hover:text-ink-2"
    >
      <Search size={17} className="shrink-0" aria-hidden />
      <span className="flex-1 truncate">Search equipment, components, parts…</span>
      <kbd className="hidden shrink-0 rounded border border-line-strong bg-sunken px-1.5 py-0.5 font-mono text-2xs text-ink-3 md:inline">
        Ctrl K
      </kbd>
    </button>
  );
}
