"use client";

import { useState } from "react";
import { RefreshCw, FileSpreadsheet, Filter, Download, ChevronRight, Calendar, Loader2 } from "lucide-react";
import { downloadDetailedExcelReport, downloadDetailedCsvReport } from "@/lib/exportDetailedReport";

export default function ReportDownloadClient() {
  const [downloading, setDownloading] = useState<string | null>(null);

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
    }
  };

  const reports = [
    { name: "zulvath-02-Sep-2026_14:35:12....", size: "16 KB", date: "2:35 PM Wed, 2 Sep 26" },
    { name: "zulvath-02-Sep-2026_14:32:36....", size: "16 KB", date: "2:32 PM Wed, 2 Sep 26" },
    { name: "soniyaleads1-31-Aug-2026_22:4...", size: "119 KB", date: "10:49 PM Mon, 31 Aug 26" },
    { name: "soniyaleads1-14-Aug-2026_11:1...", size: "33 KB", date: "11:18 AM Fri, 14 Aug 26" },
    { name: "soniyaleads1-14-Aug-2026_11:1...", size: "33 KB", date: "11:14 AM Fri, 14 Aug 26" },
    { name: "soniyaleads1-14-Aug-2026_11:0...", size: "33 KB", date: "11:01 AM Fri, 14 Aug 26" },
    { name: "Facebook lead report-Stelar Inte...", size: "2 KB", date: "2:10 PM Tue, 11 Aug 26" },
    { name: "Facebook lead report-Stelar Inte...", size: "2 KB", date: "2:09 PM Tue, 11 Aug 26" },
    { name: "Facebook lead report-Stelar Inte...", size: "905 B", date: "2:07 PM Tue, 11 Aug 26" },
    { name: "Facebook lead report-Stelar Inte...", size: "1 KB", date: "2:05 PM Tue, 11 Aug 26" },
    { name: "Facebook lead report-Stelar Inte...", size: "4 KB", date: "7:41 PM Fri, 26 Jun 26" },
    { name: "Metaleadsreport-10-Jun-2026_1...", size: "2 KB", date: "11:30 AM Wed, 10 Jun 26" },
    { name: "Metaleadsreport-10-Jun-2026_1...", size: "6 KB", date: "11:29 AM Wed, 10 Jun 26" },
    { name: "Leaderboard-Report-10-Jun-202...", size: "962 B", date: "11:21 AM Wed, 10 Jun 26", isLeaderboard: true },
    { name: "Leaderboard-Report-10-Jun-202...", size: "963 B", date: "11:14 AM Wed, 10 Jun 26", isLeaderboard: true },
  ];

  return (
    <div className="h-full bg-white flex flex-col -m-3 md:-m-6 relative overflow-hidden">
      
      {/* Header */}
      <div className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-gray-100 shrink-0">
        <h1 className="text-[17px] font-bold text-gray-800 flex items-center">
          Report Download <RefreshCw className="w-4 h-4 ml-2 text-[#4f46e5] cursor-pointer" />
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDownload("weekly", "xlsx")}
            disabled={downloading !== null}
            className="flex items-center px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors cursor-pointer"
          >
            {downloading === "weekly-xlsx" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
            Weekly Report (.xlsx)
          </button>
          <button
            onClick={() => handleDownload("monthly", "xlsx")}
            disabled={downloading !== null}
            className="flex items-center px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition-colors cursor-pointer"
          >
            {downloading === "monthly-xlsx" ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
            Monthly Report (.xlsx)
          </button>
        </div>
      </div>

      {/* Instant Action Cards for Detailed Weekly & Monthly Reports */}
      <div className="px-4 md:px-6 py-4 bg-gray-50/60 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
        {/* Weekly Detailed Card */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Weekly Detailed Report</div>
              <div className="text-xs text-gray-500 font-medium">Last 7 rolling days • Full call logs & notes</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload("weekly", "xlsx")}
              disabled={downloading !== null}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              {downloading === "weekly-xlsx" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Excel
            </button>
            <button
              onClick={() => handleDownload("weekly", "csv")}
              disabled={downloading !== null}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              CSV
            </button>
          </div>
        </div>

        {/* Monthly Detailed Card */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Monthly Detailed Report</div>
              <div className="text-xs text-gray-500 font-medium">Current Month to date • Complete pipeline audit</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload("monthly", "xlsx")}
              disabled={downloading !== null}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              {downloading === "monthly-xlsx" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Excel
            </button>
            <button
              onClick={() => handleDownload("monthly", "csv")}
              disabled={downloading !== null}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-2 border-b border-gray-100 shrink-0 overflow-x-auto flex relative hide-scrollbar">
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-[#4f46e5] border-b-2 border-[#4f46e5]">All</button>
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">Leads</button>
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">Tasks</button>
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">Leaderboard</button>
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">Calls</button>
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">Sales</button>
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">Action</button>
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">Salesform</button>
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">Bulk Edit</button>
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">Excel Bulk Edit</button>
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">Bulk cancel tasks</button>
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">Bulk Delete</button>
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700">Bulk User Upload</button>
        <button className="whitespace-nowrap px-4 py-3 text-[13px] font-bold text-gray-500 hover:text-gray-700 flex items-center">Users export <ChevronRight className="w-3 h-3 ml-1" /></button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-white shadow-sm z-10 border-b border-gray-100">
            <tr>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-700 w-[35%]">Name</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-700 w-[10%]">Filter</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-700 w-[15%]">Status</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-700 w-[15%]">Completed On</th>
              <th className="px-4 md:px-6 py-4 text-left text-xs font-bold text-gray-700 w-[15%]">Created by</th>
              <th className="px-4 md:px-6 py-4 text-center text-xs font-bold text-gray-700 w-[10%]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {reports.map((report, i) => (
              <tr key={i} className="hover:bg-purple-50/30 transition-colors group">
                <td className="px-4 md:px-6 py-3">
                  <div className="flex items-start">
                    <FileSpreadsheet className="w-4 h-4 text-green-600 mr-3 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[13px] font-medium text-[#4f46e5] cursor-pointer hover:underline truncate max-w-[280px]">
                        {report.name}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">Size: {report.size}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 md:px-6 py-3 text-gray-400">
                  <Filter className="w-4 h-4 text-gray-400" />
                </td>
                <td className="px-4 md:px-6 py-3">
                  <span className="bg-green-50 text-green-600 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
                    Completed
                  </span>
                </td>
                <td className="px-4 md:px-6 py-3 text-[13px] text-gray-700 font-medium whitespace-nowrap">
                  {report.date}
                </td>
                <td className="px-4 md:px-6 py-3">
                  <div className="flex items-center">
                    <div className="w-5 h-5 rounded-full bg-purple-100 text-[#4f46e5] flex items-center justify-center text-[9px] font-bold mr-2">
                      SI
                    </div>
                    <span className="text-[13px] text-gray-600">Stelar Interiors</span>
                  </div>
                </td>
                <td className="px-4 md:px-6 py-3 text-center">
                  <button 
                    onClick={() => handleDownload("weekly", "xlsx")}
                    className="text-[#4f46e5] hover:bg-purple-50 p-1.5 rounded-full transition-colors opacity-80 hover:opacity-100 cursor-pointer"
                    title="Download Report"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="h-12 border-t border-gray-100 flex items-center justify-between px-4 md:px-6 bg-white shrink-0">
        <div className="text-[11px] font-bold text-gray-500">1-15 of 15</div>
        <div className="flex items-center space-x-1">
          <button className="text-gray-400 hover:text-gray-600 p-1"><ChevronRight className="w-4 h-4 rotate-180" /></button>
          <button className="w-6 h-6 rounded bg-[#4d3691] text-white text-xs font-bold flex items-center justify-center">1</button>
          <button className="text-gray-400 hover:text-gray-600 p-1"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

    </div>
  );
}
