"use client";

import { useEffect } from "react";
import { saveFcmToken } from "@/app/actions/authActions";
import { AlertNotificationManager } from "@/lib/alertNotifier";

export default function PushNotificationInitializer({ userId }: { userId?: string }) {
  useEffect(() => {
    let unmounted = false;

    const setupPush = async () => {
      try {
        if (typeof window === "undefined") return;

        // 1. Check custom AndroidApp Webview bridge (stelar-android-sync)
        if ((window as any).AndroidApp) {
          if (userId && (window as any).AndroidApp.setUserId) {
            (window as any).AndroidApp.setUserId(userId);
          }
          if ((window as any).AndroidApp.getFcmToken) {
            const token = (window as any).AndroidApp.getFcmToken();
            if (token) {
              await saveFcmToken(token);
            }
          }
          return;
        }

        // 2. Capacitor Push Notifications
        const { PushNotifications } = await import("@capacitor/push-notifications");
        
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === "prompt") {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive === "granted") {
          // Register high-priority channel on Android
          try {
            await PushNotifications.createChannel({
              id: "default",
              name: "General Alerts",
              description: "CRM Alerts, Follow-ups, and Task Notifications",
              importance: 5,
              visibility: 1,
              sound: "default",
              vibration: true,
            });
          } catch (e) {
            console.warn("Could not create push channel:", e);
          }

          await PushNotifications.register();

          PushNotifications.removeAllListeners();

          PushNotifications.addListener("registration", async (token) => {
            if (!unmounted && token?.value) {
              await saveFcmToken(token.value);
            }
          });

          PushNotifications.addListener("registrationError", (err) => {
            console.warn("Push registration error: ", err);
          });

          PushNotifications.addListener("pushNotificationReceived", (notification) => {
            console.log("Foreground push notification received: ", notification);
            // Equal notification: play sound and vibrate
            AlertNotificationManager.playAudio();
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              try {
                navigator.vibrate([250, 100, 250]);
              } catch {}
            }
          });

          PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
            console.log("Push action performed: ", action);
            if (typeof window !== "undefined") {
              window.focus();
            }
          });
        }

        // 3. Request LocalNotifications permission as well
        try {
          const { LocalNotifications } = await import("@capacitor/local-notifications");
          const localPerm = await LocalNotifications.checkPermissions();
          if (localPerm.display === "prompt") {
            await LocalNotifications.requestPermissions();
          }
        } catch {}
      } catch (e) {
        // Not running on native device or push not supported in web simulator
        console.debug("Push notification setup skipped on current platform:", e);
      }
    };

    setupPush();

    return () => {
      unmounted = true;
    };
  }, [userId]);

  return null;
}
