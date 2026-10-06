import { RefreshCw, FileSpreadsheet, Filter, Download, ChevronRight } from "lucide-react";

export default function ReportDownloadPage() {
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
      <div className="h-16 px-4 md:px-6 flex items-center border-b border-gray-100 shrink-0">
        <h1 className="text-[17px] font-bold text-gray-800 flex items-center">
          Report Download <RefreshCw className="w-4 h-4 ml-2 text-[#4f46e5] cursor-pointer" />
        </h1>
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
                  <Filter className={`w-4 h-4 ${report.isLeaderboard ? 'text-gray-400' : 'text-gray-400'}`} />
                  {/* Note: Leaderboard rows have a slightly different filter icon, but using Filter for all to match standard lucide */}
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
                  <button className="text-[#4f46e5] hover:bg-purple-50 p-1.5 rounded-full transition-colors opacity-80 hover:opacity-100">
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
