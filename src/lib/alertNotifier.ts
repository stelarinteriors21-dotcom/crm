/**
 * Unified Alert Notification Manager
 * Provides equal notifications across all CRM alerts:
 * 1. Consistent audio playback with error recovery
 * 2. Native browser desktop notifications (Notification API)
 * 3. Mobile device haptic vibration (navigator.vibrate)
 * 4. Document tab title flashing for background tabs
 */

import { sendAlertPushNotification } from "@/app/actions/notificationActions";

export class AlertNotificationManager {
  private static audio: HTMLAudioElement | null = null;
  private static originalTitle: string = typeof document !== "undefined" ? document.title : "Stelar CRM";
  private static titleInterval: NodeJS.Timeout | null = null;
  private static activeAlertsCount: number = 0;
  private static lastPushSentMap: Map<string, number> = new Map();

  private static hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  private static isGlobalMuted: boolean = false;

  public static setGlobalMuted(muted: boolean) {
    this.isGlobalMuted = Boolean(muted);
    if (this.isGlobalMuted) {
      this.stopAudio();
    }
  }

  public static getGlobalMuted(): boolean {
    return this.isGlobalMuted;
  }

  /**
   * Plays the alert sound chime
   */
  public static playAudio() {
    if (this.isGlobalMuted) {
      return; // Admin sound override active: All CRM sounds muted
    }
    try {
      if (typeof window === "undefined") return;
      if (!this.audio) {
        this.audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        this.audio.loop = false;
      }
      this.audio.currentTime = 0;
      const playPromise = this.audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          this.playSynthesizedChime();
        });
      }
    } catch {
      this.playSynthesizedChime();
    }
  }

  /**
   * Generates a pleasant two-tone synthesized chime using Web Audio API
   */
  private static playSynthesizedChime() {
    if (this.isGlobalMuted) {
      return; // Admin sound override active: All CRM sounds muted
    }
    try {
      if (typeof window === "undefined") return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(880, now + 0.15); // A5
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.35); // E6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.2);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.5);
    } catch {}
  }

  /**
   * Stops audio chime
   */
  public static stopAudio() {
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch {}
    }
  }

  /**
   * Dispatches a native desktop notification and device vibration
   */
  public static triggerNativeNotification(title: string, body: string, tag: string = "telecrm_alert") {
    if (typeof window === "undefined") return;

    // 1. Mobile haptic vibration
    if (!this.isGlobalMuted && typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate([250, 100, 250]);
      } catch {}
    }

    // 2. Capacitor native local notification on phone app
    try {
      import("@capacitor/local-notifications").then(async ({ LocalNotifications }) => {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== "granted") {
          await LocalNotifications.requestPermissions();
        }
        const notifId = Math.abs(this.hashCode(tag + title)) % 1000000;
        await LocalNotifications.schedule({
          notifications: [
            {
              id: notifId,
              title,
              body,
              channelId: "default",
              sound: this.isGlobalMuted ? undefined : "default",
              extra: { tag }
            }
          ]
        });
      }).catch(() => {});
    } catch {}

    // 3. Custom AndroidApp webview bridge notification if available
    if (typeof window !== "undefined" && (window as any).AndroidApp?.showNotification) {
      try {
        (window as any).AndroidApp.showNotification(title, body);
      } catch {}
    }

    // 4. Remote FCM Push Notification to phone app (cooldown 45s per tag)
    const lastSent = this.lastPushSentMap.get(tag) || 0;
    const now = Date.now();
    if (now - lastSent > 45000) {
      this.lastPushSentMap.set(tag, now);
      sendAlertPushNotification(title, body, tag).catch((err) => {
        console.warn("sendAlertPushNotification skipped:", err);
      });
    }

    // 5. Browser Desktop Notification
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          const notif = new Notification(title, {
            body,
            icon: "/favicon.ico",
            tag,
            requireInteraction: true,
          });

          notif.onclick = () => {
            window.focus();
            notif.close();
          };
        } catch {}
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
  }

  /**
   * Starts flashing the browser tab title to alert the user even when in another tab
   */
  public static startTitleFlash(alertText: string) {
    if (typeof document === "undefined") return;

    if (!this.originalTitle || this.originalTitle.startsWith("🔔") || this.originalTitle.startsWith("🚨")) {
      this.originalTitle = "Stelar CRM";
    }

    if (this.titleInterval) {
      clearInterval(this.titleInterval);
    }

    let toggle = false;
    this.titleInterval = setInterval(() => {
      toggle = !toggle;
      document.title = toggle ? `🔔 ${alertText}` : this.originalTitle;
    }, 1200);
  }

  /**
   * Stops flashing the browser tab title and restores original title
   */
  public static stopTitleFlash() {
    if (this.titleInterval) {
      clearInterval(this.titleInterval);
      this.titleInterval = null;
    }
    if (typeof document !== "undefined" && this.originalTitle) {
      document.title = this.originalTitle;
    }
  }

  /**
   * Full equal notification burst (Sound + Native Notification + Title Flash + Vibration)
   */
  public static dispatchEqualAlert({
    title,
    body,
    tag,
    titleFlashText,
  }: {
    title: string;
    body: string;
    tag: string;
    titleFlashText: string;
  }) {
    this.playAudio();
    this.triggerNativeNotification(title, body, tag);
    this.startTitleFlash(titleFlashText);
  }

  /**
   * Dismiss alert sounds and restore tab title
   */
  public static dismissEqualAlert() {
    this.stopAudio();
    this.stopTitleFlash();
  }
}
