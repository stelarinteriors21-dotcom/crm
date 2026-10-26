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
      .map(c => {
        const cf = (c.lead?.customFields as any) || {};
        return {
          id: c.id,
          leadId: c.leadId,
          leadName: c.lead?.name || "Unknown Lead",
          leadPhone: c.lead?.phone || "",
          leadStatus: c.lead?.status || "Contacted",
          leadSource: c.lead?.source || cf.leadSource || "MANUAL",
          city: c.lead?.city || cf.city || "—",
          budget: c.lead?.budget || cf["what_is_your_approximate_budget_range?"] || cf.approximateBudget || "—",
          typeOfSpace: cf["what_type_of_space_are_you_looking_to_design?"] || cf.typeOfSpace || "—",
          followUpReason: cf.lastFollowUpNote || cf.staleFollowUpReason || (c.lead?.status === "follow up" ? "Follow-up" : "—"),
          followUpDate: cf.followUpDate ? new Date(cf.followUpDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—",
          siteVisit: cf.siteVisit?.date ? `${cf.siteVisit.date} ${cf.siteVisit.time || ""} [${cf.siteVisit.type || "Scheduled"}]` : "—",
          duration: c.duration,
          durationFormatted: formatCallDuration(c.duration),
          notes: c.notes,
          recordingUrl: c.recordingUrl,
          createdAt: c.createdAt.toISOString()
        };
      });

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

export async function getDetailedReportData(timeframe: "weekly" | "monthly" | "daily" | "all" = "weekly") {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) {
    throw new Error("Unauthorized");
  }

  const orgId = user.organizationId;
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date();

  if (timeframe === "daily") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  } else if (timeframe === "weekly") {
    // Last 7 days
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
  } else if (timeframe === "monthly") {
    // Current month from 1st
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  } else {
    // All time (past 1 year)
    startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0);
  }

  // Get all users in organization
  const teamUsers = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, role: true, email: true },
    orderBy: { name: "asc" }
  });

  // Get call logs in date range
  const callLogs = await prisma.callLog.findMany({
    where: {
      user: { organizationId: orgId },
      createdAt: { gte: startDate, lte: endDate }
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          source: true,
          city: true,
          budget: true,
          propertyStatus: true,
          customFields: true,
          createdAt: true,
          assignedTo: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Get active leads with tasks
  const activeLeads = await prisma.lead.findMany({
    where: {
      organizationId: orgId,
      status: { notIn: ["JUNK", "LOST", "WON", "NOT_INTERESTED"] }
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      tasks: { where: { isCompleted: false }, orderBy: { dueDate: "asc" } }
    }
  });

  const detailedCalls = callLogs.map((c, index) => {
    const cf = (c.lead?.customFields as any) || {};
    const duration = c.duration || 0;
    const isConnected = duration > 0 || !!c.recordingUrl;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durationFormatted = duration > 0 ? (mins > 0 ? `${mins}m ${secs}s` : `${secs}s`) : "0s (Missed / Unanswered)";

    let followUpReason = cf.lastFollowUpNote || cf.staleFollowUpReason || "";
    if (!followUpReason && (c.lead?.status || "").toLowerCase().includes("follow")) {
      followUpReason = "Follow-up";
    }

    let siteVisitStr = "";
    if (cf.siteVisit && cf.siteVisit.date) {
      siteVisitStr = `${cf.siteVisit.date} ${cf.siteVisit.time || ""} (${cf.siteVisit.type || "Scheduled"})`;
    }

    return {
      slNo: index + 1,
      callId: c.id,
      callDateTime: c.createdAt.toISOString(),
      callDateTimeFormatted: new Date(c.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      callerName: c.user?.name || "Unknown Caller",
      callerRole: c.user?.role || "TELECALLER",
      leadName: c.lead?.name || "Unknown Lead",
      leadPhone: c.lead?.phone || "",
      leadEmail: c.lead?.email || "",
      leadStatus: c.lead?.status || "Contacted",
      leadSource: c.lead?.source || cf.leadSource || "MANUAL",
      city: c.lead?.city || cf.city || "—",
      approximateBudget: c.lead?.budget || cf["what_is_your_approximate_budget_range?"] || cf.approximateBudget || "—",
      typeOfSpace: cf["what_type_of_space_are_you_looking_to_design?"] || cf.typeOfSpace || "—",
      propertyStatus: c.lead?.propertyStatus || cf["what_is_the_current_status_of_your_property?"] || "—",
      callStatus: isConnected ? "Connected" : "Missed / No Response",
      durationSeconds: duration,
      durationFormatted,
      followUpReason: followUpReason || "—",
      followUpDate: cf.followUpDate ? new Date(cf.followUpDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—",
      siteVisit: siteVisitStr || "—",
      notes: c.notes || "—",
      recordingUrl: c.recordingUrl || ""
    };
  });

  // Calculate team summaries
  const teamSummary = teamUsers.map(member => {
    const memberCalls = callLogs.filter(c => c.userId === member.id);
    const connectedCalls = memberCalls.filter(c => (c.duration || 0) > 0 || !!c.recordingUrl);
    const missedCalls = memberCalls.filter(c => (c.duration || 0) === 0 && !c.recordingUrl);
    const totalSecs = memberCalls.reduce((acc, c) => acc + (c.duration || 0), 0);
    const totalMins = Math.floor(totalSecs / 60);
    const remainingSecs = totalSecs % 60;
    const hours = Math.floor(totalMins / 60);
    const displayMins = totalMins % 60;
    const totalTalkTimeFormatted = hours > 0 ? `${hours}h ${displayMins}m ${remainingSecs}s` : `${totalMins}m ${remainingSecs}s`;
    const avgSecs = connectedCalls.length > 0 ? Math.round(totalSecs / connectedCalls.length) : 0;
    const avgFormatted = `${Math.floor(avgSecs / 60)}m ${avgSecs % 60}s`;

    let siteVisitsScheduled = 0;
    let siteVisitsCompleted = 0;
    let quotationsSent = 0;
    let leadsWon = 0;

    activeLeads.filter(l => l.assignedToId === member.id).forEach(l => {
      const cf = (l.customFields as any) || {};
      if (cf.siteVisit) {
        if (cf.siteVisit.type === "Scheduled" || cf.siteVisit.type === "Rescheduled") siteVisitsScheduled++;
        if (cf.siteVisit.type === "Done") siteVisitsCompleted++;
      }
      const st = (l.status || "").toLowerCase();
      if (st.includes("quotation") || cf.quotationShared) quotationsSent++;
      if (st === "won" || st.includes("won") || st.includes("advance")) leadsWon++;
    });

    return {
      callerName: member.name,
      role: member.role,
      email: member.email,
      totalCalls: memberCalls.length,
      connectedCalls: connectedCalls.length,
      missedCalls: missedCalls.length,
      totalTalkTimeFormatted,
      totalTalkTimeSeconds: totalSecs,
      avgCallDuration: avgFormatted,
      assignedLeadsCount: activeLeads.filter(l => l.assignedToId === member.id).length,
      siteVisitsScheduled,
      siteVisitsCompleted,
      quotationsSent,
      leadsWon
    };
  });

  const pendingTasks = activeLeads.flatMap(l => {
    const cf = (l.customFields as any) || {};
    return l.tasks.map(t => ({
      leadName: l.name,
      leadPhone: l.phone,
      callerName: l.assignedTo?.name || "Unassigned",
      leadStatus: l.status || "NEW",
      taskTitle: t.title,
      dueDate: new Date(t.dueDate).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      city: l.city || cf.city || "—",
      budget: l.budget || cf["what_is_your_approximate_budget_range?"] || "—",
      followUpReason: cf.lastFollowUpNote || cf.staleFollowUpReason || "—"
    }));
  });

  const startFormatted = startDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });
  const endFormatted = endDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" });

  return {
    timeframe,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    startDateFormatted: startFormatted,
    endDateFormatted: endFormatted,
    calls: detailedCalls,
    teamSummary,
    pendingTasks
  };
}
