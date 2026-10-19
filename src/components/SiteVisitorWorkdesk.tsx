"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  MapPin, Phone, Calendar, Clock, KeyRound, CheckCircle2, User, 
  ExternalLink, RefreshCw, ClipboardCheck, Home, Ruler, Camera, 
  Search, AlertCircle, ArrowUpRight, MessageCircle, Check, ChevronRight,
  History, ChevronDown, ChevronUp, X, Eye, Image as ImageIcon
} from "lucide-react";
import SiteVisitChecklistModal from "./SiteVisitChecklistModal";
import { updateSiteVisitDetails } from "@/app/actions/leadActions";
import { formatDeterministicDate, formatDeterministicDateTime } from "@/lib/dateUtils";

interface SiteVisitorWorkdeskProps {
  allLeads: any[];
  userId: string;
  userName?: string;
}

export default function SiteVisitorWorkdesk({
  allLeads = [],
  userId,
  userName = "Field Executive"
}: SiteVisitorWorkdeskProps) {
  const [activeTab, setActiveTab] = useState<"TODAY" | "UPCOMING" | "COMPLETED" | "ALL">("TODAY");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeadForChecklist, setSelectedLeadForChecklist] = useState<any | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  // Today in Asia/Kolkata (YYYY-MM-DD)
  const todayStr = useMemo(() => {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  }, []);

  // Filter leads that have site visit info
  const siteVisitLeads = useMemo(() => {
    return allLeads.filter((lead: any) => {
      const sv = lead.customFields?.siteVisit;
      const status = (lead.status || "").toLowerCase();
      return (
        (sv && (sv.type === "Scheduled" || sv.type === "Rescheduled" || sv.type === "Done" || sv.verifiedAt || sv.date)) ||
        status.includes("site visit")
      );
    });
  }, [allLeads]);

  // Categorize visits
  const { todayVisits, upcomingVisits, completedVisits, allSortedVisits } = useMemo(() => {
    const today: any[] = [];
    const upcoming: any[] = [];
    const completed: any[] = [];

    siteVisitLeads.forEach((lead: any) => {
      const sv = lead.customFields?.siteVisit || {};
      const isDone = sv.type === "Done" || !!sv.verifiedAt || (lead.status || "").toLowerCase() === "site visit done";
      const visitDate = sv.date || "";

      if (isDone) {
        completed.push(lead);
      } else if (visitDate === todayStr) {
        today.push(lead);
      } else if (visitDate > todayStr) {
        upcoming.push(lead);
      } else {
        // Scheduled in the past but not completed yet -> Treat as priority Today/Overdue!
        today.push(lead);
      }
    });

    // Sorter: chronological
    const sortByDateTime = (a: any, b: any) => {
      const svA = a.customFields?.siteVisit || {};
      const svB = b.customFields?.siteVisit || {};
      const dateA = new Date(`${svA.date || "1970-01-01"}T${svA.time || "00:00"}`).getTime();
      const dateB = new Date(`${svB.date || "1970-01-01"}T${svB.time || "00:00"}`).getTime();
      return dateA - dateB;
    };

    today.sort(sortByDateTime);
    upcoming.sort(sortByDateTime);
    completed.sort((a: any, b: any) => {
      const timeA = new Date(a.customFields?.siteVisit?.verifiedAt || a.updatedAt).getTime();
      const timeB = new Date(b.customFields?.siteVisit?.verifiedAt || b.updatedAt).getTime();
      return timeB - timeA;
    });

    const all = [...today, ...upcoming, ...completed];

    return {
      todayVisits: today,
      upcomingVisits: upcoming,
      completedVisits: completed,
      allSortedVisits: all
    };
  }, [siteVisitLeads, todayStr]);

  // Filter current tab visits by search query
  const displayedVisits = useMemo(() => {
    let list: any[] = [];
    if (activeTab === "TODAY") list = todayVisits;
    else if (activeTab === "UPCOMING") list = upcomingVisits;
    else if (activeTab === "COMPLETED") list = completedVisits;
    else list = allSortedVisits;

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((lead: any) => {
      const name = (lead.name || "").toLowerCase();
      const phone = (lead.phone || "").toLowerCase();
      const city = (lead.city || "").toLowerCase();
      const loc = (lead.customFields?.siteVisit?.gmapLink || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || city.includes(q) || loc.includes(q);
    });
  }, [activeTab, todayVisits, upcomingVisits, completedVisits, allSortedVisits, searchQuery]);

  const handleResendOtp = async (lead: any) => {
    setResendingId(lead.id);
    const sv = lead.customFields?.siteVisit || {};
    try {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await updateSiteVisitDetails(lead.id, {
        ...sv,
        otp: newOtp
      });

      if (lead.phone) {
        const cleanPhone = String(lead.phone).replace(/[^0-9]/g, "");
        const msg = `Hi ${lead.name},\nYour Site Visit OTP is: *${newOtp}*.\nPlease share this with our executive at the site.`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
      } else {
        alert(`New OTP generated: ${newOtp}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate OTP.");
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Workdesk Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-7 text-white shadow-lg border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-400/30 mb-2">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>Field Executive Workdesk</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Welcome, {userName}!
            </h1>
            <p className="text-xs sm:text-sm text-indigo-200/80 mt-1 max-w-xl">
              Track your scheduled in-person visits, navigate to client locations, and verify client OTPs with the completion checklist.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3 shrink-0 backdrop-blur-xs">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <div>
              <div className="text-[10px] uppercase font-bold text-indigo-300">Today</div>
              <div className="text-xs font-bold text-white">
                {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </div>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mt-6 pt-5 border-t border-white/10">
          <button 
            type="button"
            onClick={() => setActiveTab("TODAY")}
            className={`text-left p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === "TODAY" 
                ? "bg-indigo-600/40 border-indigo-400 shadow-inner" 
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            <div className="text-2xl sm:text-3xl font-black text-white">{todayVisits.length}</div>
            <div className="text-[10px] sm:text-xs text-indigo-200 font-semibold mt-0.5 flex items-center justify-between">
              <span>Today's Visits</span>
              {todayVisits.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab("UPCOMING")}
            className={`text-left p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === "UPCOMING" 
                ? "bg-indigo-600/40 border-indigo-400 shadow-inner" 
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            <div className="text-2xl sm:text-3xl font-black text-indigo-200">{upcomingVisits.length}</div>
            <div className="text-[10px] sm:text-xs text-indigo-200 font-semibold mt-0.5">
              Upcoming Visits
            </div>
          </button>

          <button 
            type="button"
            onClick={() => setActiveTab("COMPLETED")}
            className={`text-left p-3 sm:p-4 rounded-xl border transition-all cursor-pointer ${
              activeTab === "COMPLETED" 
                ? "bg-indigo-600/40 border-indigo-400 shadow-inner" 
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            <div className="text-2xl sm:text-3xl font-black text-emerald-300">{completedVisits.length}</div>
            <div className="text-[10px] sm:text-xs text-emerald-200/80 font-semibold mt-0.5">
              Completed Visits
            </div>
          </button>
        </div>
      </div>

      {/* Tabs & Search Row */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          <button
            type="button"
            onClick={() => setActiveTab("TODAY")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "TODAY"
                ? "bg-[#4f46e5] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Today ({todayVisits.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("UPCOMING")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "UPCOMING"
                ? "bg-[#4f46e5] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Upcoming ({upcomingVisits.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("COMPLETED")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "COMPLETED"
                ? "bg-[#4f46e5] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Completed ({completedVisits.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === "ALL"
                ? "bg-[#4f46e5] text-white shadow-xs"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All ({allSortedVisits.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search visit by name, phone..."
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Visits List */}
      <div className="space-y-4">
        {displayedVisits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 sm:p-12 text-center">
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 text-[#4f46e5]">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">No Site Visits Found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {activeTab === "TODAY"
                ? "You have no site visits scheduled for today. Check upcoming visits or relax!"
                : activeTab === "UPCOMING"
                ? "No upcoming site visits scheduled in the future."
                : activeTab === "COMPLETED"
                ? "No completed site visits recorded yet."
                : "No site visit records found matching your search."}
            </p>
          </div>
        ) : (
          displayedVisits.map((lead: any) => {
            const sv = lead.customFields?.siteVisit || {};
            const isDone = sv.type === "Done" || !!sv.verifiedAt || (lead.status || "").toLowerCase() === "site visit done";
            const isToday = sv.date === todayStr;
            const initials = (lead.name || "??").split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();

            return (
              <div
                key={lead.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-xs hover:border-indigo-200 transition-all overflow-hidden flex flex-col"
              >
                {/* Card Header */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-indigo-50 text-[#4f46e5] font-black flex items-center justify-center text-sm shrink-0 border border-indigo-100">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-bold text-gray-900 text-sm sm:text-base hover:text-[#4f46e5] truncate transition-colors"
                        >
                          {lead.name}
                        </Link>
                        {isToday && !isDone && (
                          <span className="bg-red-100 text-red-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-red-200">
                            Today
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2.5 mt-1 text-xs text-gray-500">
                        {lead.city && <span>📍 {lead.city}</span>}
                        {lead.assignedTo?.name && <span>👤 Sales: {lead.assignedTo.name}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0 flex items-center gap-2">
                    {isDone ? (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                        Completed & Verified
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-3 py-1 rounded-full flex items-center shadow-2xs">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                        {sv.type || "Scheduled"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body: Date, Time & Location */}
                <div className="p-4 sm:p-5 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-gray-100 text-xs">
                  {/* Date & Time */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center">
                      <Calendar className="w-3 h-3 mr-1 text-gray-400" /> Scheduled Date & Time
                    </span>
                    <span className="font-bold text-gray-800 text-sm">
                      {sv.date ? sv.date : "Not specified"}
                      {sv.time ? ` at ${sv.time}` : ""}
                    </span>
                  </div>

                  {/* Client Contact */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center">
                      <Phone className="w-3 h-3 mr-1 text-gray-400" /> Client Phone
                    </span>
                    {lead.phone ? (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${lead.phone}`}
                          className="font-bold text-indigo-600 hover:underline flex items-center text-sm"
                        >
                          {lead.phone}
                        </a>
                        <a
                          href={`https://wa.me/${String(lead.phone).replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded-md text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                          title="Chat on WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ) : (
                      <span className="text-gray-400">No phone</span>
                    )}
                  </div>

                  {/* Location & Map Link */}
                  <div className="flex flex-col sm:col-span-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center">
                      <MapPin className="w-3 h-3 mr-1 text-orange-500" /> Site Location
                    </span>
                    {sv.gmapLink ? (
                      <a
                        href={sv.gmapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-bold hover:underline truncate"
                      >
                        <span className="truncate">Open in Google Maps</span>
                        <ArrowUpRight className="w-3.5 h-3.5 ml-1 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-gray-400">No location link provided</span>
                    )}
                  </div>
                </div>

                {/* Site Visit Confirmation Section (For Completed / Previous Site Visits) */}
                {isDone && (
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-emerald-50/70 via-white to-indigo-50/40 border-b border-gray-100 space-y-4">
                    {/* Header Banner */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-100/80">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <CheckCircle2 className="w-4.5 h-4.5" />
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                            <span>Site Visit Confirmed & Verified</span>
                            {sv.verifiedOtp && (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded border border-emerald-200">
                                OTP: {sv.verifiedOtp}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-emerald-700/80">
                            Verified on {formatDeterministicDateTime(sv.verifiedAt || lead.updatedAt)}
                          </div>
                        </div>
                      </div>

                      {/* History Trigger if there are previous visits logged */}
                      {lead.customFields?.siteVisitHistory && lead.customFields.siteVisitHistory.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedHistoryId(expandedHistoryId === lead.id ? null : lead.id)}
                          className="inline-flex items-center text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-colors cursor-pointer self-start sm:self-auto"
                        >
                          <History className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                          <span>Visit History ({lead.customFields.siteVisitHistory.length})</span>
                          {expandedHistoryId === lead.id ? (
                            <ChevronUp className="w-3 h-3 ml-1" />
                          ) : (
                            <ChevronDown className="w-3 h-3 ml-1" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Checklist Confirmed Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Rooms to Renovate */}
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center mb-1">
                          <Home className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Rooms to Renovate
                        </span>
                        <span className="font-bold text-gray-800 text-sm">
                          {sv.roomsToRenovate || "Standard Renovation"}
                        </span>
                      </div>

                      {/* Next Meeting Date */}
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center mb-1">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Next Meeting Date
                        </span>
                        <span className="font-bold text-gray-800 text-sm">
                          {sv.nextMeetingDate ? formatDeterministicDateTime(sv.nextMeetingDate) : "Not scheduled yet"}
                        </span>
                      </div>

                      {/* Measurements & Site Specifications */}
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs sm:col-span-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center mb-1.5">
                          <Ruler className="w-3.5 h-3.5 mr-1 text-purple-600" /> Measurements & Site Specifications
                        </span>
                        <div className="text-gray-800 font-medium whitespace-pre-wrap text-xs bg-gray-50/70 p-3 rounded-lg border border-gray-100 max-h-36 overflow-y-auto">
                          {sv.measurements || "No measurements recorded during this visit."}
                        </div>
                      </div>

                      {/* Site Photos Gallery */}
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-2xs sm:col-span-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center">
                            <Camera className="w-3.5 h-3.5 mr-1 text-pink-600" /> Site Photos Captured ({sv.photos?.length || 0})
                          </span>
                          {sv.photos && sv.photos.length > 0 && (
                            <span className="text-[10px] text-gray-500 font-medium">
                              Click any photo to view full size
                            </span>
                          )}
                        </div>
                        {sv.photos && sv.photos.length > 0 ? (
                          <div className="flex flex-wrap gap-2.5">
                            {sv.photos.map((photoUrl: string, pIdx: number) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => setPreviewPhoto(photoUrl)}
                                className="relative group w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-gray-200 shadow-2xs hover:border-indigo-500 hover:shadow-md transition-all cursor-pointer"
                              >
                                <img
                                  src={photoUrl}
                                  alt={`Site photo ${pIdx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="w-4 h-4 text-white drop-shadow" />
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs italic bg-gray-50/70 p-2.5 rounded-lg border border-gray-100 text-center">
                            No photos attached for this site visit.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Previous Site Visit History Timeline */}
                    {expandedHistoryId === lead.id && lead.customFields?.siteVisitHistory && (
                      <div className="pt-3 border-t border-gray-200 space-y-2 animate-in fade-in duration-150">
                        <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center">
                          <History className="w-3.5 h-3.5 mr-1 text-[#4f46e5]" /> Previous Site Visit Records & Confirmation Log
                        </div>
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {lead.customFields.siteVisitHistory.map((h: any, hIdx: number) => (
                            <div key={hIdx} className="bg-white p-3 rounded-xl border border-gray-200 text-xs shadow-2xs space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    h.type === "Done" 
                                      ? "bg-emerald-100 text-emerald-800" 
                                      : h.type === "Rescheduled" 
                                      ? "bg-amber-100 text-amber-800" 
                                      : "bg-indigo-100 text-indigo-800"
                                  }`}>
                                    {h.type || "Visit Entry"}
                                  </span>
                                  {h.verifiedOtp && (
                                    <span className="text-[10px] text-emerald-700 font-bold">
                                      ✓ OTP: {h.verifiedOtp}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-400">
                                  {formatDeterministicDateTime(h.timestamp)}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-gray-600">
                                {(h.date || h.time) && (
                                  <div>
                                    <span className="text-gray-400">Scheduled:</span> {h.date} {h.time ? `at ${h.time}` : ""}
                                  </div>
                                )}
                                {h.roomsToRenovate && (
                                  <div>
                                    <span className="text-gray-400">Rooms:</span> {h.roomsToRenovate}
                                  </div>
                                )}
                                {h.nextMeetingDate && (
                                  <div>
                                    <span className="text-gray-400">Next Meeting:</span> {formatDeterministicDateTime(h.nextMeetingDate)}
                                  </div>
                                )}
                                {h.photos && h.photos.length > 0 && (
                                  <div>
                                    <span className="text-gray-400">Photos:</span> {h.photos.length} captured
                                  </div>
                                )}
                              </div>

                              {h.measurements && (
                                <div className="text-[11px] bg-gray-50 p-2 rounded border border-gray-100 text-gray-700 whitespace-pre-wrap">
                                  <span className="font-bold text-gray-500">Measurements:</span> {h.measurements}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Card Footer: Actions & Status */}
                <div className="p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {isDone ? (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Checklist confirmed and logged to client profile</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 flex items-center">
                        <KeyRound className="w-3.5 h-3.5 text-indigo-500 mr-1" />
                        {sv.otp ? `OTP generated (${sv.otp})` : "Awaiting OTP"}
                      </span>
                      {sv.otp && (
                        <button
                          type="button"
                          onClick={() => handleResendOtp(lead)}
                          disabled={resendingId === lead.id}
                          className="text-[11px] text-indigo-600 hover:underline flex items-center font-medium cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 mr-1 ${resendingId === lead.id ? "animate-spin" : ""}`} />
                          Resend to WhatsApp
                        </button>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="px-3.5 py-2 rounded-xl border border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50 text-xs font-semibold transition-colors flex items-center"
                    >
                      View Details
                    </Link>

                    {isDone ? (
                      <button
                        type="button"
                        onClick={() => setSelectedLeadForChecklist(lead)}
                        className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold transition-colors flex items-center cursor-pointer shadow-2xs"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5 mr-1.5 text-gray-700" />
                        Update Checklist
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedLeadForChecklist(lead)}
                        className="px-4 py-2 rounded-xl bg-[#4f46e5] hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center cursor-pointer"
                      >
                        <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
                        Verify OTP & Complete Checklist
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Checklist Modal */}
      {selectedLeadForChecklist && (
        <SiteVisitChecklistModal
          isOpen={!!selectedLeadForChecklist}
          onClose={() => setSelectedLeadForChecklist(null)}
          lead={selectedLeadForChecklist}
          onSuccess={() => {
            setSelectedLeadForChecklist(null);
          }}
        />
      )}

      {/* Photo Lightbox Modal */}
      {previewPhoto && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-transparent flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-10 right-0 p-1.5 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewPhoto}
              alt="Site Visit Photo"
              className="max-h-[85vh] w-auto max-w-full rounded-2xl shadow-2xl object-contain border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
