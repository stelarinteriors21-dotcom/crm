/**
 * WhatsApp Notification Sound & Haptics Engine
 * Provides authentic, crisp WhatsApp-style notification chimes using the Web Audio API.
 * Guarantees zero latency, zero external asset dependency, and zero network failures.
 */

class WhatsAppSoundEngine {
  private static audioCtx: AudioContext | null = null;
  private static originalTitle: string = typeof document !== "undefined" ? document.title : "Stelar CRM";
  private static flashInterval: any = null;

  private static getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.audioCtx || this.audioCtx.state === "closed") {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Plays the signature WhatsApp notification chime
   * Consists of a bright, harmonic dual-tone chime (G5 -> C6) with warm marimba acoustics.
   */
  public static playChime(options?: { volume?: number }) {
    if (typeof window === "undefined") return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const masterVol = options?.volume ?? 0.35;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(masterVol, now);
      masterGain.connect(ctx.destination);

      // Note 1: Bright introductory "pop" (G5: 784 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(783.99, now); // G5
      osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.08); // slight bend

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(1.0, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.18);

      // Note 2: Cheerful WhatsApp chime tone (C6: 1046.5 Hz + overtone E6: 1318.5 Hz)
      const note2Start = now + 0.09;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1046.5, note2Start); // C6

      // Harmonic warmth overtone
      const osc2Harmonic = ctx.createOscillator();
      const gain2Harmonic = ctx.createGain();
      osc2Harmonic.type = "triangle";
      osc2Harmonic.frequency.setValueAtTime(1318.51, note2Start); // E6

      gain2.gain.setValueAtTime(0.001, note2Start);
      gain2.gain.linearRampToValueAtTime(1.0, note2Start + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, note2Start + 0.45);

      gain2Harmonic.gain.setValueAtTime(0.001, note2Start);
      gain2Harmonic.gain.linearRampToValueAtTime(0.3, note2Start + 0.02);
      gain2Harmonic.gain.exponentialRampToValueAtTime(0.0001, note2Start + 0.35);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2Harmonic.connect(gain2Harmonic);
      gain2Harmonic.connect(masterGain);

      osc2.start(note2Start);
      osc2.stop(note2Start + 0.48);
      osc2Harmonic.start(note2Start);
      osc2Harmonic.stop(note2Start + 0.4);

      // Mobile haptic pulse: short crisp WhatsApp vibration (100ms)
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        try {
          navigator.vibrate([80, 50, 120]);
        } catch {}
      }
    } catch (e) {
      console.warn("Could not play WhatsApp synthesized chime:", e);
    }
  }

  /**
   * Dispatches native browser push notification
   */
  public static triggerDesktopNotification(params: {
    senderName: string;
    senderPhone?: string;
    message: string;
    leadId: string;
    onClick?: () => void;
  }) {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "granted") {
      try {
        const notif = new Notification(`💬 WhatsApp: ${params.senderName}`, {
          body: params.message.length > 90 ? `${params.message.slice(0, 90)}...` : params.message,
          icon: "/favicon.ico",
          tag: `wa_${params.leadId}`,
          badge: "/favicon.ico"
        });

        notif.onclick = () => {
          window.focus();
          if (params.onClick) {
            params.onClick();
          } else {
            window.location.href = `/whatsapp?leadId=${params.leadId}`;
          }
          notif.close();
        };
      } catch (err) {
        console.warn("Desktop notification trigger failed:", err);
      }
    } else if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }

  /**
   * Flashes page tab title: "💬 (1) Rahul Sharma: Hi... | Stelar CRM"
   */
  public static flashTabTitle(senderName: string, snippet: string) {
    if (typeof document === "undefined") return;

    if (this.flashInterval) {
      clearInterval(this.flashInterval);
    }

    const cleanSnippet = snippet.length > 25 ? `${snippet.slice(0, 22)}...` : snippet;
    const alertTitle = `💬 ${senderName}: "${cleanSnippet}"`;
    const defaultTitle = "Stelar CRM";

    let state = false;
    this.flashInterval = setInterval(() => {
      state = !state;
      document.title = state ? alertTitle : defaultTitle;
    }, 1100);

    // Stop flashing when window gets focused
    const stopOnFocus = () => {
      if (this.flashInterval) {
        clearInterval(this.flashInterval);
        this.flashInterval = null;
      }
      document.title = defaultTitle;
      window.removeEventListener("focus", stopOnFocus);
      window.removeEventListener("click", stopOnFocus);
    };

    window.addEventListener("focus", stopOnFocus, { once: true });
    window.addEventListener("click", stopOnFocus, { once: true });
  }

  /**
   * Request browser notification permission explicitly
   */
  public static async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return "denied";
    }
  }
}

export default WhatsAppSoundEngine;
