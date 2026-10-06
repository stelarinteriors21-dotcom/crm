"use client";

import React, { useState } from "react";
import { Search, RefreshCw, Download, ChevronDown, TrendingUp } from "lucide-react";

type TeamMember = {
  name: string;
  role: string;
  initials: string;
  calls: number;
  duration: string;
  sales: number;
  firstCall: string;
  lastCall: string;
};

type Props = {
  team: TeamMember[];
};

const PERIODS = ["DAY", "WEEK", "MONTH", "YEAR"] as const;

export default function LeaderboardClient({ team }: Props) {
  const [period, setPeriod] = useState<typeof PERIODS[number]>("DAY");
  const [filter, setFilter] = useState("Calls");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TeamMember | null>(team[0] ?? null);

  const filtered = team.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalCalls = team.reduce((s, m) => s + m.calls, 0);
  const totalDuration = team.reduce((s, m) => s + parseDuration(m.duration), 0);
  const totalSales = team.reduce((s, m) => s + m.sales, 0);

  function parseDuration(d: string) {
    if (!d || d === "NA" || d === "0s") return 0;
    let secs = 0;
    const m = d.match(/(\d+)m/); if (m) secs += parseInt(m[1]) * 60;
    const s = d.match(/(\d+)s/); if (s) secs += parseInt(s[1]);
    return secs;
  }

  function formatSecs(s: number) {
    if (s === 0) return "0s";
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }

  const rankColors = ["#f0a500", "#9b9b9b", "#b45b2d"];
  const rankBg = ["bg-yellow-50 border-yellow-200", "bg-gray-50 border-gray-200", "bg-orange-50 border-orange-200"];

  return (
    <div className="h-full bg-white flex flex-col -m-3 md:-m-6 relative overflow-hidden">
      <div className="flex flex-1 overflow-hidden">

        {/* Left Panel */}
        <div className="w-[400px] border-r border-gray-100 flex flex-col overflow-y-auto bg-[#FDFDFD] shrink-0">
          
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
            <h1 className="text-[17px] font-bold text-gray-700 flex items-center">
              Leaderboard <RefreshCw className="w-3.5 h-3.5 ml-2 text-[#4f46e5] cursor-pointer" />
            </h1>
            <div className="flex items-center space-x-1">
              <button className="p-1.5 rounded text-gray-500 hover:bg-gray-100 transition-colors" title="Download Report">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Period Tabs */}
          <div className="flex border-b border-gray-100 px-4 bg-white shrink-0">
            {PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-3 text-[13px] font-bold transition-colors ${
                  period === p
                    ? "text-[#4f46e5] border-b-2 border-[#4f46e5]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2 px-4 py-3 border-b border-gray-100 shrink-0">
            <button className="flex items-center text-xs font-medium text-[#4f46e5] border border-[#4f46e5] rounded-full px-3 py-1 bg-purple-50">
              Today <ChevronDown className="w-3 h-3 ml-1" />
            </button>
            <button
              className="flex items-center text-xs font-medium text-gray-600 border border-gray-200 rounded-full px-3 py-1 hover:border-[#4f46e5] transition-colors"
              onClick={() => setFilter(filter === "Calls" ? "Duration" : "Calls")}
            >
              {filter} <ChevronDown className="w-3 h-3 ml-1" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by teammember name"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5]"
              />
            </div>
          </div>

          {/* Total Stats */}
          <div className="px-4 py-3 border-b border-gray-100 bg-white shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center text-[11px] font-bold text-gray-500">
                <TrendingUp className="w-3 h-3 mr-1 text-[#4f46e5]" /> Total Stats
              </div>
              <span className="text-[11px] text-[#4f46e5] font-bold bg-purple-50 px-2 py-0.5 rounded-full">
                Team size: {team.length}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-[22px] font-bold text-[#4f46e5]">{totalCalls}</div>
                <div className="text-[11px] text-gray-400">Calls</div>
              </div>
              <div className="text-center border-x border-gray-100">
                <div className="text-[22px] font-bold text-[#4f46e5]">{formatSecs(totalDuration)}</div>
                <div className="text-[11px] text-gray-400">Duration</div>
              </div>
              <div className="text-center">
                <div className="text-[22px] font-bold text-[#4f46e5]">{totalSales}</div>
                <div className="text-[11px] text-gray-400">Sales</div>
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((member, index) => (
              <div
                key={member.name}
                onClick={() => setSelected(member)}
                className={`px-4 py-4 border-b border-gray-100 cursor-pointer transition-colors ${
                  selected?.name === member.name ? "bg-purple-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="relative mr-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-[#4f46e5] bg-[#E8E2F7]`}>
                        {member.initials}
                      </div>
                      <div
                        className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                        style={{ backgroundColor: rankColors[index] ?? "#888" }}
                      >
                        #{index + 1}
                      </div>
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-gray-800">{member.name}</div>
                      <div className="text-[11px] text-gray-400">{member.role}</div>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-gray-400">
                    <div>First Call: <span className="font-medium text-gray-600">{member.firstCall}</span></div>
                    <div>Last Call: <span className="font-medium text-gray-600">{member.lastCall}</span></div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className={`text-[20px] font-bold ${member.calls > 0 ? "text-[#4f46e5]" : "text-gray-300"}`}>{member.calls}</div>
                    <div className="text-[10px] text-[#4f46e5] font-semibold">Calls</div>
                  </div>
                  <div>
                    <div className={`text-[20px] font-bold ${member.duration !== "0s" ? "text-gray-700" : "text-gray-300"}`}>{member.duration}</div>
                    <div className="text-[10px] text-gray-400">Duration</div>
                  </div>
                  <div>
                    <div className={`text-[20px] font-bold ${member.sales > 0 ? "text-green-600" : "text-gray-300"}`}>{member.sales}</div>
                    <div className="text-[10px] text-gray-400">Sales</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Detail */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
          {selected ? (
            <div>
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-full bg-[#E8E2F7] text-[#4f46e5] flex items-center justify-center text-[16px] font-bold mr-4">
                  {selected.initials}
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-800">{selected.name}</div>
                  <div className="text-sm text-gray-400">{selected.role}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-[#4f46e5]">{selected.calls}</div>
                  <div className="text-sm text-gray-500 mt-1">Total Calls</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-gray-700">{selected.duration}</div>
                  <div className="text-sm text-gray-500 mt-1">Call Duration</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-green-600">{selected.sales}</div>
                  <div className="text-sm text-gray-500 mt-1">Sales Closed</div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="text-[14px] font-bold text-gray-700 mb-4">Call Activity</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500">First Call</span>
                    <span className="font-medium text-gray-700">{selected.firstCall}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500">Last Call</span>
                    <span className="font-medium text-gray-700">{selected.lastCall}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500">Avg Duration</span>
                    <span className="font-medium text-gray-700">
                      {selected.calls > 0 ? formatSecs(Math.round(parseDuration(selected.duration) / selected.calls)) : "NA"}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-500">Conversion Rate</span>
                    <span className="font-medium text-gray-700">
                      {selected.calls > 0 ? `${Math.round((selected.sales / selected.calls) * 100)}%` : "0%"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              Select a team member to view details
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
