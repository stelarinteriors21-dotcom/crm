"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  X, 
  Download, 
  FileText, 
  CheckCircle2, 
  PhoneCall, 
  MapPin, 
  Phone, 
  Clock, 
  Calendar,
  Volume2, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { getTeamTasksData } from "@/app/actions/reportActions";

type ViewTab = "tasks" | "calls";
type DateFilter = "today" | "yesterday" | "week" | "all";

export default function DailyReportModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>("tasks");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");

  useEffect(() => {
    getTeamTasksData()
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load daily report:", err);
        setLoading(false);
      });
  }, []);

  // Filter helper for call date ranges
  const filterCalls = (calls: any[], filter: DateFilter) => {
    if (!calls || calls.length === 0) return [];
    if (filter === "all") return calls;

    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();

    return calls.filter(call => {
      const callDate = new Date(call.createdAt);
      if (filter === "today") {
        return (
          callDate.getDate() === todayDate &&
          callDate.getMonth() === todayMonth &&
          callDate.getFullYear() === todayYear
        );
      }
      if (filter === "yesterday") {
        const yesterday = new Date(todayYear, todayMonth, todayDate - 1);
        return (
          callDate.getDate() === yesterday.getDate() &&
          callDate.getMonth() === yesterday.getMonth() &&
          callDate.getFullYear() === yesterday.getFullYear()
        );
      }
      if (filter === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return callDate >= weekAgo;
      }
      return true;
    });
  };

  // Format call timestamp into readable label
  const formatCallTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const now = new Date();
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });

      if (isToday) return `Today, ${timeStr}`;

      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const isYesterday =
        d.getDate() === yesterday.getDate() &&
        d.getMonth() === yesterday.getMonth() &&
        d.getFullYear() === yesterday.getFullYear();

      if (isYesterday) return `Yesterday, ${timeStr}`;

      return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  // Summary counts
  const totalPendingTasks = useMemo(() => {
    return data.reduce((acc, u) => acc + (u.pendingCount || 0), 0);
  }, [data]);

  const totalCallsInFilter = useMemo(() => {
    return data.reduce((acc, u) => {
      const filtered = filterCalls(u.calls || [], dateFilter);
      return acc + filtered.length;
    }, 0);
  }, [data, dateFilter]);

  const downloadCSV = () => {
    if (activeTab === "tasks") {
      let csv = "Team Member,Role,Task Type,Lead Name,Phone,Status\n";
      data.forEach(userReport => {
        if (!userReport.tasks || userReport.tasks.length === 0) {
          csv += `"${userReport.user.name}","${userReport.user.role}","None","All caught up","",""\n`;
        } else {
          userReport.tasks.forEach((task: any) => {
            csv += `"${userReport.user.name}","${userReport.user.role}","${task.type}","${task.name || ""}","${task.phone || ""}","${task.status || ""}"\n`;
          });
        }
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Team_Pending_Tasks_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
    } else {
      let csv = "Caller,Role,Lead Name,Phone,Call Date Time,Duration,Outcome / Notes,Recording Link\n";
      data.forEach(userReport => {
        const filtered = filterCalls(userReport.calls || [], dateFilter);
        if (filtered.length === 0) {
          csv += `"${userReport.user.name}","${userReport.user.role}","None","","","0 calls in period","",""\n`;
        } else {
          filtered.forEach((c: any) => {
            csv += `"${userReport.user.name}","${userReport.user.role}","${c.leadName || ""}","${c.leadPhone || ""}","${c.createdAt}","${c.durationFormatted}","${(c.notes || "").replace(/"/g, '""')}","${c.recordingUrl || ""}"\n`;
          });
        }
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Team_Calls_Report_${dateFilter.toUpperCase()}_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-100">
        
        {/* Top Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mr-3 shrink-0 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                Daily Team Activity & Tasks Report
              </h2>
              <p className="text-xs text-gray-500 font-medium hidden sm:block">
                Monitor team pending work and call activity
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button 
              type="button"
              onClick={downloadCSV}
              disabled={loading || data.length === 0}
              className="flex items-center px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> 
              Export CSV
            </button>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab & Filter Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-gray-50/80 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Main Views Toggle */}
          <div className="inline-flex bg-gray-200/80 p-0.5 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`flex items-center px-3 py-1.5 rounded-md transition-all ${
                activeTab === "tasks"
                  ? "bg-white text-indigo-700 shadow-sm font-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
              Pending Tasks
              <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "tasks" ? "bg-indigo-100 text-indigo-700" : "bg-gray-300 text-gray-700"
              }`}>
                {totalPendingTasks}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("calls")}
              className={`flex items-center px-3 py-1.5 rounded-md transition-all ${
                activeTab === "calls"
                  ? "bg-white text-emerald-700 shadow-sm font-black"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Phone className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Whom They Called
              <span className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === "calls" ? "bg-emerald-100 text-emerald-700" : "bg-gray-300 text-gray-700"
              }`}>
                {totalCallsInFilter}
              </span>
            </button>
          </div>

          {/* Date Range Filter (Visible on Calls tab, or gives context) */}
          {activeTab === "calls" && (
            <div className="flex items-center space-x-1 bg-white border border-gray-200 p-0.5 rounded-lg text-xs font-semibold">
              <span className="text-[11px] text-gray-400 font-bold px-2 flex items-center">
                <Calendar className="w-3 h-3 mr-1 text-gray-400" /> Date:
              </span>
              {(["today", "yesterday", "week", "all"] as DateFilter[]).map(filter => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setDateFilter(filter)}
                  className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                    dateFilter === filter
                      ? "bg-emerald-600 text-white font-bold shadow-xs"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {filter === "week" ? "Last 7 Days" : filter === "all" ? "All Time" : filter}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 bg-gray-50/40">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-24 text-gray-400 space-y-3">
              <div className="w-7 h-7 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium">Loading team activity data...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-bold bg-white rounded-xl border border-dashed border-gray-200">
              No team members found in your organization.
            </div>
          ) : (
            <div className="space-y-4">
              {data.map((userReport, i) => {
                const filteredCalls = filterCalls(userReport.calls || [], dateFilter);
                const connectedCallsCount = filteredCalls.filter((c: any) => c.duration > 0).length;

                return (
                  <div 
                    key={i} 
                    className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden flex flex-col md:flex-row items-stretch transition-shadow hover:shadow-md"
                  >
                    {/* Left Member Box */}
                    <div className="bg-slate-50/70 px-5 py-4 border-b md:border-b-0 md:border-r border-gray-100 flex md:flex-col justify-between md:justify-center items-center md:w-52 shrink-0">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold flex items-center justify-center text-sm shadow-sm mb-2">
                          {userReport.user.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="font-bold text-gray-900 text-sm text-center leading-tight">
                          {userReport.user.name}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 mt-1 rounded bg-gray-200 text-gray-700">
                          {userReport.user.role}
                        </span>
                      </div>

                      {/* Stat Counters on the Left */}
                      <div className="grid grid-cols-2 md:grid-cols-1 gap-2 mt-2 md:mt-4 w-full text-center">
                        <div className={`p-1.5 rounded-lg border ${
                          activeTab === "tasks" ? "bg-indigo-50/80 border-indigo-200" : "bg-white border-gray-100"
                        }`}>
                          <div className="text-xl font-black text-indigo-600">
                            {userReport.pendingCount}
                          </div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                            Pending Tasks
                          </div>
                        </div>

                        <div className={`p-1.5 rounded-lg border ${
                          activeTab === "calls" ? "bg-emerald-50/80 border-emerald-200" : "bg-white border-gray-100"
                        }`}>
                          <div className="text-xl font-black text-emerald-600">
                            {filteredCalls.length}
                          </div>
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                            Calls ({dateFilter})
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Details Panel */}
                    <div className="p-4 flex-1 flex flex-col justify-center min-w-0 bg-white">
                      {/* VIEW 1: PENDING TASKS */}
                      {activeTab === "tasks" && (
                        <div>
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                              Assigned Pending Leads / Tasks ({userReport.pendingCount})
                            </span>
                          </div>

                          {userReport.pendingCount === 0 ? (
                            <div className="py-6 flex flex-col items-center justify-center text-gray-400">
                              <CheckCircle2 className="w-7 h-7 mb-1.5 text-emerald-500" />
                              <span className="text-xs font-bold text-gray-600">All caught up! No pending tasks.</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 max-h-[190px] overflow-y-auto pr-1.5">
                              {userReport.tasks.map((task: any, idx: number) => (
                                <div 
                                  key={idx} 
                                  className="flex items-center justify-between bg-gray-50 hover:bg-gray-100/80 p-2.5 rounded-lg border border-gray-100 transition-colors"
                                >
                                  <div className="flex items-center min-w-0 pr-2">
                                    {task.type === "Site Visit" ? (
                                      <div className="w-6 h-6 rounded-md bg-orange-100 text-orange-600 flex items-center justify-center mr-2 shrink-0">
                                        <MapPin className="w-3.5 h-3.5" />
                                      </div>
                                    ) : (
                                      <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-600 flex items-center justify-center mr-2 shrink-0">
                                        <PhoneCall className="w-3.5 h-3.5" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <Link 
                                        href={`/leads/${task.id}`} 
                                        target="_blank"
                                        className="font-bold text-gray-800 text-xs hover:text-indigo-600 hover:underline flex items-center truncate"
                                      >
                                        {task.name}
                                        <ExternalLink className="w-2.5 h-2.5 ml-1 text-gray-400 shrink-0" />
                                      </Link>
                                      {task.phone && (
                                        <div className="text-[10px] text-gray-400 font-medium">
                                          {task.phone}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-700 shrink-0">
                                    {task.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* VIEW 2: WHOM THEY CALLED */}
                      {activeTab === "calls" && (
                        <div>
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center">
                              <Phone className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Calls Made ({filteredCalls.length})
                            </span>
                            {filteredCalls.length > 0 && (
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                {connectedCallsCount} Connected / {filteredCalls.length - connectedCallsCount} Missed
                              </span>
                            )}
                          </div>

                          {filteredCalls.length === 0 ? (
                            <div className="py-6 flex flex-col items-center justify-center text-gray-400">
                              <AlertCircle className="w-7 h-7 mb-1.5 text-gray-300" />
                              <span className="text-xs font-medium text-gray-500">
                                No calls logged for {dateFilter === "today" ? "today" : dateFilter === "yesterday" ? "yesterday" : dateFilter === "week" ? "the last 7 days" : "this user"}.
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1.5">
                              {filteredCalls.map((call: any, idx: number) => {
                                const isConnected = call.duration > 0;
                                return (
                                  <div 
                                    key={idx}
                                    className="p-2.5 bg-gray-50/90 hover:bg-slate-50 border border-gray-100 rounded-lg transition-colors flex flex-col gap-1.5"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start min-w-0">
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center mr-2 shrink-0 ${
                                          isConnected ? "bg-emerald-100 text-emerald-600" : "bg-gray-200 text-gray-500"
                                        }`}>
                                          <Phone className="w-3.5 h-3.5" />
                                        </div>

                                        <div className="min-w-0">
                                          <div className="flex items-center space-x-2">
                                            <Link 
                                              href={`/leads/${call.leadId}`}
                                              target="_blank"
                                              className="font-bold text-gray-900 text-xs hover:text-emerald-600 hover:underline flex items-center truncate"
                                            >
                                              {call.leadName}
                                              <ExternalLink className="w-2.5 h-2.5 ml-1 text-gray-400 shrink-0" />
                                            </Link>
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 bg-white border border-gray-200 rounded text-gray-600 shrink-0">
                                              {call.leadStatus}
                                            </span>
                                          </div>

                                          <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5">
                                            <a 
                                              href={`tel:${call.leadPhone}`} 
                                              className="text-indigo-600 hover:underline font-mono text-[10px] font-semibold"
                                            >
                                              {call.leadPhone}
                                            </a>
                                            <span>•</span>
                                            <span className="flex items-center text-[10px] text-gray-400">
                                              <Clock className="w-2.5 h-2.5 mr-0.5" />
                                              {formatCallTime(call.createdAt)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Duration badge */}
                                      <div className="shrink-0 text-right">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full inline-block ${
                                          isConnected
                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                            : "bg-gray-100 text-gray-600 border border-gray-200"
                                        }`}>
                                          {call.durationFormatted}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Audio Recording / Notes if available */}
                                    {(call.recordingUrl || (call.notes && !call.notes.includes("Auto-synced call"))) && (
                                      <div className="pt-1.5 mt-0.5 border-t border-gray-200/50 flex flex-wrap items-center justify-between gap-2">
                                        {call.notes && (
                                          <p className="text-[10px] text-gray-500 italic truncate max-w-sm">
                                            {call.notes}
                                          </p>
                                        )}
                                        {call.recordingUrl && (
                                          <div className="flex items-center ml-auto">
                                            <audio 
                                              controls 
                                              src={call.recordingUrl} 
                                              preload="none" 
                                              className="h-6 w-44 scale-90 origin-right"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
