"use client";

import { Icon } from "@/components/ui/Icon";

export interface SummaryRow {
  sport: string;
  player: string;
  batch: string;
  role: string;
  /** Text details such as bowling action. */
  details: string;
  status: string;
  team: string;
  basePrice: number;
  soldPrice: number | null;
}

const HEADERS = ["Sport", "Player", "Batch", "Role / Position", "Details", "Status", "Team", "Base price", "Sold price"];

function cell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Builds the CSV in the browser and downloads it (opens cleanly in Excel). */
export function SummaryDownload({ rows, filename }: { rows: SummaryRow[]; filename: string }) {
  function download() {
    const lines = [
      HEADERS.join(","),
      ...rows.map((r) => [r.sport, r.player, r.batch, r.role, r.details, r.status, r.team, r.basePrice, r.soldPrice].map(cell).join(",")),
    ];
    // BOM so Excel reads the file as UTF-8
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={download} disabled={rows.length === 0} className="btn-outline" title={rows.length === 0 ? "Nothing to download yet" : undefined}>
      <Icon name="download" className="h-4 w-4" />
      Download CSV
      <span className="rounded-md bg-border px-1.5 py-0.5 text-xs font-bold">{rows.length}</span>
    </button>
  );
}
