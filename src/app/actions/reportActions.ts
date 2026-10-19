"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";

export async function getTeamTasksData() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ROOT") throw new Error("Unauthorized");

  const orgId = user.organizationId;

  // Get all users
  const teamUsers = await prisma.user.findMany({
    where: { 
      organizationId: orgId,
      id: { not: user.id }
    },
    select: {
      id: true,
      name: true,
      role: true,
    }
  });

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

  const report = teamUsers.map(teamUser => {
    let pendingTasks = [];
    
    if (teamUser.role === "TELECALLER" || teamUser.role === "ADMIN") {
      pendingTasks = activeLeads.filter(l => l.assignedToId === teamUser.id).map(l => ({
        id: l.id,
        name: l.name,
        type: "Call / Follow-up",
        status: l.status || "NEW"
      }));
    } else if (teamUser.role === "SITE_VISITOR") {
      pendingTasks = scheduledSiteVisits.map(l => ({
        id: l.id,
        name: l.name,
        type: "Site Visit",
        status: "Scheduled"
      }));
    }

    return {
      user: teamUser,
      pendingCount: pendingTasks.length,
      tasks: pendingTasks
    };
  });

  return report;
}
