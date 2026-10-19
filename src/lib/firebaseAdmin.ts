import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import serviceAccountJson from "./firebase-server-key.json";
import prisma from "@/lib/prisma";

if (!getApps().length && (serviceAccountJson as any)?.project_id) {
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
    if (!getApps().length) {
      return { success: false, reason: "Firebase Admin not initialized" };
    }
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
  } catch (error: any) {
    console.error("Firebase send push notification error", error?.message || error);
    return { success: false, error: error?.message || "Failed to send notification" };
  }
};

export const sendPushToUser = async (userId: string, title: string, body: string, data?: Record<string, string>) => {
  try {
    if (!userId) return { success: false, reason: "No userId provided" };
    if (!getApps().length) {
      return { success: false, reason: "Firebase Admin not initialized" };
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true, name: true }
    });
    if (user?.fcmToken) {
      return await sendPushNotification(user.fcmToken, title, body, data);
    }
    return { success: false, reason: "User has no registered fcmToken" };
  } catch (error: any) {
    console.error("Error in sendPushToUser:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send push to user" };
  }
};

export const sendPushToUsers = async (userIds: string[], title: string, body: string, data?: Record<string, string>) => {
  try {
    if (!userIds || userIds.length === 0) return { success: false };
    if (!getApps().length) {
      return { success: false, reason: "Firebase Admin not initialized" };
    }
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fcmToken: true }
    });
    const promises = users
      .filter(u => Boolean(u.fcmToken))
      .map(u => sendPushNotification(u.fcmToken!, title, body, data));
    await Promise.allSettled(promises);
    return { success: true };
  } catch (error: any) {
    console.error("Error in sendPushToUsers:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send push to users" };
  }
};
