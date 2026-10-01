"use client";

import { useEffect, useState } from "react";
import { loadPIManifest, type ManifestState } from "@/lib/pi/pi-registry";

/** Manifest for a PI form, loaded once (cached in the registry) and only when needed. */
export function usePIManifest(form: string | null): ManifestState {
  const [state, setState] = useState<{ form: string | null; value: ManifestState }>({
    form: null,
    value: { status: "loading" },
  });
  useEffect(() => {
    if (!form) return;
    let cancelled = false;
    loadPIManifest(form).then((value) => {
      if (!cancelled) setState({ form, value });
    });
    return () => {
      cancelled = true;
    };
  }, [form]);
  return state.form === form ? state.value : { status: "loading" };
}
