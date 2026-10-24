"use client";

import { useEffect } from "react";
import { AlertNotificationManager } from "@/lib/alertNotifier";

export default function GlobalSoundWatcher({ initialMuted = false }: { initialMuted?: boolean }) {
  useEffect(() => {
    // 1. Initialize alert notifier with initial server state
    AlertNotificationManager.setGlobalMuted(initialMuted);

    let isMounted = true;

    // 2. Poll server periodically to sync sound override across all active users
    const syncSoundState = async () => {
      try {
        const res = await fetch("/api/settings/sound", { cache: "no-store" });
        if (res.ok && isMounted) {
          const data = await res.json();
          const serverMuted = Boolean(data.muted);
          const currentMuted = AlertNotificationManager.getGlobalMuted();
          
          if (serverMuted !== currentMuted) {
            AlertNotificationManager.setGlobalMuted(serverMuted);
            window.dispatchEvent(new CustomEvent("crm_global_sound_changed", { detail: { muted: serverMuted } }));
          }
        }
      } catch {
        // Ignore network glitches
      }
    };

    // Poll every 15s
    const interval = setInterval(syncSoundState, 15000);

    // Also sync whenever the window regains focus
    const handleFocus = () => {
      syncSoundState();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [initialMuted]);

  return null;
}
