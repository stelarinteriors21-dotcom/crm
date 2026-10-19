"use client";

import { useEffect, useState, useRef } from "react";
import { getPendingLeadForUser, acceptLead, escalateLead, acceptAndScheduleCall, dismissRnrAlert, snoozeRnrLead } from "@/app/actions/leadActions";
import { User, Phone, MapPin, Loader2, AlertCircle, Clock, PhoneMissed } from "lucide-react";
import { triggerSmartCall } from "@/components/SmartCallManager";
import { AlertNotificationManager } from "@/lib/alertNotifier";

export default function PendingLeadWatcher({ userId }: { userId?: string }) {
  const [pendingLead, setPendingLead] = useState<any>(null);
  const [flashing, setFlashing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    let pollingTimer: NodeJS.Timeout;

    const checkLead = async () => {
      if (processing) return;
      if (typeof window !== 'undefined' && localStorage.getItem("active_crm_call")) return;
      try {
        const lead = await getPendingLeadForUser();
        
        if (lead) {
          setPendingLead(lead);
          if ((lead as any).isRnrAlert) {
            setTimeLeft(600);
          } else {
            const assignedTime = new Date((lead as any).assignedAt || (lead as any).createdAt).getTime();
            const now = Date.now();
            const diffSecs = Math.floor((now - assignedTime) / 1000);
            setTimeLeft(Math.max(0, 600 - diffSecs));
          }
        } else {
          setPendingLead(null);
          AlertNotificationManager.dismissEqualAlert();
        }
      } catch (err) {
        // Silently swallow fetchServerAction abort or network jitter
        console.warn("PendingLeadWatcher background check skipped:", err);
      }
    };

    checkLead();
    pollingTimer = setInterval(checkLead, 35000);

    return () => clearInterval(pollingTimer);
  }, [processing]);

  useEffect(() => {
    if (!pendingLead) {
      AlertNotificationManager.dismissEqualAlert();
      return;
    }

    const isRnr = pendingLead?.isRnrAlert === true;
    const title = isRnr ? "🔔 RNR REDIAL ALERT!" : "🚨 NEW LEAD ASSIGNED!";
    const body = isRnr 
      ? `Time to redial ${pendingLead.name || 'Client'} (${pendingLead.phone || ''})`
      : `New lead assigned: ${pendingLead.name || 'Client'} (${pendingLead.phone || ''})`;
    const tag = isRnr ? "rnr_alert" : "pending_lead";
    const titleFlashText = isRnr ? "RNR REDIAL DUE!" : "NEW LEAD ASSIGNED!";

    // Trigger initial notification burst immediately
    AlertNotificationManager.dispatchEqualAlert({ title, body, tag, titleFlashText });

    const flashTimer = setInterval(() => {
      setFlashing(f => !f);
      AlertNotificationManager.dispatchEqualAlert({ title, body, tag, titleFlashText });
    }, 4000);

    return () => {
      clearInterval(flashTimer);
      AlertNotificationManager.dismissEqualAlert();
    };
  }, [pendingLead]);

  useEffect(() => {
    if (!pendingLead) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          if (prev === 1) {
            if (pendingLead?.isRnrAlert) {
              handlePassRnr();
            } else {
              handleReject(pendingLead.id, true);
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [pendingLead]);

  const handlePassRnr = async () => {
    if (!pendingLead || processing) return;
    setProcessing(true);
    await dismissRnrAlert(pendingLead.id, pendingLead.rnrSlotId);
    setPendingLead(null);
    AlertNotificationManager.dismissEqualAlert();
    setProcessing(false);
  };

  const handleSnoozeRnr = async () => {
    if (!pendingLead || processing) return;
    setProcessing(true);
    await snoozeRnrLead(pendingLead.id, 15);
    setPendingLead(null);
    AlertNotificationManager.dismissEqualAlert();
    setProcessing(false);
  };

  const handleCallRnr = async () => {
    if (!pendingLead || processing) return;
    setProcessing(true);
    await dismissRnrAlert(pendingLead.id, pendingLead.rnrSlotId);
    const targetLead = { ...pendingLead };
    setPendingLead(null);
    AlertNotificationManager.dismissEqualAlert();
    setProcessing(false);
    triggerSmartCall(targetLead.id, targetLead.name, targetLead.phone);
  };

  const handleAccept = async () => {
    if (!pendingLead || processing) return;
    setProcessing(true);
    await acceptLead(pendingLead.id);
    setPendingLead(null);
    AlertNotificationManager.dismissEqualAlert();
    setProcessing(false);
  };

  const handleCallIn15 = async () => {
    if (!pendingLead || processing) return;
    setProcessing(true);
    await acceptAndScheduleCall(pendingLead.id, 15);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("followup_scheduled", { detail: { leadId: pendingLead.id } }));
    }
    setPendingLead(null);
    AlertNotificationManager.dismissEqualAlert();
    setProcessing(false);
  };

  const handleReject = async (id: string, auto: boolean = false) => {
    if (processing) return;
    setProcessing(true);
    await escalateLead(id, !auto);
    setPendingLead(null);
    AlertNotificationManager.dismissEqualAlert();
    setProcessing(false);
  };

  if (!pendingLead) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isRnrAlert = pendingLead?.isRnrAlert === true;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 transition-colors duration-300 backdrop-blur-sm ${flashing ? (isRnrAlert ? 'bg-amber-500/30' : 'bg-emerald-600/40') : 'bg-black/40'}`}>
      <div className={`bg-white w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 transform transition-transform duration-200 ${flashing ? 'scale-105' : 'scale-100'}`}>
        
        <div className="flex items-center justify-center mb-6">
          <div className={`w-16 h-16 ${isRnrAlert ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center animate-pulse`}>
            {isRnrAlert ? <PhoneMissed className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
          </div>
        </div>

        {isRnrAlert ? (
          <>
            <div className="flex justify-center mb-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                {pendingLead.rnrSlotLabel || "Scheduled Redial Slot"}
              </span>
            </div>
            <h2 className="text-2xl font-black text-center text-gray-900 mb-2">🔔 RNR REDIAL ALERT!</h2>
            <p className="text-center text-amber-700 font-semibold mb-6 text-sm">
              This lead was unanswered previously. Scheduled 2-hour redial slot is now active!
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-black text-center text-gray-900 mb-2">NEW LEAD ASSIGNED!</h2>
            <p className="text-center text-gray-600 mb-6 font-medium">
              You have a new incoming lead to call. Accept, snooze, or pass.
            </p>
          </>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
             <div>
               <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Lead Name</div>
               <div className="text-xl font-bold text-gray-900 flex items-center">
                 <User className="w-5 h-5 mr-2 text-[#4f46e5]" />
                 {pendingLead.name}
               </div>
             </div>
             <div className="text-right">
               <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                 {isRnrAlert ? "Current Status" : "Source"}
               </div>
               {isRnrAlert ? (
                 <div className="inline-block bg-amber-100 text-amber-900 text-xs font-extrabold px-2.5 py-1 rounded-full border border-amber-300">
                   RNR (Unanswered)
                 </div>
               ) : (
                 <div className="inline-block bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-1 rounded-full">
                   {pendingLead.source}
                 </div>
               )}
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
             <div>
               <div className="text-xs font-medium text-gray-500 mb-1 flex items-center">
                 <Phone className="w-3 h-3 mr-1" /> Phone
               </div>
               <div className="text-sm font-semibold text-gray-800">
                 {pendingLead.phone}
               </div>
             </div>
             <div>
               <div className="text-xs font-medium text-gray-500 mb-1 flex items-center">
                 <MapPin className="w-3 h-3 mr-1" /> City
               </div>
               <div className="text-sm font-semibold text-gray-800">
                 {pendingLead.city || 'Unknown'}
               </div>
             </div>
          </div>
        </div>

        <div className="flex flex-col space-y-4">
          <div className="text-center font-bold text-red-600 tabular-nums text-lg mb-2">
            Time Remaining: {minutes}:{seconds.toString().padStart(2, '0')}
          </div>

            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={isRnrAlert ? handlePassRnr : () => handleReject(pendingLead.id)}
                disabled={processing}
                className="col-span-1 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 text-xs sm:text-sm border border-red-200"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'PASS'}
              </button>
              <button 
                onClick={isRnrAlert ? handleSnoozeRnr : handleCallIn15}
                disabled={processing}
                className="col-span-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-colors disabled:opacity-50 text-xs sm:text-sm"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'SNOOZE'}
              </button>
              <button 
                onClick={isRnrAlert ? handleCallRnr : () => {
                  handleAccept();
                  triggerSmartCall(pendingLead.id, pendingLead.name, pendingLead.phone);
                }}
                disabled={processing}
                className="col-span-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-500/30 transition-colors disabled:opacity-50 text-xs sm:text-sm"
              >
                {processing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'CALL'}
              </button>
            </div>
        </div>

      </div>
    </div>
  );
}
