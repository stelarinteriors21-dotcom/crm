"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";

export async function logActivity(action: string, details?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action,
        details: details || null,
      },
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}

export async function getTeamActivities(page = 1, limit = 50) {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.activityLog.findMany({
    where: {
      user: {
        organizationId: user.organizationId,
      },
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip: (page - 1) * limit,
    take: limit,
  });
}

export async function getUserInvolvementStats() {
  const user = await getCurrentUser();
  if (!user) return [];

  // Group by user, get their first and last activity for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const logs = await prisma.activityLog.findMany({
    where: {
      user: { organizationId: user.organizationId },
      createdAt: { gte: today },
    },
    include: {
      user: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "asc" }
  });

  // Calculate session times per user
  const stats: Record<string, { name: string; firstActivity: Date; lastActivity: Date; totalActions: number }> = {};

  for (const log of logs) {
    if (!stats[log.userId]) {
      stats[log.userId] = {
        name: log.user.name,
        firstActivity: log.createdAt,
        lastActivity: log.createdAt,
        totalActions: 0,
      };
    }
    stats[log.userId].lastActivity = log.createdAt;
    stats[log.userId].totalActions += 1;
  }

  // Convert to array and calculate duration in minutes
  return Object.values(stats).map(stat => {
    const durationMs = stat.lastActivity.getTime() - stat.firstActivity.getTime();
    const durationMinutes = Math.round(durationMs / 60000);
    return {
      name: stat.name,
      firstActivity: stat.firstActivity,
      lastActivity: stat.lastActivity,
      activeMinutes: durationMinutes,
      totalActions: stat.totalActions,
    };
  });
}
