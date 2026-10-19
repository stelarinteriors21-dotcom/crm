"use client";

import { useState, useEffect, useRef } from "react";
import { Phone, PhoneCall, PhoneMissed, PhoneOff, Check, X, Clock, Loader2, Sparkles, ShieldCheck, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

interface ActiveCall {
  leadId: string;
  leadName: string;
  phone: string;
  startTime: number;
}

export function calculateRingCadence(seconds: number): number {
  if (seconds <= 2) return 0;
  if (seconds <= 6) return 1;
  if (seconds <= 10) return 2;
  if (seconds <= 15) return 3;
  return Math.min(10, Math.max(1, Math.round(seconds / 4.5)));
}
export const calculateTelecomRings = calculateRingCadence;

export function triggerSmartCall(leadId: string, leadName: string, phone: string) {
  if (typeof window === "undefined") return;

  const cleanPhone = phone.replace(/[^\d+]/g, "");
  const callData: ActiveCall = {
    leadId,
    leadName,
    phone: cleanPhone,
    startTime: Date.now(),
  };

  localStorage.setItem("active_crm_call", JSON.stringify(callData));
  window.dispatchEvent(new CustomEvent("crm_call_started", { detail: callData }));

  // Open native Android / iOS / OS dialer
  window.location.href = `tel:${cleanPhone}`;
}

export default function SmartCallManager({ currentUserId }: { currentUserId?: string }) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // Hardware Verification & Anti-Fraud
  const [isHardwareVerified, setIsHardwareVerified] = useState(false);
  const [hardwareDuration, setHardwareDuration] = useState<number | null>(null);
  const [detectedRecordingUri, setDetectedRecordingUri] = useState<string | null>(null);
  const [detectedRecordingPath, setDetectedRecordingPath] = useState<string | null>(null);
  const [rejectedNotice, setRejectedNotice] = useState<string | null>(null);

  // Modal fields
  const [outcome, setOutcome] = useState<"ANSWERED" | "MISSED" | "BUSY" | "WRONG_NUMBER">("MISSED");
  const [rings, setRings] = useState<number>(1);
  const [callNotes, setCallNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Call logs and recordings are accessed directly from device; clear any lingering call state
  useEffect(() => {
    localStorage.removeItem("active_crm_call");

    const handleCallStarted = (e: any) => {
      setActiveCall(e.detail);
      setElapsedSeconds(0);
      setShowDispositionModal(false);
      setSavedSuccess(false);
    };

    window.addEventListener("crm_call_started", handleCallStarted);
    return () => window.removeEventListener("crm_call_started", handleCallStarted);
  }, []);

  // Update timer while call is active
  useEffect(() => {
    if (activeCall && !showDispositionModal) {
      timerRef.current = setInterval(() => {
        const secs = Math.round((Date.now() - activeCall.startTime) / 1000);
        setElapsedSeconds(secs);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeCall, showDispositionModal]);

  // Detect when user returns to app after call in native dialer
  useEffect(() => {
    const handleReturnToApp = async () => {
      if (document.visibilityState === "visible") {
        const saved = localStorage.getItem("active_crm_call");
        if (saved) {
          try {
            const parsed: ActiveCall = JSON.parse(saved);
            let totalDuration = Math.max(1, Math.round((Date.now() - parsed.startTime) / 1000));
            let detectedOutcome: "ANSWERED" | "MISSED" | "BUSY" = totalDuration >= 15 ? "ANSWERED" : "MISSED";

            // If running on Android Capacitor app, check native hardware CallLog
            const capacitor = (window as any).Capacitor;
            if (capacitor?.Plugins?.AndroidCallLog) {
              try {
                const latestCall = await capacitor.Plugins.AndroidCallLog.getLatestCall({
                  targetPhone: parsed.phone,
                  minTimestamp: parsed.startTime,
                });

                if (latestCall && latestCall.found === false) {
                  // User opened dialer but NEVER actually placed the call on the device!
                  localStorage.removeItem("active_crm_call");
                  setActiveCall(null);
                  setShowDispositionModal(false);
                  setIsHardwareVerified(false);
                  setHardwareDuration(null);
                  setRejectedNotice(`❌ Call Not Placed: No call to ${parsed.phone} was found in your device call log. Nothing was recorded.`);
                  setTimeout(() => setRejectedNotice(null), 7000);
                  return;
                }

                if (latestCall && latestCall.found === true) {
                  const actualDur = Number(latestCall.duration || 0);
                  setIsHardwareVerified(true);
                  setHardwareDuration(actualDur);
                  totalDuration = actualDur;
                  detectedOutcome = actualDur > 0 ? "ANSWERED" : "MISSED";
                  setDetectedRecordingUri(latestCall.recordingUri || null);
                  setDetectedRecordingPath(latestCall.recordingPath || null);
                }
              } catch (nativeErr) {
                console.warn("AndroidCallLog check error:", nativeErr);
              }
            }

            localStorage.removeItem("active_crm_call");
            setActiveCall(null);
            setShowDispositionModal(false);
          } catch {
            // ignore
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleReturnToApp);
    window.addEventListener("focus", handleReturnToApp);

    return () => {
      document.removeEventListener("visibilitychange", handleReturnToApp);
      window.removeEventListener("focus", handleReturnToApp);
    };
  }, []);

  const handleSaveCall = async () => {
    if (!activeCall) return;
    setIsSaving(true);

    try {
      const actualHardwareDur = (isHardwareVerified && hardwareDuration !== null) ? hardwareDuration : null;
      const effectiveOutcome = (actualHardwareDur !== null && actualHardwareDur > 0) ? "ANSWERED" : outcome;
      const finalDuration = effectiveOutcome === "ANSWERED" 
        ? (actualHardwareDur !== null ? actualHardwareDur : elapsedSeconds)
        : 0;

      const fd = new FormData();
      fd.append("leadId", activeCall.leadId);
      fd.append("phone", activeCall.phone);
      fd.append("duration", finalDuration.toString());
      fd.append("ringDuration", elapsedSeconds.toString());
      fd.append("rings", rings.toString());
      fd.append("callStatus", effectiveOutcome);
      if (currentUserId) {
        fd.append("userId", currentUserId);
      }

      let dispositionNote = "";
      if (isHardwareVerified) {
        dispositionNote = finalDuration > 0
          ? `[🔒 Verified Device Log: ${finalDuration}s talk time]`
          : `[🔒 Verified Device Log: 0s unanswered/RNR (~${rings} rings)]`;
      } else if (effectiveOutcome === "ANSWERED") {
        dispositionNote = `Spoke with client (${elapsedSeconds}s talk time)`;
      } else if (effectiveOutcome === "MISSED") {
        dispositionNote = rings === 1 
          ? `[⚠️ 1 RING HANGUP] Cut after 1st ring (${elapsedSeconds}s)`
          : `Client did not answer (${rings} rings in ${elapsedSeconds}s)`;
      } else if (effectiveOutcome === "BUSY") {
        dispositionNote = `Line busy / disconnected (${elapsedSeconds}s)`;
      } else if (effectiveOutcome === "WRONG_NUMBER") {
        dispositionNote = `Invalid or wrong number`;
      }

      const combinedNotes = callNotes ? `${dispositionNote}. Note: ${callNotes}` : dispositionNote;
      fd.append("notes", combinedNotes);

      let savedOk = false;
      const capacitor = (window as any).Capacitor;

      // If running inside Android Capacitor and talk time occurred, try uploading call recording file!
      if (capacitor?.Plugins?.AndroidCallLog?.uploadRecordingForCall && finalDuration > 0) {
        try {
          const recRes = await capacitor.Plugins.AndroidCallLog.uploadRecordingForCall({
            phone: activeCall.phone,
            leadId: activeCall.leadId,
            duration: finalDuration,
            timestamp: activeCall.startTime,
            userId: currentUserId,
            notes: combinedNotes,
            recordingPath: detectedRecordingPath,
            recordingUri: detectedRecordingUri,
            serverUrl: window.location.origin + "/api/mobile/call-logs",
          });
          if (recRes && recRes.uploaded) {
            savedOk = true;
          }
        } catch (recErr) {
          console.warn("Native audio upload error, falling back to standard API:", recErr);
        }
      }

      if (!savedOk) {
        const res = await fetch("/api/mobile/call-logs", {
          method: "POST",
          body: fd,
        });

        if (res.ok) {
          savedOk = true;
        } else {
          alert("Failed to save call log: " + (await res.text()));
        }
      }

      if (savedOk) {
        setSavedSuccess(true);
        localStorage.removeItem("active_crm_call");
        localStorage.setItem("crm_last_synced_call_time", Date.now().toString());
        const cleanPhone = activeCall.phone.replace(/\D/g, "").slice(-10);
        localStorage.setItem("crm_last_logged_call_" + cleanPhone, Date.now().toString());
        setTimeout(() => {
          setShowDispositionModal(false);
          setActiveCall(null);
          setIsHardwareVerified(false);
          setHardwareDuration(null);
          setDetectedRecordingUri(null);
          setDetectedRecordingPath(null);
          setSavedSuccess(false);
          setCallNotes("");
          router.refresh();
        }, 1200);
      }
    } catch (err: any) {
      alert("Error saving call: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    localStorage.removeItem("active_crm_call");
    setShowDispositionModal(false);
    setActiveCall(null);
    setIsHardwareVerified(false);
    setHardwareDuration(null);
    setDetectedRecordingUri(null);
    setDetectedRecordingPath(null);
    setCallNotes("");
  };

  const currentEstimatedRings = calculateTelecomRings(elapsedSeconds);

  return (
    <>
      {/* 0. Rejection Alert Toast */}
      {rejectedNotice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[300] bg-red-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold animate-in slide-in-from-top-4 max-w-lg border border-red-500">
          <ShieldAlert className="w-5 h-5 text-white shrink-0" />
          <span className="flex-1">{rejectedNotice}</span>
          <button 
            type="button" 
            onClick={() => setRejectedNotice(null)} 
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Floating Banner while call is active (if not in modal) */}
      {activeCall && !showDispositionModal && (
        <div className="fixed bottom-16 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-[150] bg-gray-900 text-white rounded-2xl shadow-2xl p-4 border border-indigo-500/40 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center animate-pulse">
                <PhoneCall className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-gray-200 truncate max-w-[170px]">
                  Calling: {activeCall.leadName}
                </div>
                <div className="text-[11px] text-emerald-400 font-mono font-semibold">
                  ⏱️ {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, "0")} (Rings: ~{currentEstimatedRings})
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowDispositionModal(true)}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow transition-all"
            >
              End & Log Call
            </button>
          </div>
        </div>
      )}


    </>
  );
}
