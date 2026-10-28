"use client";

import React, { useState, useMemo } from "react";
import SiteVisitExecutiveCard from "./SiteVisitExecutiveCard";
import SiteVisitsCalendarView from "./SiteVisitsCalendarView";
import { MapPin, Calendar, CheckCircle2, Clock, Search, LayoutList, CalendarDays } from "lucide-react";

interface SiteVisitsDashboardClientProps {
  scheduledLeads: any[];
  completedLeads: any[];
  requireGps?: boolean;
  userRole?: string;
}

export default function SiteVisitsDashboardClient({
  scheduledLeads = [],
  completedLeads = [],
  requireGps = false,
  userRole = "ADMIN"
}: SiteVisitsDashboardClientProps) {
  const isAdmin = userRole === "ADMIN" || userRole === "ROOT";
  const [viewMode, setViewMode] = useState<"CALENDAR" | "LIST">(isAdmin ? "CALENDAR" : "LIST");
  const [activeTab, setActiveTab] = useState<"SCHEDULED" | "COMPLETED" | "ALL">("SCHEDULED");
  const [searchQuery, setSearchQuery] = useState("");

  const allLeads = useMemo(() => {
    return [...scheduledLeads, ...completedLeads];
  }, [scheduledLeads, completedLeads]);

  const displayedLeads = useMemo(() => {
    let list: any[] = [];
    if (activeTab === "SCHEDULED") list = scheduledLeads;
    else if (activeTab === "COMPLETED") list = completedLeads;
    else list = allLeads;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((lead: any) => {
      const name = (lead.name || "").toLowerCase();
      const phone = (lead.phone || "").toLowerCase();
      const city = (lead.city || "").toLowerCase();
      const loc = (lead.customFields?.siteVisit?.gmapLink || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || city.includes(q) || loc.includes(q);
    });
  }, [activeTab, scheduledLeads, completedLeads, allLeads, searchQuery]);

  return (
    <div className="w-full max-w-full min-h-full bg-gray-50 flex flex-col md:-m-6 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-10 shadow-xs">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mr-3 border border-indigo-100">
            <MapPin className="w-5 h-5 text-[#4f46e5]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
              Site Visits Schedule
            </h1>
            <p className="text-xs text-gray-500">
              Interactive calendar schedule with on-site remarks & client notes
            </p>
          </div>
        </div>

        {/* View Mode Toggle: Calendar vs Cards (Only provided for Admin account) */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setViewMode("CALENDAR")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "CALENDAR"
                    ? "bg-white text-[#4f46e5] shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                Calendar View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("LIST")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "LIST"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                Executive Cards
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      {isAdmin && viewMode === "CALENDAR" ? (
        <div className="flex-1 p-3 sm:p-5 overflow-hidden flex flex-col">
          <SiteVisitsCalendarView
            leads={allLeads}
            userRole={userRole}
            requireGps={requireGps}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col">
          {/* List View Sub-Header (Tabs & Search) */}
          <div className="max-w-3xl mx-auto w-full mb-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("SCHEDULED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "SCHEDULED"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Scheduled ({scheduledLeads.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("COMPLETED")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "COMPLETED"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Previous Visits ({completedLeads.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "ALL"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                All ({allLeads.length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by client or location..."
                className="w-full sm:w-56 pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="max-w-2xl mx-auto w-full space-y-4">
            {displayedLeads.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300 p-6">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h3 className="text-gray-900 font-bold text-sm">
                  {activeTab === "SCHEDULED"
                    ? "No Scheduled Site Visits"
                    : activeTab === "COMPLETED"
                    ? "No Previous Site Visits Found"
                    : "No Site Visits Found"}
                </h3>
                <p className="text-gray-500 text-xs mt-1 max-w-sm mx-auto">
                  {activeTab === "SCHEDULED"
                    ? "When telecallers assign a site visit, it will appear here for field verification."
                    : activeTab === "COMPLETED"
                    ? "Completed site visits with verified client OTPs will appear here for confirmation."
                    : "Try searching with a different client name or keyword."}
                </p>
              </div>
            ) : (
              displayedLeads.map((lead: any) => (
                <SiteVisitExecutiveCard
                  key={lead.id}
                  lead={lead}
                  requireGps={requireGps}
                  overviewMode={false}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

