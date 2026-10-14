"use client";

import { useState } from "react";
import { AlertTriangle, FileDown, Loader2 } from "lucide-react";
import { buildOutageReport, outageReportFilename, type ReportAssetMeta } from "@/lib/outage/outage-report";
import type { OutageScope } from "@/types/outage";

/**
 * Exports the outage scope currently on screen as a draft PDF report.
 *
 * The report is built from the same scope object the page renders (one frozen
 * telemetry capture, one timestamp), rendered in the browser and handed to the
 * user as a download. Nothing is uploaded or stored on a server.
 */
export function ExportDraftPdfButton({
  scope,
  assetMeta,
  liveSession,
  notices,
}: {
  scope: OutageScope | null;
  assetMeta: Record<string, ReportAssetMeta>;
  liveSession: boolean;
  notices: string[];
}) {
  const [state, setState] = useState<"idle" | "working" | "error">("idle");

  const exportPdf = async () => {
    if (!scope || state === "working") return;
    // Snapshot now: a "Refresh scope" during rendering cannot mix two reporting states.
    const report = buildOutageReport(scope, assetMeta, liveSession);
    setState("working");
    try {
      const { renderOutageReportPdf } = await import("./pdf/render-outage-report");
      const blob = await renderOutageReportPdf(report, notices);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = outageReportFilename(report);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setState("idle");
    } catch (error) {
      console.warn("Draft PDF export failed", error);
      setState("error");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {state === "error" && (
        <span role="status" className="flex items-center gap-1.5 text-xs text-attention">
          <AlertTriangle size={13} aria-hidden /> PDF could not be generated. Try again.
        </span>
      )}
      <button
        type="button"
        onClick={exportPdf}
        disabled={!scope || state === "working"}
        aria-busy={state === "working"}
        className="btn-primary px-3.5 py-1.5 text-sm disabled:cursor-wait disabled:opacity-70"
      >
        {state === "working" ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <FileDown size={14} aria-hidden />}
        {state === "working" ? "Generating PDF…" : "Export Draft PDF"}
      </button>
    </div>
  );
}
