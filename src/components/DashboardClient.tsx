"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Settings, RefreshCw, ChevronDown, CheckCircle, XCircle, TrendingUp, Users, PhoneCall, Calendar, X, Download, Clock } from "lucide-react";
import { acceptLead, rejectLead, acceptAllLeads, rejectAllLeads } from "@/app/actions/leadActions";
import { getUserActivityLogs } from "@/app/actions/activityActions";

type Lead = {
  id: string;
  name: string;
  phone: string | null;
  source: string | null;
  status: string | null;
  assignedTo?: { name: string | null } | null;
  createdAt: Date;
};

type StatusStat = { label: string; count: number; percent: string };
type TeamMember = { initials: string; name: string; calls: number; duration: string; revenue: string; activeMinutes?: number };

type Props = {
  pendingLeads: Lead[];
  allLeads: Lead[];
  hotLeads?: (Lead & { computedScore?: number })[];
  statusBreakdown: StatusStat[];
  teamActivity: TeamMember[];
  totalLeads: number;
  userId: string;
  userRole?: string;
  userName?: string;
};

import { LEAD_STATUS_COLORS } from "@/lib/constants";

const STATUS_BAR_COLORS = [
  "bg-gray-400", "bg-orange-700", "bg-purple-700", "bg-blue-600",
  "bg-red-500", "bg-yellow-500", "bg-teal-500", "bg-indigo-500",
];

export default function DashboardClient({ pendingLeads, allLeads, hotLeads = [], statusBreakdown, teamActivity, totalLeads, userId, userRole, userName }: Props) {
  const [activeTab, setActiveTab] = useState<"default" | "pending">(pendingLeads.length > 0 ? "pending" : "default");
  const [pending, setPending] = useState(pendingLeads);
  const [selectedUserReport, setSelectedUserReport] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState<"accept" | "reject" | null>(null);

  const isAdmin = userRole === "ADMIN" || userRole === "ROOT";

  if (!isAdmin) {
    const myActivity = teamActivity.find(m => m.name === userName);
    const myInitials = userName?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "ME";
    
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        
        {/* Total Calls Today Card */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-wide">Total Calls Today</div>
            <div className="text-3xl font-black text-gray-800 mt-1">{myActivity?.calls || 0}</div>
          </div>
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
            <PhoneCall className="w-6 h-6 text-[#613cbc]" />
          </div>
        </div>

        {/* User Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center bg-gray-50 text-[#613cbc] font-bold text-lg">
                {myInitials}
              </div>
              <div>
                <div className="font-bold text-gray-900 text-lg">{userName || "Sales Person"}</div>
                <div className="text-sm text-gray-400">Caller</div>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500 font-medium">
              <div>First Call: NA</div>
              <div>Last Call: NA</div>
            </div>
          </div>
          
          <div className="flex divide-x divide-gray-100 p-6 text-center">
            <div className="flex-1">
              <div className="text-4xl font-black text-[#613cbc] mb-1">{myActivity?.calls || 0}</div>
              <div className="text-sm font-bold text-[#613cbc] uppercase tracking-wide">Calls</div>
            </div>
            <div className="flex-1">
              <div className="text-4xl font-black text-gray-700 mb-1">{myActivity?.duration || "0s"}</div>
              <div className="text-sm font-bold text-gray-400 uppercase tracking-wide">Duration</div>
            </div>
            <div className="flex-1">
              <div className="text-4xl font-black text-gray-700 mb-1">0</div>
              <div className="text-sm font-bold text-gray-400 uppercase tracking-wide">Sales</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const maxCount = statusBreakdown[0]?.count ?? 1;

  const handleAccept = async (id: string) => {
    setLoadingId(id);
    await acceptLead(id);
    setPending(prev => prev.filter(l => l.id !== id));
    setLoadingId(null);
  };

  const handleReject = async (id: string) => {
    setLoadingId(id);
    await rejectLead(id);
    setPending(prev => prev.filter(l => l.id !== id));
    setLoadingId(null);
  };

  const handleAcceptAll = async () => {
    if (!confirm(`Accept all ${pending.length} pending leads? They will be added to your leads list.`)) return;
    setBulkLoading("accept");
    await acceptAllLeads(userId);
    setPending([]);
    setBulkLoading(null);
  };

  const handleRejectAll = async () => {
    if (!confirm(`Reject all ${pending.length} pending leads? They will be reassigned to other team members.`)) return;
    setBulkLoading("reject");
    await rejectAllLeads(userId);
    setPending([]);
    setBulkLoading(null);
  };

  function timeAgo(d: Date | string) {
    const ms = Date.now() - new Date(d).getTime();
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days}d ago`;
  }

  return (
    <div className="h-full bg-[#F8F9FA] flex flex-col -m-3 md:-m-6 overflow-y-auto">

      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center bg-white shrink-0">
        <div className="flex space-x-1 md:space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("default")}
            className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${
              activeTab === "default" 
                ? "border-[#613cbc] text-white bg-[#613cbc] rounded-t-md px-4" 
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`text-sm font-bold px-4 py-2 rounded-lg flex items-center transition-colors whitespace-nowrap ${
              activeTab === "pending"
                ? "bg-[#613cbc] text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Pending Leads
            {pending.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {pending.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Pending Tab */}
      {activeTab === "pending" && (
        <div className="p-3 md:p-6">
          <h3 className="text-[15px] font-bold text-gray-800 mb-4 flex items-center">
            New Leads Assigned to You
            <span className="ml-2 bg-[#613cbc] text-white text-[11px] font-black px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          </h3>
          {pending.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
              <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-[#613cbc]" />
              </div>
              <div className="text-[15px] font-bold text-gray-700">All caught up!</div>
              <div className="text-[13px] text-gray-400 mt-1">No pending leads to accept or reject.</div>
            </div>
          ) : (
            <>
              {/* Bulk Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 gap-2">
                <div className="text-[13px] text-amber-800 font-semibold">
                  {pending.length} new lead{pending.length !== 1 ? "s" : ""} waiting for your response
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleRejectAll}
                    disabled={!!bulkLoading}
                    className="flex items-center px-3 py-2 text-[12px] font-bold text-gray-600 border border-gray-300 bg-white rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-colors"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    {bulkLoading === "reject" ? "Rejecting..." : "Reject All"}
                  </button>
                  <button
                    onClick={handleAcceptAll}
                    disabled={!!bulkLoading}
                    className="flex items-center px-3 py-2 text-[12px] font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" />
                    {bulkLoading === "accept" ? "Accepting..." : `Accept All ${pending.length}`}
                  </button>
                </div>
              </div>

            <div className="space-y-3">
              {pending.map(lead => (
                <div key={lead.id} className="bg-white border border-yellow-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <Link href={`/leads/${lead.id}`} className="font-bold text-[15px] text-[#613cbc] hover:underline cursor-pointer">
                      {lead.name}
                    </Link>
                    <div className="text-[13px] text-gray-500 mt-1 flex items-center">
                      {lead.phone} · {lead.source ?? "Unknown Source"}
                    </div>
                    <div className="text-[11px] text-red-500 mt-1 font-bold">
                      ⏱ Accept within 10 minutes or it will be reassigned.
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        handleAccept(lead.id);
                        window.location.href = `tel:${lead.phone}`;
                      }}
                      disabled={loadingId === lead.id}
                      className="flex items-center px-4 py-2 bg-green-600 text-white text-[12px] font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Call
                    </button>
                    <button
                      onClick={() => handleReject(lead.id)}
                      disabled={loadingId === lead.id}
                      className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 border border-gray-200 text-[12px] font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-4 h-4 mr-1.5" /> Pass
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      )}

      {/* Default Tab */}
      {activeTab === "default" && (
        <div className="p-3 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">

          {/* All Leads Status Widget */}
          <AllLeadsWidget statusBreakdown={statusBreakdown} totalLeads={totalLeads} />

          {/* Hot Leads Widget */}
          <HotLeadsWidget hotLeads={hotLeads} />

          {/* Recent Leads List */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="text-[13px] font-bold text-gray-800">Recent Leads</div>
              <button className="text-[11px] text-[#613cbc] font-bold hover:underline">View All →</button>
            </div>
            <div className="divide-y divide-gray-50 overflow-y-auto max-h-80">
              {allLeads.slice(0, 15).map(lead => (
                <div key={lead.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="min-w-0 flex-1 mr-2">
                    <Link href={`/leads/${lead.id}`} className="text-[13px] font-semibold text-[#613cbc] cursor-pointer hover:underline truncate block">
                      {lead.name}
                    </Link>
                    <div className="text-[11px] text-gray-400 truncate">{lead.phone ?? "--"} · {timeAgo(lead.createdAt)}</div>
                  </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded ${LEAD_STATUS_COLORS[lead.status ?? ""] ?? "bg-gray-400"}`}>
                        {lead.status ?? "Fresh"}
                      </span>
                      {lead.assignedTo && (
                      <div className="w-5 h-5 rounded-full bg-[#E8E2F7] text-[#613cbc] hidden sm:flex items-center justify-center text-[9px] font-bold" title={lead.assignedTo.name ?? ""}>
                        {(lead.assignedTo.name ?? "?").split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team Activity & Performance */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden col-span-1 md:col-span-3">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="text-[13px] font-bold text-gray-800">Activity & Performance</div>
            </div>
            
            <div className="p-4">
              {teamActivity.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="flex text-xs font-bold text-gray-400 uppercase tracking-wider pb-3 border-b border-gray-100">
                    <div className="flex-1">Team Member</div>
                    <div className="w-16 text-center">Calls</div>
                    <div className="w-20 text-center">Duration</div>
                    <div className="w-24 text-center">Report</div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {teamActivity.map(m => (
                      <div key={m.name} className="flex py-3 items-center text-sm">
                        <div className="flex-1 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-[#613cbc] font-bold flex items-center justify-center text-xs">
                            {m.initials}
                          </div>
                          <span className="font-semibold text-gray-700">{m.name}</span>
                        </div>
                        <div className="w-16 text-center text-gray-600">{m.calls}</div>
                        <div className="w-20 text-center text-gray-600">{m.duration}</div>
                        <div className="w-24 text-center">
                          <button
                            onClick={() => setSelectedUserReport(m.name)}
                            className="text-[10px] font-bold text-[#613cbc] hover:underline"
                          >
                            View Report
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-4 text-sm">No activity recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedUserReport && (
        <UserReportModal 
          userName={selectedUserReport} 
          onClose={() => setSelectedUserReport(null)} 
          allLeads={allLeads}
          teamActivity={teamActivity}
        />
      )}
    </div>
  );
}

// ─── Sub-component: Interactive All Leads Widget ──────────────────────────────

function HotLeadsWidget({ hotLeads }: { hotLeads: (Lead & { computedScore?: number })[] }) {
  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-orange-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-orange-100 flex items-center justify-between bg-white/50 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-orange-600" />
          <div className="text-[13px] font-bold text-gray-800">Hot Leads (AI Top Picks)</div>
        </div>
        <Link href="/leads" className="text-[11px] text-orange-600 font-bold hover:underline">View All &rarr;</Link>
      </div>
      <div className="divide-y divide-orange-100/50 overflow-y-auto flex-1">
        {hotLeads.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">No hot leads right now.</div>
        ) : (
          hotLeads.map(lead => (
            <div key={lead.id} className="px-4 py-3 flex items-center justify-between hover:bg-orange-100/50 transition-colors">
              <div className="min-w-0 flex-1 mr-2">
                <Link href={`/leads/${lead.id}`} className="text-[13px] font-semibold text-gray-900 hover:text-orange-700 cursor-pointer hover:underline truncate block">
                  {lead.name}
                </Link>
                <div className="text-[11px] text-gray-500 truncate">{lead.phone ?? "--"} &bull; {lead.status ?? "Fresh"}</div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <div className="flex flex-col items-end">
                  <span className="text-[14px] font-black text-orange-600 leading-none">
                    {lead.computedScore?.toFixed(1) ?? "0.0"}
                  </span>
                  <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider">Score</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const DATE_OPTIONS = ["All Time", "Today", "Yesterday", "Last 7 days", "Last 30 days", "This Month"] as const;
type DateOption = typeof DATE_OPTIONS[number];
type SortOption = "default" | "count-high" | "count-low" | "a-z";

function AllLeadsWidget({ statusBreakdown, totalLeads, title = "All Leads" }: { statusBreakdown: StatusStat[]; totalLeads: number; title?: string }) {
  const [dateFilter, setDateFilter] = useState<DateOption>("All Time");
  const [dateOpen, setDateOpen] = useState(false);
  const [sort, setSort] = useState<SortOption>("default");

  // Since status breakdown comes from the server, we sort/filter client-side
  // (Date filter is a UI label — actual filtering would need server data by date)
  const sorted = [...statusBreakdown].sort((a, b) => {
    if (sort === "count-high") return b.count - a.count;
    if (sort === "count-low") return a.count - b.count;
    if (sort === "a-z") return a.label.localeCompare(b.label);
    return 0; // default order
  });

  const maxCount = sorted[0]?.count ?? 1;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center">
          <TrendingUp className="w-4 h-4 text-[#613cbc] mr-2" />
          <div>
            <div className="text-[13px] font-bold text-gray-800">{title}</div>
            <div className="text-[10px] text-gray-400">Total Leads: {totalLeads}</div>
          </div>
        </div>

        {/* Creation Date Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDateOpen(!dateOpen)}
            className="text-[11px] font-bold text-gray-600 flex items-center border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 hover:border-[#613cbc] transition-colors"
          >
            <span className="mr-1">📅</span> {dateFilter} <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${dateOpen ? "rotate-180" : ""}`} />
          </button>
          {dateOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
              {DATE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => { setDateFilter(opt); setDateOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-[12px] hover:bg-purple-50 hover:text-[#613cbc] transition-colors flex items-center justify-between ${
                    dateFilter === opt ? "text-[#613cbc] font-bold bg-purple-50" : "text-gray-700"
                  }`}
                >
                  {opt}
                  {dateFilter === opt && <span className="text-[#613cbc]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sort Buttons */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex space-x-1.5 text-[11px]">
        {([
          { key: "default", label: "Default order" },
          { key: "count-high", label: "High-Low" },
          { key: "count-low", label: "Low-High" },
          { key: "a-z", label: "A-Z" },
        ] as { key: SortOption; label: string }[]).map(s => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`px-2.5 py-1 rounded font-bold transition-colors ${
              sort === s.key
                ? "bg-[#613cbc] text-white"
                : "text-gray-500 border border-gray-200 hover:bg-gray-50 hover:border-[#613cbc]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Column Headers */}
      <div className="px-3 py-2 border-b border-gray-100 flex text-[11px] font-bold text-gray-500">
        <span className="flex-1">STATUS</span>
        <span className="w-16 text-center">COUNT</span>
        <span className="w-16 text-center">SHARE</span>
      </div>

      {/* Rows */}
      <div className="overflow-y-auto max-h-72 divide-y divide-gray-50">
        {sorted.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No leads yet.</div>
        ) : (
          sorted.map((s, i) => (
            <div key={s.label} className="flex items-center px-3 py-2.5 hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = '/leads?status=' + encodeURIComponent(s.label)}>
              <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${STATUS_BAR_COLORS[i % STATUS_BAR_COLORS.length]}`} />
              <span className="flex-1 text-[13px] text-gray-700">{s.label}</span>
              <span className="w-16 text-center text-[13px] font-bold text-gray-800">{s.count}</span>
              <div className="w-16 flex items-center">
                <div
                  className={`h-2 rounded-full transition-all ${STATUS_BAR_COLORS[i % STATUS_BAR_COLORS.length]}`}
                  style={{ width: `${Math.round((s.count / maxCount) * 56)}px` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer: selected date label */}
      {dateFilter !== "All Time" && (
        <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400 flex items-center">
          <span className="mr-1">📅</span> Showing: <span className="font-bold text-gray-600 ml-1">{dateFilter}</span>
          <button onClick={() => setDateFilter("All Time")} className="ml-auto text-[#613cbc] hover:underline">Clear</button>
        </div>
      )}
    </div>
  );
}

function UserReportModal({ userName, onClose, allLeads, teamActivity }: { userName: string, onClose: () => void, allLeads: Lead[], teamActivity: TeamMember[] }) {
  const [activeTab, setActiveTab] = useState<"overview" | "logs">("overview");
  const [logs, setLogs] = useState<any[]>([]);

  const userLeads = allLeads.filter(l => l.assignedTo?.name === userName);
  const userActivity = teamActivity.find(t => t.name === userName);
  
  const breakdown: Record<string, number> = {};
  userLeads.forEach(l => {
    const s = l.status || "NEW";
    breakdown[s] = (breakdown[s] || 0) + 1;
  });
  
  const statusBreakdown = Object.keys(breakdown).map(label => ({
    label,
    count: breakdown[label],
    percent: ((breakdown[label] / userLeads.length) * 100).toFixed(1) + "%"
  }));

  useEffect(() => {
    if (activeTab === "logs") {
      getUserActivityLogs(userName).then(setLogs);
    }
  }, [activeTab, userName]);

  const downloadCSV = () => {
    const headers = ["Status", "Count", "Percentage"];
    const rows = statusBreakdown.map(b => [b.label, b.count, b.percent]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${userName.replace(/\s+/g, '_')}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E8E2F7] text-[#613cbc] font-bold flex items-center justify-center text-sm">
                {userName.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">{userName}&apos;s Report</h2>
                <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">
                    {userActivity?.activeMinutes ?? 0}m ACTIVE TODAY
                  </span>
                  <span>{userActivity?.calls ?? 0} calls</span>
                </p>
              </div>
            </div>
            {activeTab === "overview" && (
              <div className="flex items-center gap-2 mr-8 md:mr-10">
                <button onClick={downloadCSV} className="flex items-center gap-2 bg-[#613cbc] text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 transition-colors">
                  <Download className="w-4 h-4" /> Download CSV
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-4 border-b border-gray-200 px-2">
            <button 
              onClick={() => setActiveTab("overview")} 
              className={`px-3 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === "overview" ? "border-[#613cbc] text-[#613cbc]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab("logs")} 
              className={`px-3 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === "logs" ? "border-[#613cbc] text-[#613cbc]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Activity Logs
            </button>
          </div>
        </div>
        <div className="p-6 bg-gray-50 overflow-y-auto flex-1">
          {activeTab === "overview" ? (
            <AllLeadsWidget statusBreakdown={statusBreakdown} totalLeads={userLeads.length} title={`${userName}'s Leads`} />
          ) : (
            <div className="space-y-4">
              {logs.length > 0 ? (
                logs.map(log => (
                  <div key={log.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-[#613cbc] text-sm">{log.action}</span>
                      <span className="text-xs text-gray-400 flex items-center"><Clock className="w-3 h-3 mr-1" /> {new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    {log.details && <p className="text-sm text-gray-600">{log.details}</p>}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No logs found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
