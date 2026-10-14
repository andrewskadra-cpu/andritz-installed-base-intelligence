import { pdf } from "@react-pdf/renderer";
import type { OutageReport } from "@/lib/outage/outage-report";
import { OutageReportDocument } from "./OutageReportDocument";

/** Render the report to a PDF blob in the browser. Loaded on demand (dynamic import) when the user exports. */
export async function renderOutageReportPdf(report: OutageReport, notices: string[]): Promise<Blob> {
  return pdf(<OutageReportDocument report={report} notices={notices} />).toBlob();
}
