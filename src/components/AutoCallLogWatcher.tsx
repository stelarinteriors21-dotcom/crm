"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PhoneCall, Check, X, Disc } from "lucide-react";

interface AutoCallLogWatcherProps {
  userId?: string;
}

export default function AutoCallLogWatcher({ userId }: AutoCallLogWatcherProps) {
  const [syncToast, setSyncToast] = useState<string | null>(null);
  const [showStoragePrompt, setShowStoragePrompt] = useState<boolean>(false);
  const router = useRouter();
  const isSyncingRef = useRef(false);

  const checkStorageAccess = async () => {
    if (typeof window === "undefined") return;
    const capacitor = (window as any).Capacitor;
    if (capacitor?.Plugins?.AndroidCallLog?.checkAllFilesAccess) {
      try {
        const res = await capacitor.Plugins.AndroidCallLog.checkAllFilesAccess();
        if (res && res.granted === false) {
          setShowStoragePrompt(true);
        } else {
          setShowStoragePrompt(false);
        }
      } catch (e) {}
    }
  };

  // Backfill search for any recent calls missing audio recordings
  const syncUnattachedRecordings = async () => {
    if (typeof window === "undefined") return;
    const capacitor = (window as any).Capacitor;
    if (!capacitor?.Plugins?.AndroidCallLog?.syncRecordingsForLead) return;

    try {
      const res = await fetch(`/api/mobile/call-logs/unattached-recordings${userId ? `?userId=${userId}` : ""}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data?.calls && Array.isArray(data.calls) && data.calls.length > 0) {
        let attachedCount = 0;
        for (const call of data.calls) {
          try {
            const syncRes = await capacitor.Plugins.AndroidCallLog.syncRecordingsForLead({
              phone: call.phone,
              leadId: call.leadId,
              callId: call.id,
              leadName: call.leadName,
              timestamp: new Date(call.createdAt).getTime(),
              duration: call.duration,
              serverUrl: window.location.origin + "/api/mobile/call-logs",
            });

            if (syncRes?.uploaded) {
              attachedCount++;
            }
          } catch (e) {
            // Ignore single scan error
          }
        }

        if (attachedCount > 0) {
          setSyncToast(`🎙️ Auto-attached ${attachedCount} call recording${attachedCount > 1 ? "s" : ""} from your phone!`);
          router.refresh();
          setTimeout(() => setSyncToast(null), 6000);
        }
      }
    } catch (err) {
      console.warn("Unattached recording sync error:", err);
    }
  };

  const runSync = async (force48h = false) => {
    if (typeof window === "undefined" || isSyncingRef.current) return;

    const capacitor = (window as any).Capacitor;
    if (!capacitor?.Plugins?.AndroidCallLog) return;

    try {
      isSyncingRef.current = true;
      const lastSyncRaw = localStorage.getItem("crm_last_synced_call_time");
      // Default to last 3 hours if regular sync, or 48 hours if forced backfill
      const minTime = force48h
        ? Date.now() - 48 * 3600 * 1000
        : lastSyncRaw
        ? Number(lastSyncRaw)
        : Date.now() - 3 * 3600 * 1000;

      const res = await capacitor.Plugins.AndroidCallLog.getRecentCalls({
        sinceTimestamp: minTime,
      });

      if (res?.calls && Array.isArray(res.calls) && res.calls.length > 0) {
        // Sort chronologically ascending (oldest first) so cursor advances progressively
        const sortedCalls = [...res.calls].sort(
          (a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0)
        );

        let matchedCount = 0;
        let highestSuccessTimestamp = minTime;
        let hasFailure = false;

        for (const c of sortedCalls) {
          const callTime = Number(c.timestamp || 0);
          if (!force48h && callTime <= minTime) continue;

          const rawNumber = String(c.number || "").trim();
          if (!rawNumber) continue;

          // Skip if this call corresponds to a CRM dialer session currently active or finished in the last 2 minutes
          const activeCrmCallRaw = localStorage.getItem("active_crm_call");
          if (activeCrmCallRaw) {
            try {
              const active = JSON.parse(activeCrmCallRaw);
              const cleanActive = String(active.phone || "").replace(/\D/g, "").slice(-10);
              const cleanRaw = rawNumber.replace(/\D/g, "").slice(-10);
              if (cleanActive && cleanRaw && cleanActive === cleanRaw) {
                if (Date.now() - active.startTime < 120000) {
                  continue;
                }
              }
            } catch (e) {}
          }

          // Skip if this phone number was already logged by SmartCallManager in the last 45 seconds
          const cleanPhoneKey = rawNumber.replace(/\D/g, "").slice(-10);
          const lastLoggedBySmartDialer = Number(localStorage.getItem(`crm_last_logged_call_${cleanPhoneKey}`) || 0);
          if (Date.now() - lastLoggedBySmartDialer < 45000) {
            continue;
          }

          const duration = Number(c.duration || 0);
          const isIncoming = c.type === 1;

          try {
            const fd = new FormData();
            fd.append("phone", rawNumber);
            fd.append("duration", duration.toString());
            fd.append("ringDuration", duration.toString());
            fd.append("callStatus", duration > 0 ? "ANSWERED" : "MISSED");
            fd.append("timestamp", callTime.toString());
            fd.append(
              "notes",
              isIncoming 
                ? `[Incoming Call on SIM] (${duration}s)` 
                : `[Direct Call from Phone Dialer] (${duration}s)`
            );
            if (userId) {
              fd.append("userId", userId);
            }

            let uploadedWithAudio = false;

            // 1. Try uploading with audio if recording was detected or talk time occurred
            if (duration > 0 && capacitor?.Plugins?.AndroidCallLog?.uploadRecordingForCall) {
              try {
                const recRes = await capacitor.Plugins.AndroidCallLog.uploadRecordingForCall({
                  phone: rawNumber,
                  leadName: c.cachedName || "",
                  timestamp: callTime,
                  duration: duration,
                  userId: userId,
                  recordingPath: c.recordingPath,
                  recordingUri: c.recordingUri,
                  serverUrl: window.location.origin + "/api/mobile/call-logs",
                });
                if (recRes && recRes.uploaded) {
                  uploadedWithAudio = true;
                  matchedCount++;
                  if (!hasFailure && callTime > highestSuccessTimestamp) {
                    highestSuccessTimestamp = callTime;
                  }
                }
              } catch (recErr) {
                console.warn("Native audio upload error:", recErr);
              }
            }

            // 2. Fallback: post call metadata and retry audio scan after a 4-second encoding delay
            if (!uploadedWithAudio) {
              const uploadRes = await fetch("/api/mobile/call-logs", {
                method: "POST",
                body: fd,
              });

              if (uploadRes.ok) {
                const data = await uploadRes.json();
                if (data?.callLog) {
                  matchedCount++;
                  if (!hasFailure && callTime > highestSuccessTimestamp) {
                    highestSuccessTimestamp = callTime;
                  }

                  // If connected call, retry scanning for recording in 4 seconds (encoding grace period)
                  if (duration > 0 && data.callLog.id && capacitor?.Plugins?.AndroidCallLog?.syncRecordingsForLead) {
                    setTimeout(async () => {
                      try {
                        await capacitor.Plugins.AndroidCallLog.syncRecordingsForLead({
                          phone: rawNumber,
                          callId: data.callLog.id,
                          leadId: data.callLog.leadId,
                          leadName: c.cachedName || "",
                          timestamp: callTime,
                          duration: duration,
                          serverUrl: window.location.origin + "/api/mobile/call-logs",
                        });
                        router.refresh();
                      } catch (ignored) {}
                    }, 4000);
                  }
                }
              } else if (uploadRes.status === 404) {
                // Not a CRM lead (e.g. personal contact / family call) - safe to advance cursor
                if (!hasFailure && callTime > highestSuccessTimestamp) {
                  highestSuccessTimestamp = callTime;
                }
              } else {
                // Server returned error (500, 504, pool exhaustion, timeout)
                hasFailure = true;
              }
            }
          } catch (e) {
            // Network failure or fetch exception - do not advance cursor past this call!
            hasFailure = true;
          }
        }

        // Only advance cursor to the latest successfully synced or verified call
        if (highestSuccessTimestamp > minTime) {
          localStorage.setItem("crm_last_synced_call_time", String(highestSuccessTimestamp));
        }

        if (matchedCount > 0) {
          setSyncToast(`📞 Automatically synced ${matchedCount} call${matchedCount > 1 ? "s" : ""} and audio from your phone!`);
          router.refresh();
          setTimeout(() => setSyncToast(null), 6000);
        } else if (force48h) {
          setSyncToast(`✓ Call logs up to date. All recent calls from the last 48 hours are logged.`);
          setTimeout(() => setSyncToast(null), 4000);
        }
      } else if (force48h) {
        setSyncToast(`✓ No calls found on device in the last 48 hours.`);
        setTimeout(() => setSyncToast(null), 4000);
      }

      // Check for unattached past recordings
      await syncUnattachedRecordings();
    } catch (err) {
      console.warn("Auto call sync error:", err);
    } finally {
      isSyncingRef.current = false;
    }
  };

  useEffect(() => {
    // 1. Run sync and storage check on initial load
    checkStorageAccess();
    runSync();

    // 2. Listen for manual sync trigger (e.g. from drawer or button)
    const handleManualSync = () => {
      setSyncToast("🔄 Scanning phone call logs for past 48 hours...");
      runSync(true);
    };
    window.addEventListener("crm_manual_sync_calls", handleManualSync);

    // 3. Run sync whenever user returns to the CRM from their phone dialer
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkStorageAccess();
        runSync();
      }
    };

    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);

    // 4. Periodic check every 25 seconds while in app
    const interval = setInterval(runSync, 25000);

    return () => {
      window.removeEventListener("crm_manual_sync_calls", handleManualSync);
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [userId]);

  return (
    <>
      {/* Storage Access Prompt for Xiaomi HyperOS / Android 14 */}
      {showStoragePrompt && (
        <div className="fixed bottom-20 sm:bottom-5 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-md z-[290] bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 text-white p-3.5 rounded-2xl shadow-2xl border border-amber-500/60 backdrop-blur-md flex items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Disc className="w-4 h-4 text-amber-400 animate-spin" />
            </div>
            <div>
              <p className="font-bold text-white text-[12px] leading-tight">Call Recording Sync Restricted</p>
              <p className="text-[10px] text-amber-200/90 leading-tight mt-0.5">Allow &quot;All files access&quot; so Xiaomi recorder audio uploads to CRM.</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={async () => {
                const cap = (window as any).Capacitor;
                if (cap?.Plugins?.AndroidCallLog?.requestAllFilesAccess) {
                  await cap.Plugins.AndroidCallLog.requestAllFilesAccess();
                }
              }}
              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] transition-colors shadow-xs"
            >
              Allow 🎙️
            </button>
            <button
              type="button"
              onClick={() => setShowStoragePrompt(false)}
              className="p-1 hover:bg-white/10 rounded-lg text-amber-300 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Sync Notification Toast */}
      {syncToast && (
        <div className="fixed top-5 right-5 z-[300] bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-bold animate-in slide-in-from-top-4 border border-emerald-500">
          <PhoneCall className="w-4 h-4 text-emerald-200 animate-bounce" />
          <span className="flex-1">{syncToast}</span>
          <button
            type="button"
            onClick={() => setSyncToast(null)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
