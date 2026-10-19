"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BarChart3, Users, PhoneCall, FileText, MapPin, Trophy, AlertTriangle, 
  Clock, ShieldAlert, ChevronDown, ChevronRight, Filter, Download, 
  Calendar, RefreshCw, CheckCircle2, Search, ArrowUpRight, Sparkles, User, AlertCircle
} from "lucide-react";
import { getAdminComprehensiveReport, PeriodFilter, LeadCohortFilter } from "@/app/actions/adminReportActions";

export default function AdminAuditReportClient() {
  const [activeTab, setActiveTab] = useState<"METRICS" | "LOGS" | "ESCALATIONS">("METRICS");
  const [period, setPeriod] = useState<PeriodFilter>("DAILY");
  const [leadCohort, setLeadCohort] = useState<LeadCohortFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  
  // Filter & Search states
  const [logSearch, setLogSearch] = useState("");
  const [selectedUserFilter, setSelectedUserFilter] = useState("ALL");
  const [expandedUserEscalation, setExpandedUserEscalation] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await getAdminComprehensiveReport(period, leadCohort);
      setReportData(data);
    } catch (err) {
      console.error("Failed to load admin report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [period, leadCohort]);

  const downloadCSV = () => {
    if (!reportData) return;
    let csv = "Employee,Role,Calls,Duration,Notes,Site Visits,Quotations,Leads Won\n";
    reportData.userPerformance.forEach((u: any) => {
      csv += `"${u.name}","${u.role}","${u.userCalls}","${u.durationFormatted}","${u.notesCount}","${u.siteVisitsScheduled}","${u.quotationsSent}","${u.leadsWon}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Admin_Audit_Report_${period}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const filteredLogs = reportData?.allActivityLogs?.filter((l: any) => {
    const matchesUser = selectedUserFilter === "ALL" || l.userName === selectedUserFilter;
    const matchesSearch = 
      logSearch === "" || 
      l.userName.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.details.toLowerCase().includes(logSearch.toLowerCase());
    return matchesUser && matchesSearch;
  }) || [];

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] -m-3 md:-m-6 overflow-y-auto">
      
      {/* Top Header */}
      <div className="p-4 md:p-6 bg-white border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                Executive Audit & Activity Center
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Comprehensive supervision of all employee actions, daily/weekly/monthly quotas, and live SLA escalations.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Timeframe Filter (Daily / Weekly / Monthly / All Time) */}
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold border border-gray-200">
            <button
              onClick={() => setPeriod("DAILY")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "DAILY" ? "bg-white text-indigo-700 shadow-xs font-black" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setPeriod("WEEKLY")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "WEEKLY" ? "bg-white text-indigo-700 shadow-xs font-black" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setPeriod("MONTHLY")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "MONTHLY" ? "bg-white text-indigo-700 shadow-xs font-black" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod("ALL_TIME")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === "ALL_TIME" ? "bg-white text-indigo-700 shadow-xs font-black" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Lead Cohort Filter (New vs Existing vs All) */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-2.5 py-1 text-xs font-bold shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={leadCohort}
              onChange={(e) => setLeadCohort(e.target.value as any)}
              className="bg-transparent border-none outline-none text-gray-700 font-bold cursor-pointer py-0.5"
            >
              <option value="ALL">All Leads in Period</option>
              <option value="NEW_ONLY">New Leads Created</option>
              <option value="EXISTING">Existing Carried Leads</option>
            </select>
          </div>

          <button
            onClick={downloadCSV}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
            title="Export CSV"
          >
            <Download className="w-4 h-4 text-gray-500" />
            Export
          </button>

          <button
            onClick={fetchReport}
            className="p-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl transition-colors shadow-2xs"
            title="Refresh Report"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main KPI Strip */}
      <div className="p-4 md:p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 shrink-0">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Calls Logged</div>
            <div className="text-2xl md:text-3xl font-black text-indigo-600 mt-1">
              {loading ? "..." : reportData?.totals?.totalCalls || 0}
            </div>
            <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{period.toLowerCase()} period</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <PhoneCall className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Notes & Insights</div>
            <div className="text-2xl md:text-3xl font-black text-purple-600 mt-1">
              {loading ? "..." : reportData?.totals?.totalNotes || 0}
            </div>
            <div className="text-[10px] text-gray-400 font-semibold mt-0.5">client interactions</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Site Visits Set</div>
            <div className="text-2xl md:text-3xl font-black text-orange-600 mt-1">
              {loading ? "..." : reportData?.totals?.totalSiteVisitsScheduled || 0}
            </div>
            <div className="text-[10px] text-gray-400 font-semibold mt-0.5">field appointments</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Deals Won / Closed</div>
            <div className="text-2xl md:text-3xl font-black text-emerald-600 mt-1">
              {loading ? "..." : reportData?.totals?.totalLeadsWon || 0}
            </div>
            <div className="text-[10px] text-gray-400 font-semibold mt-0.5">converted into projects</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
        </div>

        <div className={`p-4 rounded-2xl border shadow-2xs flex items-center justify-between ${
          (reportData?.totals?.totalEscalationsCount || 0) > 0 
            ? "bg-red-50/70 border-red-200" 
            : "bg-white border-gray-200"
        }`}>
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${
              (reportData?.totals?.totalEscalationsCount || 0) > 0 ? "text-red-700" : "text-gray-400"
            }`}>
              Live Escalations
            </div>
            <div className={`text-2xl md:text-3xl font-black mt-1 ${
              (reportData?.totals?.totalEscalationsCount || 0) > 0 ? "text-red-600" : "text-gray-800"
            }`}>
              {loading ? "..." : reportData?.totals?.totalEscalationsCount || 0}
            </div>
            <div className="text-[10px] text-red-500 font-semibold mt-0.5">action breaches</div>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            (reportData?.totals?.totalEscalationsCount || 0) > 0 ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-400"
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Nav Tabs for the 3 Admin Sections */}
      <div className="px-4 md:px-6 pb-0 flex border-b border-gray-200 bg-white gap-2 shrink-0">
        <button
          onClick={() => setActiveTab("METRICS")}
          className={`py-3.5 px-4 font-black text-xs md:text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "METRICS" 
              ? "border-[#4f46e5] text-[#4f46e5]" 
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>User Performance & Totals</span>
        </button>

        <button
          onClick={() => setActiveTab("LOGS")}
          className={`py-3.5 px-4 font-black text-xs md:text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "LOGS" 
              ? "border-[#4f46e5] text-[#4f46e5]" 
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>All User Activity Logs Feed</span>
          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded-full font-bold">
            {reportData?.allActivityLogs?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("ESCALATIONS")}
          className={`py-3.5 px-4 font-black text-xs md:text-sm border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "ESCALATIONS" 
              ? "border-red-600 text-red-600" 
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <span>Detailed Escalations Breakdown</span>
          {(reportData?.totals?.totalEscalationsCount || 0) > 0 && (
            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.2 rounded-full font-extrabold animate-pulse">
              {reportData?.totals?.totalEscalationsCount} Pending
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Content Body */}
      <div className="p-4 md:p-6 flex-1">
        
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            <p className="text-xs font-bold">Crunching user logs and escalation rules...</p>
          </div>
        ) : (
          <>
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* SECTION 1: USER PERFORMANCE METRICS                                */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === "METRICS" && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                      <h3 className="text-sm font-black text-gray-900">
                        Employee Output Breakdown ({period.toLowerCase()})
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Track calls, talk-time, notes recorded, and lead progression per employee.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-gray-500 bg-white border border-gray-200 px-2.5 py-1 rounded-lg">
                      {reportData?.userPerformance?.length || 0} Team Members
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/80 text-gray-500 font-bold border-b border-gray-100 uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="p-4">Employee</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Calls Made</th>
                          <th className="p-4">Talk Time</th>
                          <th className="p-4">Notes Added</th>
                          <th className="p-4">Site Visits</th>
                          <th className="p-4">Quotes Sent</th>
                          <th className="p-4">Leads Won</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {reportData?.userPerformance?.map((user: any) => (
                          <tr key={user.userId} className="hover:bg-gray-50/70 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center text-xs">
                                  {user.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900">{user.name}</div>
                                  <div className="text-[10px] text-gray-400">{user.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-gray-100 text-gray-700 border border-gray-200">
                                {user.role}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-indigo-700 text-sm">
                              {user.userCalls}
                            </td>
                            <td className="p-4 text-gray-700">
                              {user.durationFormatted}
                            </td>
                            <td className="p-4 font-bold text-purple-700">
                              {user.notesCount}
                            </td>
                            <td className="p-4 text-orange-700 font-bold">
                              {user.siteVisitsScheduled}
                            </td>
                            <td className="p-4 text-blue-700 font-bold">
                              {user.quotationsSent}
                            </td>
                            <td className="p-4 font-bold text-emerald-700">
                              {user.leadsWon}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedUserFilter(user.name);
                                  setActiveTab("LOGS");
                                }}
                                className="text-[#4f46e5] hover:underline font-bold text-xs inline-flex items-center gap-1"
                              >
                                View Logs <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* SECTION 2: ALL USER ACTIVITY LOGS (UNIFIED FEED)                   */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === "LOGS" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                
                {/* Search & Filter Header */}
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search logs by action, keyword, lead..."
                        value={logSearch}
                        onChange={(e) => setLogSearch(e.target.value)}
                        className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-500 w-64 md:w-80 shadow-2xs"
                      />
                    </div>

                    <select
                      value={selectedUserFilter}
                      onChange={(e) => setSelectedUserFilter(e.target.value)}
                      className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 outline-none focus:border-indigo-500 shadow-2xs"
                    >
                      <option value="ALL">All Users ({reportData?.userPerformance?.length})</option>
                      {reportData?.userPerformance?.map((u: any) => (
                        <option key={u.userId} value={u.name}>{u.name} ({u.role})</option>
                      ))}
                    </select>

                    {selectedUserFilter !== "ALL" && (
                      <button
                        onClick={() => setSelectedUserFilter("ALL")}
                        className="text-xs text-indigo-600 font-bold hover:underline"
                      >
                        Reset User
                      </button>
                    )}
                  </div>

                  <span className="text-xs text-gray-400 font-medium">
                    Showing <strong>{filteredLogs.length}</strong> activity logs
                  </span>
                </div>

                {/* Activity Feed Table */}
                <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                  {filteredLogs.length === 0 ? (
                    <div className="py-20 text-center text-gray-400 flex flex-col items-center justify-center">
                      <Clock className="w-10 h-10 text-gray-300 mb-2" />
                      <span className="text-sm font-bold text-gray-600">No activity logs found</span>
                      <p className="text-xs text-gray-400 mt-1">Try adjusting your user filter or search term.</p>
                    </div>
                  ) : (
                    filteredLogs.map((log: any) => (
                      <div key={log.id} className="p-4 hover:bg-gray-50/80 transition-colors flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {log.userName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-gray-900">{log.userName}</span>
                              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 border border-gray-200">
                                {log.userRole}
                              </span>
                              <span className="font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                {log.action}
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                              {log.details || "Action recorded"}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-mono text-gray-400 whitespace-nowrap shrink-0">
                          {log.formattedTime}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* SECTION 3: DETAILED ESCALATION ACCORDION PER USER                  */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === "ESCALATIONS" && (
              <div className="space-y-4">
                
                {/* Alert Warning Box */}
                <div className="bg-gradient-to-r from-red-600 to-rose-600 rounded-2xl p-5 text-white shadow-md flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                      <ShieldAlert className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight">
                        {reportData?.totals?.totalEscalationsCount || 0} Total Rule Breaches & Escalations Detected
                      </h3>
                      <p className="text-xs text-red-100 mt-0.5">
                        Expand each user card below to inspect exactly which leads triggered violations and what action is required.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Per-User Escalation Cards */}
                <div className="space-y-3">
                  {reportData?.escalationsByUser?.map((userEsc: any) => {
                    const isExpanded = expandedUserEscalation === userEsc.userName;

                    return (
                      <div 
                        key={userEsc.userName}
                        className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                          userEsc.totalEscalations > 0 
                            ? "border-red-200 shadow-xs" 
                            : "border-gray-200"
                        }`}
                      >
                        {/* Header Bar */}
                        <div 
                          onClick={() => setExpandedUserEscalation(isExpanded ? null : userEsc.userName)}
                          className="p-4 md:p-5 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${
                              userEsc.totalEscalations > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                            }`}>
                              {userEsc.userName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-sm text-gray-900">{userEsc.userName}</h4>
                                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  userEsc.totalEscalations > 0 ? "bg-red-100 text-red-700 border border-red-200" : "bg-emerald-100 text-emerald-700"
                                }`}>
                                  {userEsc.totalEscalations > 0 ? `${userEsc.totalEscalations} Escalations` : "Zero Escalations"}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                {userEsc.breakdown.MISSED_FOLLOWUP > 0 && (
                                  <span className="text-amber-700 font-bold">• {userEsc.breakdown.MISSED_FOLLOWUP} Missed Follow-ups</span>
                                )}
                                {userEsc.breakdown.GHOSTED_CONTACT > 0 && (
                                  <span className="text-red-700 font-bold">• {userEsc.breakdown.GHOSTED_CONTACT} Ghosted Leads</span>
                                )}
                                {userEsc.breakdown.UNVERIFIED_SITE_VISIT > 0 && (
                                  <span className="text-orange-700 font-bold">• {userEsc.breakdown.UNVERIFIED_SITE_VISIT} Unverified Visits</span>
                                )}
                                {userEsc.breakdown.POST_VISIT_NEGLECT > 0 && (
                                  <span className="text-purple-700 font-bold">• {userEsc.breakdown.POST_VISIT_NEGLECT} Post-Visit Silences</span>
                                )}
                                {userEsc.breakdown.ENDLESS_FOLLOWUP > 0 && (
                                  <span className="text-rose-700 font-bold">• {userEsc.breakdown.ENDLESS_FOLLOWUP} 5+ Follow-up Hoardings</span>
                                )}
                                {userEsc.totalEscalations === 0 && (
                                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> All SLAs met on time
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-indigo-600 font-bold hidden sm:inline">
                              {isExpanded ? "Collapse" : "Expand Details"}
                            </span>
                            <div className="p-1 rounded-lg bg-gray-100 text-gray-500">
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                          </div>
                        </div>

                        {/* Expanded Drawer: All Detailed Leads Under This User */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 bg-gray-50/60 p-4 md:p-5 space-y-3">
                            {userEsc.items.length === 0 ? (
                              <div className="text-center py-6 text-xs text-gray-500 font-medium">
                                No rule violations found for this employee. Excellent performance! 🎉
                              </div>
                            ) : (
                              userEsc.items.map((esc: any) => (
                                <div 
                                  key={esc.id} 
                                  className="bg-white rounded-xl border border-red-200/80 p-4 shadow-2xs hover:shadow-xs transition-shadow"
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2 mb-2.5">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                        esc.severity === "CRITICAL" ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                                      }`}>
                                        {esc.categoryLabel}
                                      </span>
                                      <Link 
                                        href={`/leads/${esc.leadId}`}
                                        className="font-bold text-sm text-gray-900 hover:text-indigo-600 hover:underline"
                                      >
                                        {esc.leadName}
                                      </Link>
                                      <span className="text-xs text-gray-500 font-mono font-bold">
                                        {esc.phone}
                                      </span>
                                    </div>

                                    <Link
                                      href={`/leads/${esc.leadId}`}
                                      className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1 self-start sm:self-auto"
                                    >
                                      Inspect Lead <ArrowUpRight className="w-3.5 h-3.5" />
                                    </Link>
                                  </div>

                                  <div className="text-xs text-gray-700 leading-relaxed font-medium">
                                    <strong>Reason:</strong> {esc.details}
                                  </div>

                                  <div className="mt-2 text-xs bg-amber-50 border border-amber-200/80 rounded-lg p-2 text-amber-900 flex items-start gap-1.5 font-medium">
                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div><strong>Recommended Admin Action:</strong> {esc.actionRequired}</div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>

              </div>
            )}
          </>
        )}

      </div>

    </div>
  );
}
