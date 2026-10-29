"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  FileText,
  Paperclip,
  ExternalLink,
  AlertTriangle,
  User,
  Loader2,
  CalendarDays,
  CheckCircle2
} from "lucide-react";
import { addNote } from "@/app/actions/noteActions";
import { updateSiteVisitDetails } from "@/app/actions/leadActions";

interface SiteVisitsCalendarViewProps {
  leads: any[];
  userRole?: string;
  requireGps?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SiteVisitsCalendarView({
  leads = [],
  userRole = "ADMIN",
  requireGps = false
}: SiteVisitsCalendarViewProps) {
  const router = useRouter();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SCHEDULED" | "RESCHEDULED" | "DONE" | "OVERDUE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarMode, setCalendarMode] = useState<"MONTH" | "WEEK">("MONTH");

  // Selected visit/day detail modal state
  const [selectedVisit, setSelectedVisit] = useState<any | null>(null);
  const [selectedDayVisits, setSelectedDayVisits] = useState<{ dateStr: string; visits: any[] } | null>(null);

  // Previous notes accordion dropdown state
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Reschedule inline state in modal
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("11:00");
  const [isUpdatingVisit, setIsUpdatingVisit] = useState(false);

  // Process and normalize site visit items from leads
  const processedVisits = useMemo(() => {
    const list: any[] = [];
    const now = Date.now();

    leads.forEach((lead) => {
      const sv = lead.customFields?.siteVisit;
      if (!sv) return;

      const type = sv.type || (lead.status === "Site visit done" ? "Done" : "Scheduled");
      const dateStr = sv.date || ""; // YYYY-MM-DD
      const timeStr = sv.time || "11:00";
      const isDone = type === "Done" || !!sv.verifiedAt || (lead.status || "").toLowerCase() === "site visit done";

      let isOverdue = false;
      if (!isDone && dateStr) {
        const visitEnd = new Date(`${dateStr}T23:59:59.999`).getTime();
        if (now > visitEnd) {
          isOverdue = true;
        }
      }

      list.push({
        leadId: lead.id,
        leadName: lead.name,
        leadPhone: lead.phone,
        leadCity: lead.city,
        leadStatus: lead.status,
        assignedTo: lead.assignedTo,
        siteVisit: sv,
        notes: lead.notes || [],
        fileAttachments: lead.fileAttachments || [],
        type,
        date: dateStr,
        time: timeStr,
        isDone,
        isOverdue,
        gmapLink: sv.gmapLink || ""
      });
    });

    return list;
  }, [leads]);

  // Filtered visits based on status and search query
  const filteredVisits = useMemo(() => {
    return processedVisits.filter((item) => {
      // Status filter
      if (statusFilter === "SCHEDULED" && (item.type !== "Scheduled" || item.isDone)) return false;
      if (statusFilter === "RESCHEDULED" && (item.type !== "Rescheduled" || item.isDone)) return false;
      if (statusFilter === "DONE" && !item.isDone) return false;
      if (statusFilter === "OVERDUE" && (!item.isOverdue || item.isDone)) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (item.leadName || "").toLowerCase().includes(q);
        const matchesPhone = (item.leadPhone || "").toLowerCase().includes(q);
        const matchesCity = (item.leadCity || "").toLowerCase().includes(q);
        const matchesNotes = item.notes?.some((n: any) => (n.content || "").toLowerCase().includes(q));
        if (!matchesName && !matchesPhone && !matchesCity && !matchesNotes) return false;
      }

      return true;
    });
  }, [processedVisits, statusFilter, searchQuery]);

  // Map visits by Date String "YYYY-MM-DD"
  const visitsByDate = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredVisits.forEach((visit) => {
      if (!visit.date) return;
      const key = visit.date.trim();
      const existing = map.get(key) || [];
      existing.push(visit);
      map.set(key, existing);
    });
    return map;
  }, [filteredVisits]);

  // Monthly metrics
  const monthStats = useMemo(() => {
    const targetMonthStr = String(currentMonth + 1).padStart(2, "0");
    const targetYearStr = String(currentYear);
    const prefix = `${targetYearStr}-${targetMonthStr}`;

    let totalMonth = 0;
    let scheduledMonth = 0;
    let doneMonth = 0;
    let overdueMonth = 0;

    processedVisits.forEach((v) => {
      if (v.date && v.date.startsWith(prefix)) {
        totalMonth++;
        if (v.isDone) doneMonth++;
        else if (v.isOverdue) overdueMonth++;
        else scheduledMonth++;
      }
    });

    return { totalMonth, scheduledMonth, doneMonth, overdueMonth };
  }, [processedVisits, currentMonth, currentYear]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    const startWeekday = firstDayOfMonth.getDay(); // 0 for Sunday
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const days: Array<{
      date: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const prevDate = new Date(currentYear, currentMonth - 1, dayNum);
      const m = String(prevDate.getMonth() + 1).padStart(2, "0");
      const d = String(dayNum).padStart(2, "0");
      days.push({
        date: prevDate,
        dateStr: `${prevDate.getFullYear()}-${m}-${d}`,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Current month days
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
      const curDate = new Date(currentYear, currentMonth, dayNum);
      const m = String(currentMonth + 1).padStart(2, "0");
      const d = String(dayNum).padStart(2, "0");
      const dateStr = `${currentYear}-${m}-${d}`;
      days.push({
        date: curDate,
        dateStr,
        dayNumber: dayNum,
        isCurrentMonth: true,
        isToday: dateStr === todayStr
      });
    }

    // Next month padding to fill a complete 35 or 42 grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(currentYear, currentMonth + 1, dayNum);
      const m = String(nextDate.getMonth() + 1).padStart(2, "0");
      const d = String(dayNum).padStart(2, "0");
      days.push({
        date: nextDate,
        dateStr: `${nextDate.getFullYear()}-${m}-${d}`,
        dayNumber: dayNum,
        isCurrentMonth: false,
        isToday: false
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Handle marking complete from modal
  const handleMarkComplete = async () => {
    if (!selectedVisit) return;
    if (!confirm(`Mark site visit for ${selectedVisit.leadName} as Completed?`)) return;

    setIsUpdatingVisit(true);
    try {
      await updateSiteVisitDetails(selectedVisit.leadId, {
        ...selectedVisit.siteVisit,
        type: "Done",
        verifiedAt: new Date().toISOString()
      });
      selectedVisit.isDone = true;
      selectedVisit.type = "Done";
      router.refresh();
      alert("Site visit marked as Completed!");
      setSelectedVisit(null);
    } catch (e) {
      console.error(e);
      alert("Failed to mark site visit complete.");
    } finally {
      setIsUpdatingVisit(false);
    }
  };

  // Handle rescheduling from modal
  const handleSaveReschedule = async () => {
    if (!selectedVisit || !rescheduleDate) {
      alert("Please choose a reschedule date.");
      return;
    }

    setIsUpdatingVisit(true);
    try {
      await updateSiteVisitDetails(selectedVisit.leadId, {
        ...selectedVisit.siteVisit,
        type: "Rescheduled",
        date: rescheduleDate,
        time: rescheduleTime || "11:00",
        gmapLink: selectedVisit.gmapLink || ""
      });

      // Also add an audit note
      await addNote(
        selectedVisit.leadId,
        `[SYSTEM: Site Visit Rescheduled] Visit rescheduled to ${rescheduleDate} at ${rescheduleTime || '11:00'}.`
      );

      selectedVisit.date = rescheduleDate;
      selectedVisit.time = rescheduleTime;
      selectedVisit.type = "Rescheduled";
      selectedVisit.isOverdue = false;

      setIsRescheduling(false);
      router.refresh();
      alert("Site visit rescheduled successfully!");
      setSelectedVisit(null);
    } catch (e) {
      console.error(e);
      alert("Failed to reschedule site visit.");
    } finally {
      setIsUpdatingVisit(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-4 sm:p-5 border-b border-gray-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Month Navigation & Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-xl p-1 border border-gray-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-xs text-gray-700 transition-all cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-white hover:shadow-xs rounded-lg transition-all cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-white hover:shadow-xs text-gray-700 transition-all cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#4f46e5]" />
            <span>{MONTH_NAMES[currentMonth]} {currentYear}</span>
          </h2>
        </div>

        {/* Status Filters & Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Buttons */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                statusFilter === "ALL" ? "bg-white text-gray-900 shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("SCHEDULED")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                statusFilter === "SCHEDULED" ? "bg-white text-indigo-700 shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Scheduled
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("DONE")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                statusFilter === "DONE" ? "bg-white text-emerald-700 shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("OVERDUE")}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                statusFilter === "OVERDUE" ? "bg-white text-rose-700 shadow-xs" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Overdue
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client, city, notes..."
              className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white w-48 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Monthly Metrics Summary Bar */}
      <div className="px-5 py-2.5 bg-gray-50/80 border-b border-gray-200 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          <span className="font-semibold text-gray-700">Scheduled:</span>
          <span className="font-black text-indigo-700">{monthStats.scheduledMonth}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="font-semibold text-gray-700">Completed:</span>
          <span className="font-black text-emerald-700">{monthStats.doneMonth}</span>
        </div>
        {monthStats.overdueMonth > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="font-semibold text-gray-700">Pending Outcome:</span>
            <span className="font-black text-rose-700">{monthStats.overdueMonth}</span>
          </div>
        )}
        <div className="ml-auto text-gray-400 text-[11px] font-medium hidden sm:block">
          Click any site visit to view full details and add on-site notes
        </div>
      </div>

      {/* Weekday Column Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/50 text-center font-bold text-xs text-gray-500 uppercase tracking-wider py-2.5">
        {WEEKDAY_NAMES.map((name, idx) => (
          <div key={name} className={idx === 0 || idx === 6 ? "text-gray-400" : ""}>
            {name}
          </div>
        ))}
      </div>

      {/* Calendar Month Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto divide-x divide-y divide-gray-100 min-h-[500px]">
        {calendarDays.map((dayItem, idx) => {
          const visits = visitsByDate.get(dayItem.dateStr) || [];
          const hasVisits = visits.length > 0;

          return (
            <div
              key={idx}
              onClick={() => {
                if (hasVisits) {
                  setSelectedDayVisits({ dateStr: dayItem.dateStr, visits });
                }
              }}
              className={`min-h-[105px] p-1.5 sm:p-2 transition-colors flex flex-col justify-between ${
                dayItem.isCurrentMonth ? "bg-white" : "bg-gray-50/40 text-gray-400"
              } ${dayItem.isToday ? "bg-indigo-50/20" : ""} ${
                hasVisits ? "cursor-pointer hover:bg-indigo-50/40" : ""
              }`}
            >
              {/* Day Header: Number + Visits Count */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                    dayItem.isToday
                      ? "bg-[#4f46e5] text-white shadow-xs"
                      : dayItem.isCurrentMonth
                      ? "text-gray-900"
                      : "text-gray-400"
                  }`}
                >
                  {dayItem.dayNumber}
                </span>

                {hasVisits && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {visits.length} {visits.length === 1 ? "visit" : "visits"}
                  </span>
                )}
              </div>

              {/* Site Visits Chips inside Day Cell */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[85px] pr-0.5">
                {visits.slice(0, 3).map((visit, vIdx) => {
                  let badgeStyle = "bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100";
                  if (visit.isDone) {
                    badgeStyle = "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100";
                  } else if (visit.isOverdue) {
                    badgeStyle = "bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100";
                  } else if (visit.type === "Rescheduled") {
                    badgeStyle = "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100";
                  }

                  return (
                    <button
                      key={vIdx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsNotesOpen(false);
                        setSelectedVisit(visit);
                      }}
                      className={`w-full text-left p-1 sm:p-1.5 rounded-lg border text-[11px] leading-tight transition-all shadow-2xs truncate flex flex-col gap-0.5 cursor-pointer ${badgeStyle}`}
                      title={`${visit.leadName} (${visit.time}) - Click to view notes`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-extrabold truncate">{visit.leadName}</span>
                        <span className="text-[10px] font-mono shrink-0 opacity-80">{visit.time}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] opacity-90 truncate">
                        {visit.gmapLink && visit.gmapLink !== "undefined" && visit.gmapLink.trim() !== "" ? (
                          <a
                            href={visit.gmapLink.startsWith("http") ? visit.gmapLink : `https://${visit.gmapLink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 font-bold text-indigo-700 hover:text-indigo-900 hover:underline truncate max-w-[130px]"
                            title={`Open Scheduled Location Link: ${visit.gmapLink}`}
                          >
                            <span className="shrink-0">📍</span>
                            <span className="truncate underline underline-offset-1">
                              {(() => {
                                try {
                                  const url = new URL(visit.gmapLink.startsWith("http") ? visit.gmapLink : `https://${visit.gmapLink}`);
                                  return url.hostname.replace("www.", "") + (url.pathname.length > 1 ? url.pathname.slice(0, 10) + "..." : "");
                                } catch (e) {
                                  return "Location Link";
                                }
                              })()}
                            </span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-80" />
                          </a>
                        ) : (
                          <span className="text-gray-400 italic truncate text-[10px]">
                            📍 No link
                          </span>
                        )}
                        {visit.notes?.length > 0 && (
                          <span className="shrink-0 flex items-center font-semibold ml-auto">
                            📝 {visit.notes.length}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {visits.length > 3 && (
                  <div className="text-[10px] text-center font-bold text-indigo-600 hover:underline">
                    +{visits.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MODAL: SITE VISIT DETAILS & NOTES ── */}
      {selectedVisit && (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-gray-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-gray-900 text-base sm:text-lg">
                    {selectedVisit.leadName}
                  </h3>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      selectedVisit.isDone
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : selectedVisit.isOverdue
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : selectedVisit.type === "Rescheduled"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    }`}
                  >
                    {selectedVisit.isDone
                      ? "✓ Completed"
                      : selectedVisit.isOverdue
                      ? "⚠️ Overdue"
                      : selectedVisit.type === "Rescheduled"
                      ? "🔄 Rescheduled"
                      : "📅 Scheduled"}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Scheduled for {selectedVisit.date} at {selectedVisit.time}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedVisit(null);
                  setIsRescheduling(false);
                  setIsNotesOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Client & Visit Quick Info Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3 flex flex-col justify-between min-h-[72px]">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Documents Attached</span>
                    <span className="text-[10px] font-semibold text-gray-400">
                      ({selectedVisit.fileAttachments?.length || 0})
                    </span>
                  </div>
                  <div>
                    {selectedVisit.fileAttachments && selectedVisit.fileAttachments.length > 0 ? (
                      <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                        {selectedVisit.fileAttachments.map((file: any) => (
                          <a
                            key={file.id || file.url}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors truncate shadow-2xs group"
                            title={file.name}
                          >
                            <Paperclip className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="truncate flex-1 group-hover:underline">
                              {file.name || "Attached Document"}
                            </span>
                            <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0 ml-1" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic flex items-center gap-1 py-1">
                        <Paperclip className="w-3.5 h-3.5 text-gray-300" />
                        No documents attached
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3 flex flex-col justify-between">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Scheduled Location Link
                  </div>
                  <div className="flex items-center justify-between">
                    {selectedVisit.gmapLink && selectedVisit.gmapLink !== "undefined" && selectedVisit.gmapLink.trim() !== "" ? (
                      <a
                        href={selectedVisit.gmapLink.startsWith("http") ? selectedVisit.gmapLink : `https://${selectedVisit.gmapLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-lg transition-colors truncate max-w-full shadow-2xs"
                        title={selectedVisit.gmapLink}
                      >
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">{selectedVisit.gmapLink}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 ml-1 text-indigo-500" />
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No location link provided during scheduling</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Assigned Staff */}
              <div className="flex items-center justify-between text-xs px-3 py-2 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                <span className="text-indigo-900 font-medium">Assigned Representative:</span>
                <span className="font-bold text-indigo-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  {selectedVisit.assignedTo?.name || "Unassigned"}
                </span>
              </div>

              {/* Reschedule Box if toggled */}
              {isRescheduling && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-amber-600" />
                    Reschedule Site Visit
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">New Date</label>
                      <input
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-gray-300 rounded-lg outline-none focus:border-amber-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">New Time</label>
                      <input
                        type="time"
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-gray-300 rounded-lg outline-none focus:border-amber-500 font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsRescheduling(false)}
                      className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isUpdatingVisit}
                      onClick={handleSaveReschedule}
                      className="px-3.5 py-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1"
                    >
                      {isUpdatingVisit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Reschedule"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── PREVIOUS NOTES DROPDOWN ACCORDION ── */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Site Visit Notes
                  </span>
                  <Link
                    href={`/leads/${selectedVisit.leadId}`}
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center"
                  >
                    Open Lead File <ExternalLink className="w-3 h-3 ml-1" />
                  </Link>
                </div>

                {/* Dropdown Button */}
                <button
                  type="button"
                  onClick={() => setIsNotesOpen(!isNotesOpen)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 transition-all cursor-pointer shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#4f46e5]" />
                    Previous Notes ({selectedVisit.notes?.length || 0})
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                      isNotesOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Collapsible Dropdown Content */}
                {isNotesOpen && (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1 pt-1">
                    {selectedVisit.notes && selectedVisit.notes.length > 0 ? (
                      selectedVisit.notes.map((note: any, nIdx: number) => {
                        const isSystemNote = note.content?.startsWith("[SYSTEM:");
                        return (
                          <div
                            key={nIdx}
                            className={`p-2.5 rounded-xl border text-xs leading-relaxed ${
                              isSystemNote
                                ? "bg-gray-50/70 border-gray-200/80 text-gray-600 font-mono text-[11px]"
                                : "bg-white border-gray-200 text-gray-800"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1 pb-1 border-b border-gray-100/80">
                              <span className="font-bold text-[11px] text-indigo-700">
                                {note.user?.name || "Team Member"}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(note.createdAt).toLocaleDateString()} at{" "}
                                {new Date(note.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                            <div className="whitespace-pre-wrap">{note.content}</div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-xs text-gray-400 italic bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
                        No previous notes recorded for this lead.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3 sm:p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setRescheduleDate(selectedVisit.date || "");
                  setRescheduleTime(selectedVisit.time || "11:00");
                  setIsRescheduling(!isRescheduling);
                }}
                className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reschedule
              </button>

              {!selectedVisit.isDone && (
                <button
                  type="button"
                  disabled={isUpdatingVisit}
                  onClick={handleMarkComplete}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isUpdatingVisit ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Completed
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DAY VISITS SUMMARY (When clicking a day cell with multiple visits) ── */}
      {selectedDayVisits && (
        <div className="fixed inset-0 z-[290] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col border border-gray-200">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-900 text-base">
                  Site Visits on {selectedDayVisits.dateStr}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedDayVisits.visits.length} appointment(s) scheduled for this day
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayVisits(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5">
              {selectedDayVisits.visits.map((visit, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDayVisits(null);
                    setIsNotesOpen(false);
                    setSelectedVisit(visit);
                  }}
                  className="p-3 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer shadow-2xs flex items-center justify-between"
                >
                  <div>
                    <div className="font-black text-sm text-gray-900">{visit.leadName}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span>⏰ {visit.time}</span>
                      {visit.gmapLink && visit.gmapLink !== "undefined" && visit.gmapLink.trim() !== "" ? (
                        <a
                          href={visit.gmapLink.startsWith("http") ? visit.gmapLink : `https://${visit.gmapLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-indigo-600 hover:underline flex items-center gap-1 truncate max-w-[180px]"
                          title={visit.gmapLink}
                        >
                          <span>📍 Location Link</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">📍 No link</span>
                      )}
                      {visit.notes?.length > 0 && <span className="font-semibold text-indigo-600">📝 {visit.notes.length} notes</span>}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      visit.isDone
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : visit.isOverdue
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    }`}
                  >
                    {visit.isDone ? "Done" : visit.isOverdue ? "Overdue" : "Scheduled"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
