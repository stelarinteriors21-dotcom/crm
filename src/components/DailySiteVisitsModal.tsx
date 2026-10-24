"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { 
  X, Calendar, Check, Clock, AlertTriangle, Phone, MapPin, 
  RotateCcw, CheckCircle2, ChevronRight, Loader2, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  completeSiteVisitFromAlert, 
  rescheduleSiteVisitFromAlert, 
  SiteVisitAlertItem 
} from "@/app/actions/siteVisitAlertActions";
import { AlertNotificationManager } from "@/lib/alertNotifier";

export default function DailySiteVisitsModal({ tasks = [] }: { tasks?: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [todayVisits, setTodayVisits] = useState<SiteVisitAlertItem[]>([]);
  const [passedVisits, setPassedVisits] = useState<SiteVisitAlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Per-card interaction state
  const [activeTab, setActiveTab] = useState<"passed" | "today">("passed");
  const [actionState, setActionState] = useState<{
    [leadId: string]: {
      mode?: "complete" | "reschedule";
      loading?: boolean;
      notes?: string;
      rescheduleDate?: string;
      rescheduleTime?: string;
    };
  }>({});

  const router = useRouter();
  const hasLoadedRef = useRef(false);

  // Tomorrow string for rescheduling default
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultRescheduleDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  const fetchAlerts = useCallback(async (isIntervalTrigger = false) => {
    try {
      const res = await fetch("/api/site-visits/alerts", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const passed: SiteVisitAlertItem[] = data.passedVisits || [];
        const today: SiteVisitAlertItem[] = data.todayVisits || [];

        setTodayVisits(today);
        setPassedVisits(passed);

        // Determine if modal should open:
        // 1. If passed visits exist: ALWAYS open on load and re-open every 20m until resolved!
        // 2. If only today visits exist: open once on app launch
        if (passed.length > 0) {
          setActiveTab("passed");
          setIsOpen(true);

          AlertNotificationManager.dispatchEqualAlert({
            title: "⚠️ PENDING SITE VISIT OUTCOME",
            body: `${passed.length} site visit(s) from past dates require completion or rescheduling confirmation.`,
            tag: "passed_site_visits_reminder",
            titleFlashText: "SITE VISIT PENDING OUTCOME"
          });
        } else if (today.length > 0 && !isIntervalTrigger) {
          const todayStr = new Date().toDateString();
          const hasShownToday = sessionStorage.getItem("daily_today_visits_shown_" + todayStr);
          if (!hasShownToday) {
            setActiveTab("today");
            setIsOpen(true);
            sessionStorage.setItem("daily_today_visits_shown_" + todayStr, "true");
            
            AlertNotificationManager.dispatchEqualAlert({
              title: "📅 TODAY'S SITE VISITS",
              body: `You have ${today.length} site visit(s) scheduled for today.`,
              tag: "today_site_visits_greeting",
              titleFlashText: "TODAY'S SITE VISITS"
            });
          }
        }
      }
    } catch (e) {
      console.warn("Failed to fetch site visit alerts:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Initial check when caller opens the CRM
  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      fetchAlerts(false);
    }
  }, [fetchAlerts]);

  // 2. Every 20 minutes check: "they should be asked every 20 mins until they mark the site visit as completed or the site visit is rescheduled"
  useEffect(() => {
    const TWENTY_MINUTES_MS = 20 * 60 * 1000;
    const interval = setInterval(() => {
      fetchAlerts(true);
    }, TWENTY_MINUTES_MS);

    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleClose = () => {
    setIsOpen(false);
    AlertNotificationManager.dismissEqualAlert();
  };

  const handleSetMode = (leadId: string, mode: "complete" | "reschedule" | undefined) => {
    setActionState(prev => ({
      ...prev,
      [leadId]: {
        ...prev[leadId],
        mode,
        rescheduleDate: prev[leadId]?.rescheduleDate || defaultRescheduleDate,
        rescheduleTime: prev[leadId]?.rescheduleTime || "11:00",
        notes: prev[leadId]?.notes || ""
      }
    }));
  };

  const handleCompleteSubmit = async (item: SiteVisitAlertItem) => {
    const state = actionState[item.leadId] || {};
    const notes = state.notes || "Site visit completed successfully.";

    setActionState(prev => ({
      ...prev,
      [item.leadId]: { ...prev[item.leadId], loading: true }
    }));

    try {
      await completeSiteVisitFromAlert(item.leadId, notes);
      // Remove from passedVisits list
      setPassedVisits(prev => prev.filter(v => v.leadId !== item.leadId));
      setTodayVisits(prev => prev.filter(v => v.leadId !== item.leadId));
      router.refresh();

      if (passedVisits.length <= 1 && todayVisits.length === 0) {
        handleClose();
      }
    } catch (err: any) {
      alert("Failed to complete site visit: " + (err.message || "Unknown error"));
      setActionState(prev => ({
        ...prev,
        [item.leadId]: { ...prev[item.leadId], loading: false }
      }));
    }
  };

  const handleRescheduleSubmit = async (item: SiteVisitAlertItem) => {
    const state = actionState[item.leadId] || {};
    const newDate = state.rescheduleDate || defaultRescheduleDate;
    const newTime = state.rescheduleTime || "11:00";
    const notes = state.notes || `Rescheduled from ${item.scheduledDate}`;

    if (!newDate) {
      alert("Please select a new date for the site visit.");
      return;
    }

    setActionState(prev => ({
      ...prev,
      [item.leadId]: { ...prev[item.leadId], loading: true }
    }));

    try {
      await rescheduleSiteVisitFromAlert(item.leadId, newDate, newTime, notes);
      // Remove from passedVisits list
      setPassedVisits(prev => prev.filter(v => v.leadId !== item.leadId));
      router.refresh();

      if (passedVisits.length <= 1 && todayVisits.length === 0) {
        handleClose();
      }
    } catch (err: any) {
      alert("Failed to reschedule site visit: " + (err.message || "Unknown error"));
      setActionState(prev => ({
        ...prev,
        [item.leadId]: { ...prev[item.leadId], loading: false }
      }));
    }
  };

  if (!isOpen || (passedVisits.length === 0 && todayVisits.length === 0)) {
    return null;
  }

  const currentTabVisits = activeTab === "passed" ? passedVisits : todayVisits;

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
        
        {/* Header with tabs */}
        <div className={`p-4 text-white flex flex-col gap-2 shrink-0 ${
          passedVisits.length > 0 
            ? "bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700" 
            : "bg-gradient-to-r from-purple-600 to-[#4f46e5]"
        }`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              {passedVisits.length > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-200 animate-pulse" />
              ) : (
                <Calendar className="w-5 h-5 text-purple-200" />
              )}
              <h2 className="font-bold text-base sm:text-lg">
                {passedVisits.length > 0 ? "Site Visit Outcome Verification" : "Today's Site Visits"}
              </h2>
            </div>
            <button 
              type="button"
              onClick={handleClose} 
              className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Pill Tabs */}
          {(passedVisits.length > 0 && todayVisits.length > 0) && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab("passed")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "passed" 
                    ? "bg-white text-rose-700 shadow-xs" 
                    : "bg-white/20 hover:bg-white/30 text-white"
                }`}
              >
                ⚠️ Date Passed ({passedVisits.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("today")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === "today" 
                    ? "bg-white text-[#4f46e5] shadow-xs" 
                    : "bg-white/20 hover:bg-white/30 text-white"
                }`}
              >
                📅 Today ({todayVisits.length})
              </button>
            </div>
          )}
        </div>

        {/* Informative Sub-banner */}
        {passedVisits.length > 0 && activeTab === "passed" && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2 text-xs text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Action Required: </span>
              The scheduled date for the visit(s) below has passed. Please confirm if the visit was completed or reschedule.
              <span className="text-[11px] text-amber-700 block mt-0.5 font-medium">
                (You will be reminded every 20 minutes until completed or rescheduled.)
              </span>
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="p-3.5 sm:p-5 max-h-[62vh] flex-1 overflow-y-auto bg-gray-50/70 space-y-3.5">
          {currentTabVisits.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No site visits in this category.
            </div>
          ) : (
            currentTabVisits.map((item) => {
              const state = actionState[item.leadId] || {};
              const isActionOpen = Boolean(state.mode);

              return (
                <div 
                  key={item.leadId} 
                  className={`bg-white border rounded-xl p-4 shadow-xs transition-all ${
                    item.isPassed ? "border-amber-200 hover:border-amber-300" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* Lead Info Header */}
                  <div className="flex justify-between items-start gap-2 pb-2.5 border-b border-gray-100">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-sm">{item.leadName}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.isPassed ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}>
                          {item.isToday ? "Scheduled Today" : `${item.daysPassed} day${item.daysPassed > 1 ? "s" : ""} overdue`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                        {item.phone && (
                          <span className="flex items-center font-mono text-gray-700">
                            <Phone className="w-3 h-3 mr-1 text-gray-400" />
                            {item.phone}
                          </span>
                        )}
                        {item.city && (
                          <span className="flex items-center text-gray-600">
                            <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                            {item.city}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-gray-800 block">
                        {item.scheduledDate}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        {item.scheduledTime}
                      </span>
                    </div>
                  </div>

                  {/* Question & Actions */}
                  {!isActionOpen ? (
                    <div className="pt-3">
                      <p className="text-xs font-bold text-gray-800 mb-2.5">
                        {item.isPassed 
                          ? "Was this site visit completed?" 
                          : "Site visit scheduled for today. Quick actions:"}
                      </p>
                      
                      <div className="flex items-center gap-2 flex-wrap justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleSetMode(item.leadId, "complete")}
                            className="inline-flex items-center text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5 mr-1.5" />
                            Mark as Completed
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleSetMode(item.leadId, "reschedule")}
                            className="inline-flex items-center text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer active:scale-95"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                            Reschedule Visit
                          </button>
                        </div>

                        <Link
                          href={`/leads/${item.leadId}`}
                          onClick={handleClose}
                          className="text-xs font-semibold text-[#4f46e5] hover:underline flex items-center"
                        >
                          View Lead <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </Link>
                      </div>
                    </div>
                  ) : state.mode === "complete" ? (
                    /* Inline Complete Form */
                    <div className="pt-3 space-y-2 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-emerald-900 flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                          Confirm Site Visit Completion
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSetMode(item.leadId, undefined)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Enter visit outcome or notes (optional)..."
                        value={state.notes || ""}
                        onChange={(e) => setActionState(prev => ({
                          ...prev,
                          [item.leadId]: { ...prev[item.leadId], notes: e.target.value }
                        }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-emerald-500"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSetMode(item.leadId, undefined)}
                          className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCompleteSubmit(item)}
                          disabled={state.loading}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {state.loading ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving...</>
                          ) : (
                            "Confirm & Save Completed"
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Inline Reschedule Form */
                    <div className="pt-3 space-y-2.5 bg-amber-50/60 p-3 rounded-lg border border-amber-200 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-900 flex items-center">
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                          Reschedule Site Visit
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSetMode(item.leadId, undefined)}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">New Visit Date</label>
                          <input
                            type="date"
                            value={state.rescheduleDate || defaultRescheduleDate}
                            onChange={(e) => setActionState(prev => ({
                              ...prev,
                              [item.leadId]: { ...prev[item.leadId], rescheduleDate: e.target.value }
                            }))}
                            className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-600 block mb-0.5">New Visit Time</label>
                          <input
                            type="time"
                            value={state.rescheduleTime || "11:00"}
                            onChange={(e) => setActionState(prev => ({
                              ...prev,
                              [item.leadId]: { ...prev[item.leadId], rescheduleTime: e.target.value }
                            }))}
                            className="w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Reason for rescheduling (e.g. client requested weekend)..."
                        value={state.notes || ""}
                        onChange={(e) => setActionState(prev => ({
                          ...prev,
                          [item.leadId]: { ...prev[item.leadId], notes: e.target.value }
                        }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-amber-500"
                      />

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSetMode(item.leadId, undefined)}
                          className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRescheduleSubmit(item)}
                          disabled={state.loading}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          {state.loading ? (
                            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving...</>
                          ) : (
                            "Confirm & Save New Date"
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-100 bg-white flex justify-between items-center shrink-0">
          <div className="text-[11px] text-gray-400">
            {passedVisits.length > 0 ? (
              <span className="text-amber-600 font-medium">
                • {passedVisits.length} pending outcome verification
              </span>
            ) : (
              <span>All past site visits up to date</span>
            )}
          </div>
          <button 
            type="button"
            onClick={handleClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            {passedVisits.length > 0 ? "Remind Me in 20m" : "Acknowledge"}
          </button>
        </div>

      </div>
    </div>
  );
}
