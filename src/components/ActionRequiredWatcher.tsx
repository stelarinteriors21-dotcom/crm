"use client";

import { useEffect, useState, useRef } from "react";
import { 
  getActionRequiredLeads, 
  dismissStaleConvertingAlert,
  recordQuotationFollowUpDone,
  dismissRevisionAlert,
  dismissInactivity48hAlert
} from "@/app/actions/alertActions";
import { Phone, AlertTriangle, ExternalLink, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { triggerSmartCall } from "@/components/SmartCallManager";

import { AlertNotificationManager } from "@/lib/alertNotifier";

export default function ActionRequiredWatcher() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [flashing, setFlashing] = useState(false);
  const router = useRouter();

  const ACTION_SNOOZE_KEY = "telecrm_action_required_snooze_until";

  // Listen for scheduled follow-ups across the app to immediately dismiss alerts
  useEffect(() => {
    const handleScheduled = (e: any) => {
      const scheduledLeadId = e.detail?.leadId;
      if (scheduledLeadId) {
        setAlerts(prev => {
          const next = prev.filter(a => a.lead?.id !== scheduledLeadId);
          if (next.length === 0) AlertNotificationManager.dismissEqualAlert();
          return next;
        });
      }
    };
    window.addEventListener("followup_scheduled", handleScheduled);
    return () => window.removeEventListener("followup_scheduled", handleScheduled);
  }, []);

  useEffect(() => {
    const check = async () => {
      try {
        if (typeof window !== "undefined") {
          const snoozedUntil = Number(sessionStorage.getItem(ACTION_SNOOZE_KEY) || 0);
          if (Date.now() < snoozedUntil) {
            return;
          }
        }
        const activeAlerts = await getActionRequiredLeads();
        setAlerts(activeAlerts);
        if (!activeAlerts || activeAlerts.length === 0) {
          AlertNotificationManager.dismissEqualAlert();
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    check();
    const interval = setInterval(check, 60000); // Check every 60 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (alerts.length === 0) {
      AlertNotificationManager.dismissEqualAlert();
      return;
    }

    const title = "🚨 ACTION REQUIRED!";
    const body = alerts[0]?.message || `You have ${alerts.length} urgent workflow action(s) required.`;
    const tag = "action_required_alert";
    const titleFlashText = "ACTION REQUIRED!";

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
  }, [alerts]);

  const handleDismissAll = () => {
    AlertNotificationManager.dismissEqualAlert();
    if (typeof window !== "undefined") {
      sessionStorage.setItem(ACTION_SNOOZE_KEY, (Date.now() + 15 * 60 * 1000).toString());
    }
    alerts.forEach(a => {
      if (a.type === "STALE_CONVERTING_24H" || a.type === "STALE_CONVERTING_5H") dismissStaleConvertingAlert(a.lead.id);
      if (a.type === "QUOTATION_FOLLOWUP_DUE") recordQuotationFollowUpDone(a.lead.id);
      if (a.type === "QUOTATION_REVISION_REQUESTED") dismissRevisionAlert(a.lead.id);
      if (a.type === "INACTIVITY_48H_ESCALATION") dismissInactivity48hAlert(a.lead.id);
    });
    setAlerts([]);
  };

  const removeSingleAlert = (leadId: string) => {
    setAlerts(prev => {
      const next = prev.filter(a => a.lead.id !== leadId);
      if (next.length === 0) {
        AlertNotificationManager.dismissEqualAlert();
      }
      return next;
    });
  };

  if (alerts.length === 0) return null;

  return (
    <div className={`fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 md:p-6 transition-colors duration-300 ${flashing ? "bg-red-600/60" : "bg-black/50 backdrop-blur-sm"}`}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col items-center p-4 sm:p-6 md:p-8 text-center animate-in zoom-in-95 duration-300 border border-red-100">
        
        <div className="w-full flex justify-end -mt-1 sm:-mt-2 -mr-1 sm:-mr-2 mb-2">
          <button 
            type="button"
            onClick={handleDismissAll}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center font-bold text-sm transition-colors shrink-0"
            title="Dismiss Alert"
          >
            ✕
          </button>
        </div>
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-100 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-inner relative">
          <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-red-600 animate-pulse" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-1 sm:mb-2">ACTION REQUIRED!</h2>
        <p className="text-red-600 font-bold mb-4 sm:mb-6 text-xs sm:text-sm">
          You have {alerts.length} urgent workflow violation(s) that must be resolved immediately.
        </p>

        <div className="w-full space-y-2.5 sm:space-y-3 mb-4 sm:mb-6 max-h-[48vh] overflow-y-auto pr-0.5">
          {alerts.map((alert, idx) => (
            <div key={idx} className="bg-red-50/70 border border-red-200 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center text-left gap-2 sm:gap-3 shadow-2xs">
              <div className="flex-1 min-w-0 pr-1">
                <div className="font-black text-red-900 text-xs sm:text-sm mb-0.5 truncate">{alert.lead.name}</div>
                <div className="text-[11px] sm:text-xs text-red-700 font-medium leading-snug">{alert.message}</div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-red-100">
                {alert.type === "QUOTATION_FOLLOWUP_DUE" && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await recordQuotationFollowUpDone(alert.lead.id);
                      removeSingleAlert(alert.lead.id);
                    }}
                    className="flex items-center text-[11px] sm:text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-2.5 py-1.5 sm:py-2 rounded-xl transition-colors shadow-xs"
                    title="Mark Follow-up as Done (Next in 24h)"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Done
                  </button>
                )}
                {alert.type === "INACTIVITY_48H_ESCALATION" && (
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await dismissInactivity48hAlert(alert.lead.id);
                      removeSingleAlert(alert.lead.id);
                    }}
                    className="flex items-center text-[11px] sm:text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1.5 sm:py-2 rounded-xl transition-colors shadow-xs"
                    title="Acknowledge 48h Inactivity Alert"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Ack
                  </button>
                )}
                {alert.lead?.phone && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (alert.type === "STALE_CONVERTING_24H" || alert.type === "STALE_CONVERTING_5H") dismissStaleConvertingAlert(alert.lead.id);
                      if (alert.type === "QUOTATION_FOLLOWUP_DUE") recordQuotationFollowUpDone(alert.lead.id);
                      if (alert.type === "QUOTATION_REVISION_REQUESTED") dismissRevisionAlert(alert.lead.id);
                      if (alert.type === "INACTIVITY_48H_ESCALATION") dismissInactivity48hAlert(alert.lead.id);
                      removeSingleAlert(alert.lead.id);
                      triggerSmartCall(alert.lead.id, alert.lead.name, alert.lead.phone);
                    }}
                    className="flex items-center justify-center bg-red-600 hover:bg-red-700 active:scale-95 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-lg shadow-xs transition-all"
                    title="Call Now"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => {
                    if (alert.type === "STALE_CONVERTING_24H" || alert.type === "STALE_CONVERTING_5H") dismissStaleConvertingAlert(alert.lead.id);
                    if (alert.type === "QUOTATION_FOLLOWUP_DUE") recordQuotationFollowUpDone(alert.lead.id);
                    if (alert.type === "QUOTATION_REVISION_REQUESTED") dismissRevisionAlert(alert.lead.id);
                    if (alert.type === "INACTIVITY_48H_ESCALATION") dismissInactivity48hAlert(alert.lead.id);
                    removeSingleAlert(alert.lead.id);
                    window.location.href = `/leads/${alert.lead.id}`;
                  }}
                  className="flex items-center text-[11px] sm:text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg transition-colors"
                  title="Open Lead"
                >
                  Open <ExternalLink className="w-3 h-3 ml-1" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button 
          type="button"
          onClick={handleDismissAll} 
          className="text-gray-400 text-xs font-bold hover:text-gray-600 underline"
        >
          Snooze alerts for 15 minutes
        </button>

      </div>
    </div>
  );
}
