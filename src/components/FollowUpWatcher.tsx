"use client";

import { useEffect, useState, useRef } from "react";
import { getDueFollowUps } from "@/app/actions/followUpActions";
import { 
  Phone, Clock, AlertCircle, MessageCircle, ExternalLink, 
  ChevronDown, ChevronUp, ListTodo, User, X, Sparkles, CheckCircle2 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { triggerSmartCall } from "@/components/SmartCallManager";

import { AlertNotificationManager } from "@/lib/alertNotifier";

export default function FollowUpWatcher() {
  const [manualLeads, setManualLeads] = useState<any[]>([]);
  const [taskLeads, setTaskLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"MANUAL" | "TASKS">("MANUAL");
  const [isTaskExpanded, setIsTaskExpanded] = useState(false);
  const [isManualExpanded, setIsManualExpanded] = useState(false);
  const [flashing, setFlashing] = useState(false);
  const router = useRouter();

  const SNOOZE_KEY = "telecrm_followup_snooze_until";

  // Listen for scheduled follow-ups across the app to immediately dismiss them from this popup
  useEffect(() => {
    const handleScheduled = (e: any) => {
      const scheduledLeadId = e.detail?.leadId;
      if (scheduledLeadId) {
        setManualLeads(prev => {
          const next = prev.filter(l => l.id !== scheduledLeadId);
          if (next.length === 0 && taskLeads.length === 0) AlertNotificationManager.dismissEqualAlert();
          return next;
        });
        setTaskLeads(prev => {
          const next = prev.filter(l => l.id !== scheduledLeadId);
          if (manualLeads.length === 0 && next.length === 0) AlertNotificationManager.dismissEqualAlert();
          return next;
        });
      }
    };
    window.addEventListener("followup_scheduled", handleScheduled);
    return () => window.removeEventListener("followup_scheduled", handleScheduled);
  }, [manualLeads.length, taskLeads.length]);

  useEffect(() => {
    const check = async () => {
      try {
        if (typeof window !== "undefined") {
          const snoozedUntil = Number(sessionStorage.getItem(SNOOZE_KEY) || 0);
          if (Date.now() < snoozedUntil) {
            return;
          }
        }

        const res = await getDueFollowUps();
        const mLeads = (res as any).manualLeads || [];
        const tLeads = (res as any).taskLeads || [];
        setManualLeads(mLeads);
        setTaskLeads(tLeads);

        // Default active tab to MANUAL if manual leads exist, else TASKS
        if (mLeads.length > 0) {
          setActiveTab("MANUAL");
        } else if (tLeads.length > 0) {
          setActiveTab("TASKS");
        }

        // Expand behavior: auto-expand if < 6, retract if >= 6
        setIsTaskExpanded(tLeads.length < 6);
        setIsManualExpanded(mLeads.length < 6);
      } catch (err) {
        console.error("FollowUpWatcher check error:", err);
      }
    };
    
    check();
    const interval = setInterval(check, 45000); // Check every 45 seconds
    return () => clearInterval(interval);
  }, []);

  const totalDue = manualLeads.length + taskLeads.length;

  useEffect(() => {
    if (totalDue === 0) {
      AlertNotificationManager.dismissEqualAlert();
      return;
    }

    const isManual = (activeTab === "MANUAL" && manualLeads.length > 0) || taskLeads.length === 0;
    const title = isManual 
      ? (manualLeads.length >= 6 ? "🔔 SCHEDULED FOLLOW-UP TASKS!" : "🔔 SCHEDULED CALL DUE!")
      : "📋 FOLLOW-UP TASKS DUE!";
    const body = isManual
      ? (manualLeads[0] ? `Follow-up with ${manualLeads[0].name} (${manualLeads[0].phone || ''})` : `You have ${manualLeads.length} follow-up(s) due now.`)
      : `You have ${taskLeads.length} follow-up task(s) due now.`;
    const tag = "followup_due_alert";
    const titleFlashText = isManual ? "FOLLOW-UP DUE!" : "TASKS DUE!";

    // Trigger initial notification burst immediately
    AlertNotificationManager.dispatchEqualAlert({ title, body, tag, titleFlashText });

    const flashTimer = setInterval(() => {
      setFlashing(f => !f);
      AlertNotificationManager.dispatchEqualAlert({ title, body, tag, titleFlashText });
    }, 4500);

    return () => {
      clearInterval(flashTimer);
      AlertNotificationManager.dismissEqualAlert();
    };
  }, [totalDue, activeTab, manualLeads, taskLeads]);

  const handleDismissAll = (minutes: number = 5) => {
    AlertNotificationManager.dismissEqualAlert();
    if (typeof window !== "undefined") {
      sessionStorage.setItem(SNOOZE_KEY, (Date.now() + minutes * 60 * 1000).toString());
    }
    setManualLeads([]);
    setTaskLeads([]);
  };

  const handleDismissManualLead = (leadId: string) => {
    setManualLeads(prev => {
      const next = prev.filter(l => l.id !== leadId);
      if (next.length === 0 && taskLeads.length === 0) {
        AlertNotificationManager.dismissEqualAlert();
      }
      return next;
    });
  };

  const handleDismissTaskLead = (leadId: string) => {
    setTaskLeads(prev => {
      const next = prev.filter(l => l.id !== leadId);
      if (manualLeads.length === 0 && next.length === 0) {
        AlertNotificationManager.dismissEqualAlert();
      }
      return next;
    });
  };

  if (totalDue === 0) return null;

  const currentTab = (activeTab === "MANUAL" && manualLeads.length > 0) 
    ? "MANUAL" 
    : (taskLeads.length > 0 ? "TASKS" : "MANUAL");

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 md:p-6 transition-colors duration-300 ${flashing ? (currentTab === "MANUAL" ? "bg-indigo-600/60" : "bg-emerald-600/60") : "bg-black/50 backdrop-blur-sm"}`}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col items-center p-4 sm:p-6 md:p-8 text-center animate-in zoom-in-95 duration-300 border border-gray-100">
        
        {/* Top Bar with Dismiss and Tab Switchers */}
        <div className="w-full flex items-center justify-between mb-3 sm:mb-4">
          {manualLeads.length > 0 && taskLeads.length > 0 ? (
            <div className="flex items-center gap-1 sm:gap-1.5 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("MANUAL")}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 ${
                  currentTab === "MANUAL"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>🔔 Manual</span>
                <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {manualLeads.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("TASKS")}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 ${
                  currentTab === "TASKS"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>📋 Tasks</span>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                  {taskLeads.length}
                </span>
              </button>
            </div>
          ) : (
            <div />
          )}

          <button 
            type="button"
            onClick={() => handleDismissAll()}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center font-bold text-sm transition-colors shrink-0"
            title="Dismiss Alert"
          >
            ✕
          </button>
        </div>

        {/* -------------------- TAB 1: SEPARATE POPUP ALERT FOR MANUALLY SCHEDULED FOLLOW-UPS -------------------- */}
        {currentTab === "MANUAL" && (
          <>
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-3 shadow-inner relative">
              <Clock className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full text-white font-bold text-[10px] flex items-center justify-center">
                {manualLeads.length}
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-2">
              <User className="w-3.5 h-3.5" />
              <span>Personal Scheduled Follow-up</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">
              {manualLeads.length >= 6 ? "SCHEDULED FOLLOW-UP TASKS!" : "SCHEDULED CALL DUE!"}
            </h2>
            <p className="text-gray-500 text-xs mb-3 font-medium max-w-sm">
              Follow-up manually set up for this client is due now.
            </p>

            {/* When there are 6 or more leads: show summary & toggle */}
            {manualLeads.length >= 6 && (
              <div className="w-full mb-3 flex flex-col items-center">
                <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3 sm:p-4 w-full text-center mb-2.5">
                  <div className="text-2xl sm:text-3xl font-black text-indigo-700">{manualLeads.length}</div>
                  <div className="text-[11px] sm:text-xs font-bold text-gray-700 mt-0.5 uppercase tracking-wide">
                    Leads Due for Follow-up
                  </div>
                  <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5 font-medium">
                    You have {manualLeads.length} manually scheduled follow-ups due.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsManualExpanded(prev => !prev)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-all shadow-xs"
                >
                  <span>{isManualExpanded ? "Hide Leads" : `Show All ${manualLeads.length} Leads`}</span>
                  {isManualExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                </button>
              </div>
            )}

            {/* Manual Leads List */}
            {(manualLeads.length < 6 || isManualExpanded) && (
              <div className="w-full space-y-2.5 mb-4 max-h-[42vh] sm:max-h-[48vh] overflow-y-auto text-left pr-0.5">
                {manualLeads.map((lead) => (
                  <div key={lead.id} className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3 shadow-2xs">
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-gray-900 text-xs sm:text-sm hover:text-indigo-600 truncate">{lead.name}</div>
                        <div className="text-[11px] sm:text-xs text-gray-500 font-mono font-bold mt-0.5 truncate">{lead.phone || "--"}</div>
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 border border-indigo-200/60 shrink-0">
                        {lead.status}
                      </span>
                    </div>

                    {lead.note && (
                      <div className="bg-white/90 border border-indigo-100 rounded-lg p-2 text-xs text-gray-700 font-medium mb-2.5">
                        <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider mb-0.5">
                          Note:
                        </span>
                        {lead.note}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-indigo-100/60">
                      <div className="text-[10px] sm:text-[11px] text-gray-400 font-semibold flex items-center gap-1 truncate">
                        <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{lead.followUpDate ? `Due: ${new Date(lead.followUpDate).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}` : 'Due Now'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {lead.phone && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismissManualLead(lead.id);
                              triggerSmartCall(lead.id, lead.name, lead.phone);
                            }}
                            className="flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm transition-all"
                            title="Direct Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {lead.phone && (
                          <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent("Hello " + lead.name + ", following up on our scheduled discussion.")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            className="flex items-center justify-center bg-[#25D366] hover:bg-green-600 active:scale-95 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm transition-all"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            handleDismissManualLead(lead.id);
                            window.location.href = `/leads/${lead.id}`;
                          }}
                          className="flex items-center text-[11px] sm:text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-colors"
                          title="Open Profile"
                        >
                          Open <ExternalLink className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* -------------------- TAB 2: TASK FOLLOW-UPS POPUP (AUTOMATED / BULK TASKS) -------------------- */}
        {currentTab === "TASKS" && (
          <>
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-3 shadow-inner relative">
              <ListTodo className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 rounded-full text-white font-bold text-[10px] flex items-center justify-center">
                {taskLeads.length}
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider mb-2">
              <ListTodo className="w-3.5 h-3.5" />
              <span>Follow-up Tasks</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-1">
              TASKS DUE!
            </h2>

            {/* Tasks Summary with Dropdown (Expandable/Retractable) */}
            <div className="w-full mb-3 flex flex-col items-center">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 sm:p-4 w-full text-center mb-2.5">
                <div className="text-2xl sm:text-3xl font-black text-emerald-700">{taskLeads.length}</div>
                <div className="text-[11px] sm:text-xs font-bold text-gray-700 mt-0.5 uppercase tracking-wide">
                  Pending Follow-up Tasks
                </div>
                <p className="text-gray-500 text-[11px] sm:text-xs mt-0.5 font-medium">
                  You have {taskLeads.length} follow-up task{taskLeads.length === 1 ? "" : "s"} due right now.
                </p>
              </div>

              {/* Expandable and Retractable dropdown button */}
              <button
                type="button"
                onClick={() => setIsTaskExpanded(prev => !prev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-all shadow-xs"
              >
                <span>{isTaskExpanded ? "Hide Leads" : `Show Pending Leads (${taskLeads.length})`}</span>
                {isTaskExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </button>
            </div>

            {/* Leads List: rendered if isTaskExpanded is true */}
            {isTaskExpanded && (
              <div className="w-full space-y-2 mb-4 max-h-[42vh] sm:max-h-[48vh] overflow-y-auto text-left pr-0.5 animate-in fade-in-50 duration-200">
                {taskLeads.map((lead) => (
                  <div key={lead.id} className="bg-gray-50 border border-gray-200 rounded-xl p-2.5 sm:p-3 flex justify-between items-center text-left gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-gray-800 text-xs sm:text-sm truncate">{lead.name}</div>
                      <div className="text-[11px] sm:text-xs text-gray-500 font-medium font-mono truncate">{lead.phone || "--"}</div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {lead.phone && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismissTaskLead(lead.id);
                            triggerSmartCall(lead.id, lead.name, lead.phone);
                          }}
                          className="flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm transition-all"
                          title="Direct Call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {lead.phone && (
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent("Hello " + lead.name + ", following up on our scheduled discussion.")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="flex items-center justify-center bg-[#25D366] hover:bg-green-600 active:scale-95 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-sm transition-all"
                          title="WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button 
                        type="button"
                        onClick={() => {
                          handleDismissTaskLead(lead.id);
                          window.location.href = `/leads/${lead.id}`;
                        }}
                        className="flex items-center text-[11px] sm:text-xs font-bold text-[#4f46e5] bg-purple-50 hover:bg-purple-100 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-colors"
                        title="Open Lead Profile"
                      >
                        Open <ExternalLink className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Bottom Actions */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-gray-100 text-xs">
          <button 
            type="button"
            onClick={() => handleDismissAll(5)} 
            className="text-gray-400 text-xs font-bold hover:text-gray-600 underline"
          >
            Snooze alerts for 5 minutes
          </button>

          <button
            type="button"
            onClick={() => {
              AlertNotificationManager.dismissEqualAlert();
              window.location.href = "/dashboard";
            }}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
          >
            Go to Workdesk →
          </button>
        </div>

      </div>
    </div>
  );
}
