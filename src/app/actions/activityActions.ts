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

  const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes max gap

  const stats: Record<string, { name: string; lastActivity: Date; activeMinutes: number; totalActions: number; lastLogTime: Date }> = {};

  for (const log of logs) {
    if (!stats[log.userId]) {
      stats[log.userId] = {
        name: log.user.name,
        lastActivity: log.createdAt,
        activeMinutes: 1, // base 1 minute for their first action
        totalActions: 0,
        lastLogTime: log.createdAt,
      };
    }

    const stat = stats[log.userId];
    
    // Only calculate gap if this isn't the very first action
    if (stat.totalActions > 0) {
      const gapMs = log.createdAt.getTime() - stat.lastLogTime.getTime();

      // If gap is less than timeout, add to active minutes
      if (gapMs < SESSION_TIMEOUT_MS) {
        stat.activeMinutes += gapMs / 60000;
      } else {
        // If gap is large, we assume they were inactive. 
        // Add a base 1 minute for this new solitary action just so it counts.
        stat.activeMinutes += 1;
      }
    }

    stat.lastLogTime = log.createdAt;
    stat.lastActivity = log.createdAt;
    stat.totalActions += 1;
  }

  return Object.values(stats).map(stat => ({
    name: stat.name,
    lastActivity: stat.lastActivity,
    activeMinutes: Math.round(stat.activeMinutes),
    totalActions: stat.totalActions,
  }));
}
