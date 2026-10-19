"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { sendPushToUser, sendPushToUsers } from "@/lib/firebaseAdmin";

/**
 * Server action to send a phone push notification to the currently logged in user
 * Used when foreground/client alerts trigger (e.g. RNR, Follow-ups, Action Required)
 */
export async function sendAlertPushNotification(title: string, body: string, tag?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, reason: "Unauthenticated" };

    const result = await sendPushToUser(user.id, title, body, {
      tag: tag || "telecrm_alert",
      timestamp: new Date().toISOString()
    });

    return result;
  } catch (error: any) {
    console.error("sendAlertPushNotification error:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send notification" };
  }
}

/**
 * Server action to send push notification to any specific user by ID
 */
export async function sendPushNotificationToUser(userId: string, title: string, body: string, tag?: string) {
  try {
    if (!userId) return { success: false, reason: "No userId provided" };
    const result = await sendPushToUser(userId, title, body, {
      tag: tag || "telecrm_alert",
      timestamp: new Date().toISOString()
    });
    return result;
  } catch (error: any) {
    console.error("sendPushNotificationToUser error:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send push to user" };
  }
}

/**
 * Server action to send push notification to all users of an organization or role
 */
export async function sendPushNotificationToRole(role: string, title: string, body: string, tag?: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, reason: "Unauthenticated" };

    const users = await prisma.user.findMany({
      where: {
        organizationId: currentUser.organizationId,
        role: role as any,
        fcmToken: { not: null }
      },
      select: { id: true }
    });

    if (users.length === 0) return { success: true, count: 0 };

    const result = await sendPushToUsers(
      users.map(u => u.id),
      title,
      body,
      { tag: tag || "telecrm_alert", timestamp: new Date().toISOString() }
    );

    return result;
  } catch (error: any) {
    console.error("sendPushNotificationToRole error:", error?.message || error);
    return { success: false, error: error?.message || "Failed to send push to role" };
  }
}
