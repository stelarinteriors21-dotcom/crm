"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Loader2, ChevronDown } from "lucide-react";
import { downloadDetailedExcelReport, downloadDetailedCsvReport } from "@/lib/exportDetailedReport";

export default function ReportHeaderDownloads() {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDownload = async (timeframe: "weekly" | "monthly", format: "xlsx" | "csv") => {
    setDownloading(`${timeframe}-${format}`);
    try {
      if (format === "xlsx") {
        await downloadDetailedExcelReport(timeframe);
      } else {
        await downloadDetailedCsvReport(timeframe);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to download report.");
    } finally {
      setDownloading(null);
      setMenuOpen(false);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <button
        onClick={() => handleDownload("weekly", "xlsx")}
        disabled={downloading !== null}
        className="flex items-center px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors cursor-pointer shadow-2xs"
        title="Download Detailed Weekly Report (.xlsx)"
      >
        {downloading === "weekly-xlsx" ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-indigo-500" />
        )}
        Weekly Report
      </button>

      <button
        onClick={() => handleDownload("monthly", "xlsx")}
        disabled={downloading !== null}
        className="flex items-center px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition-colors cursor-pointer shadow-2xs"
        title="Download Detailed Monthly Report (.xlsx)"
      >
        {downloading === "monthly-xlsx" ? (
          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
        )}
        Monthly Report
      </button>

      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg border border-gray-200 transition-colors cursor-pointer"
          title="More Report Formats"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 p-1.5 text-xs animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-1 text-[10px] font-black text-gray-400 uppercase tracking-wider">
              Download CSV Format
            </div>
            <button
              onClick={() => handleDownload("weekly", "csv")}
              className="w-full text-left px-2.5 py-1.5 hover:bg-gray-50 rounded-md text-gray-700 flex items-center justify-between text-[11px] cursor-pointer"
            >
              <span>Weekly Report (CSV)</span>
              <span className="text-[10px] text-gray-400 font-mono">.csv</span>
            </button>
            <button
              onClick={() => handleDownload("monthly", "csv")}
              className="w-full text-left px-2.5 py-1.5 hover:bg-gray-50 rounded-md text-gray-700 flex items-center justify-between text-[11px] cursor-pointer"
            >
              <span>Monthly Report (CSV)</span>
              <span className="text-[10px] text-gray-400 font-mono">.csv</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
