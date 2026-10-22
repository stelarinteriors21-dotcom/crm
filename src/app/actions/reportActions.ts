"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";

function formatCallDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s (Missed / Unanswered)";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export async function getTeamTasksData() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) {
    throw new Error("Unauthorized");
  }

  const orgId = user.organizationId;

  // Get all users in organization (excluding the current user to display team members)
  const teamUsers = await prisma.user.findMany({
    where: { 
      organizationId: orgId,
      id: { not: user.id }
    },
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: { name: "asc" }
  });

  const teamUserIds = teamUsers.map(u => u.id);

  // Get all active leads to calculate pending tasks
  const activeLeads = await prisma.lead.findMany({
    where: { 
      organizationId: orgId,
      status: { notIn: ["JUNK", "LOST", "WON", "NOT_INTERESTED"] }
    }
  });

  // Get scheduled site visits
  const scheduledSiteVisits = activeLeads.filter((l: any) => {
    const sv = l.customFields?.siteVisit;
    return sv && (sv.type === "Scheduled" || sv.type === "Rescheduled");
  });

  // Get all call logs made by team members
  const callLogs = await prisma.callLog.findMany({
    where: {
      userId: { in: teamUserIds }
    },
    include: {
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const report = teamUsers.map(teamUser => {
    let pendingTasks = [];
    
    if (teamUser.role === "TELECALLER" || teamUser.role === "ADMIN") {
      pendingTasks = activeLeads.filter(l => l.assignedToId === teamUser.id).map(l => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        type: "Call / Follow-up",
        status: l.status || "NEW"
      }));
    } else if (teamUser.role === "SITE_VISITOR") {
      pendingTasks = scheduledSiteVisits.map(l => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        type: "Site Visit",
        status: (l.customFields as any)?.siteVisit?.type || "Scheduled"
      }));
    }

    // Calls made by this team member
    const userCalls = callLogs
      .filter(c => c.userId === teamUser.id)
      .map(c => ({
        id: c.id,
        leadId: c.leadId,
        leadName: c.lead?.name || "Unknown Lead",
        leadPhone: c.lead?.phone || "",
        leadStatus: c.lead?.status || "Contacted",
        duration: c.duration,
        durationFormatted: formatCallDuration(c.duration),
        notes: c.notes,
        recordingUrl: c.recordingUrl,
        createdAt: c.createdAt.toISOString()
      }));

    return {
      user: teamUser,
      pendingCount: pendingTasks.length,
      tasks: pendingTasks,
      callsCount: userCalls.length,
      calls: userCalls
    };
  });

  return report;
}
