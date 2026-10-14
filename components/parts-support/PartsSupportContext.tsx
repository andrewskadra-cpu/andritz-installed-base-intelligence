"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ComponentNames } from "@/lib/parts/part-context";

const NamesContext = createContext<ComponentNames>({});

/** Supplies IBIS component display names (from the server query layer) to Parts & Support views. */
export function ComponentNamesProvider({ names, children }: { names: ComponentNames; children: ReactNode }) {
  return <NamesContext.Provider value={names}>{children}</NamesContext.Provider>;
}

export function useComponentNames(): ComponentNames {
  return useContext(NamesContext);
}
