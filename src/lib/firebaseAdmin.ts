import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import serviceAccountJson from "./firebase-server-key.json";

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(serviceAccountJson as any)
    });
  } catch (error) {
    console.error("Firebase admin initialization error", error);
  }
}

export const sendPushNotification = async (token: string, title: string, body: string, data?: Record<string, string>) => {
  try {
    const message = {
      notification: { title, body },
      token,
      data: data || {},
      android: {
        priority: "high" as const,
        notification: {
          channelId: "default",
          sound: "default",
          defaultSound: true,
          defaultVibrateTimings: true
        }
      }
    };
    await getMessaging().send(message);
    return { success: true };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error };
  }
};
