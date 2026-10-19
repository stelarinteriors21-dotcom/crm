"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";

export type PeriodFilter = "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME";
export type LeadCohortFilter = "ALL" | "NEW_ONLY" | "EXISTING";

export async function getAdminComprehensiveReport(
  period: PeriodFilter = "DAILY",
  leadCohort: LeadCohortFilter = "ALL",
  startDateStr?: string,
  endDateStr?: string
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Unauthorized");
  if (currentUser.role !== "ADMIN" && currentUser.role !== "ROOT") {
    throw new Error("Admin privileges required");
  }

  const orgId = currentUser.organizationId;
  const now = new Date();

  // 1. Calculate Date Range Boundaries
  let rangeStart: Date;
  let rangeEnd: Date = new Date();

  if (startDateStr && endDateStr) {
    rangeStart = new Date(startDateStr);
    rangeStart.setHours(0, 0, 0, 0);
    rangeEnd = new Date(endDateStr);
    rangeEnd.setHours(23, 59, 59, 999);
  } else if (period === "DAILY") {
    rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  } else if (period === "WEEKLY") {
    rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    rangeStart.setHours(0, 0, 0, 0);
  } else if (period === "MONTHLY") {
    rangeStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  } else {
    // ALL_TIME: last 1 year
    rangeStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0);
  }

  // 2. Fetch Users in Organization
  const teamMembers = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  // 3. Fetch All Leads with filters
  const leadWhere: any = {
    organizationId: orgId,
  };

  if (leadCohort === "NEW_ONLY") {
    leadWhere.createdAt = { gte: rangeStart, lte: rangeEnd };
  } else if (leadCohort === "EXISTING") {
    leadWhere.createdAt = { lt: rangeStart };
  }

  const leads = await prisma.lead.findMany({
    where: leadWhere,
    include: {
      assignedTo: { select: { id: true, name: true, role: true } },
      calls: {
        where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
        include: { user: { select: { id: true, name: true } } },
      },
      notes: {
        where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
      },
      whatsAppLogs: {
        where: { createdAt: { gte: rangeStart, lte: rangeEnd } },
      },
    },
  });

  // 4. Fetch Activity Logs in Range
  const rawActivityLogs = await prisma.activityLog.findMany({
    where: {
      user: { organizationId: orgId },
      createdAt: { gte: rangeStart, lte: rangeEnd },
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  // 5. Calculate Per-User Performance Metrics
  const userPerformance = teamMembers.map((member) => {
    // Member's calls in this period
    let userCalls = 0;
    let callDurationSecs = 0;
    let notesCount = 0;
    let siteVisitsScheduled = 0;
    let siteVisitsCompleted = 0;
    let quotationsSent = 0;
    let leadsWon = 0;
    let leadsAssigned = 0;
    let activeFollowUps = 0;

    leads.forEach((l) => {
      // Calls logged by this user
      l.calls.forEach((c) => {
        if (c.userId === member.id) {
          userCalls++;
          callDurationSecs += c.duration || 0;
          if (c.notes && c.notes.trim()) notesCount++;
        }
      });

      // Notes on leads assigned to user
      if (l.assignedToId === member.id) {
        leadsAssigned++;
        notesCount += l.notes.length;

        const cf = (l.customFields as any) || {};
        if (cf.siteVisit) {
          if (cf.siteVisit.type === "Scheduled" || cf.siteVisit.type === "Rescheduled") {
            siteVisitsScheduled++;
          } else if (cf.siteVisit.type === "Done") {
            siteVisitsCompleted++;
          }
        }

        const st = (l.status || "").toLowerCase();
        if (st.includes("quotation") || cf.quotationShared) {
          quotationsSent++;
        }
        if (st === "won" || st.includes("won") || st.includes("advance")) {
          leadsWon++;
        }
        if (st === "follow up" || st.includes("follow")) {
          activeFollowUps++;
        }
      }
    });

    const m = Math.floor(callDurationSecs / 60);
    const s = callDurationSecs % 60;
    const durationFormatted = `${m}m ${s}s`;

    return {
      userId: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      userCalls,
      durationFormatted,
      callDurationSecs,
      notesCount,
      siteVisitsScheduled,
      siteVisitsCompleted,
      quotationsSent,
      leadsWon,
      leadsAssigned,
      activeFollowUps,
    };
  });

  // 6. Calculate Detailed Escalation Analysis
  // Find all leads with escalation flags, SLA breaches, and rule violations
  const nowMs = Date.now();
  const escalationItems: any[] = [];

  const allActiveOrgLeads = await prisma.lead.findMany({
    where: {
      organizationId: orgId,
      status: { notIn: ["JUNK", "LOST"] },
    },
    include: {
      assignedTo: { select: { id: true, name: true, role: true } },
      calls: { orderBy: { createdAt: "desc" }, take: 2 },
    },
  });

  allActiveOrgLeads.forEach((l) => {
    const cf = (l.customFields as any) || {};
    const assignedUser = l.assignedTo?.name || "Unassigned";
    const assignedUserId = l.assignedTo?.id || "unassigned";

    // Escalation 1: Missed Follow-Up (> 8 hours overdue or past scheduled day)
    if (cf.followUpDate) {
      const fTime = new Date(cf.followUpDate).getTime();
      const overdueMs = nowMs - fTime;
      if (overdueMs > 8 * 60 * 60 * 1000) {
        escalationItems.push({
          id: `esc-followup-${l.id}`,
          leadId: l.id,
          leadName: l.name,
          phone: l.phone,
          status: l.status,
          assignedUser,
          assignedUserId,
          category: "MISSED_FOLLOWUP",
          categoryLabel: "Missed Daily Follow-up",
          severity: "HIGH",
          details: `Scheduled follow-up was ${new Date(cf.followUpDate).toLocaleDateString()} at ${new Date(cf.followUpDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Overdue by ${Math.floor(overdueMs / (1000 * 60 * 60))} hours with no call logged.`,
          actionRequired: "Caller must dial client and update lead status immediately.",
        });
      }
    }

    // Escalation 2: Ghosted Lead (Accepted > 2 hours ago with 0 calls logged)
    if (l.assignedAt && l.calls.length === 0) {
      const assignedMs = new Date(l.assignedAt).getTime();
      const ghostedHours = Math.floor((nowMs - assignedMs) / (1000 * 60 * 60));
      if (ghostedHours >= 2) {
        const cf = (l.customFields as any) || {};
        const isReassigned = !!l.previousAssigneeId || !!cf.isReassigned || !!cf.reassignedAt;
        const sLower = (l.status || "").trim().toLowerCase();
        const isFollowUp = sLower === "follow up" || sLower === "followup";

        if (!isReassigned || isFollowUp) {
          escalationItems.push({
            id: `esc-ghosted-${l.id}`,
            leadId: l.id,
            leadName: l.name,
            phone: l.phone,
            status: l.status,
            assignedUser,
            assignedUserId,
            category: "GHOSTED_CONTACT",
            categoryLabel: "Ghosted Contact (0 Calls in 2h)",
            severity: "CRITICAL",
            details: `Lead accepted ${ghostedHours} hours ago, but 0 phone calls have been logged. Caller has not initiated first contact.`,
            actionRequired: "Admin intervention / reassign lead or enforce dial.",
          });
        }
      }
    }

    // Escalation 3: Unverified Site Visit (> 4 hours passed appointment time without OTP)
    if (cf.siteVisit && (cf.siteVisit.type === "Scheduled" || cf.siteVisit.type === "Rescheduled") && cf.siteVisit.date) {
      const svTime = new Date(`${cf.siteVisit.date}T${cf.siteVisit.time || '14:00'}`).getTime();
      if (nowMs - svTime > 4 * 60 * 60 * 1000) {
        escalationItems.push({
          id: `esc-sv-${l.id}`,
          leadId: l.id,
          leadName: l.name,
          phone: l.phone,
          status: l.status,
          assignedUser,
          assignedUserId,
          category: "UNVERIFIED_SITE_VISIT",
          categoryLabel: "Unverified Site Visit (> 4h Past Due)",
          severity: "HIGH",
          details: `Site visit was scheduled for ${cf.siteVisit.date} at ${cf.siteVisit.time || '14:00'}. The scheduled appointment passed 4+ hours ago without OTP verification.`,
          actionRequired: "Field Executive must verify physical OTP or explain site status.",
        });
      }
    }

    // Escalation 4: Post-Site Visit Silence (> 48 hours completed with no Quotation)
    if (cf.siteVisit && cf.siteVisit.type === "Done" && cf.siteVisit.verifiedAt) {
      const verifiedTime = new Date(cf.siteVisit.verifiedAt).getTime();
      const hoursSinceVisit = Math.floor((nowMs - verifiedTime) / (1000 * 60 * 60));
      if (hoursSinceVisit > 48) {
        const st = (l.status || "").toLowerCase();
        if (!st.includes("quotation") && !st.includes("won") && !st.includes("negotiation")) {
          escalationItems.push({
            id: `esc-postsv-${l.id}`,
            leadId: l.id,
            leadName: l.name,
            phone: l.phone,
            status: l.status,
            assignedUser,
            assignedUserId,
            category: "POST_VISIT_NEGLECT",
            categoryLabel: "Post-Site Visit Silence (> 48h)",
            severity: "MEDIUM",
            details: `Site visit completed ${hoursSinceVisit} hours ago, but lead status was never advanced to Quotation Shared or Negotiation. Client interest is cooling off.`,
            actionRequired: "Share interior quotation & 3D estimate link immediately.",
          });
        }
      }
    }

    // Escalation 5: Endless Follow-up Trap (>= 5 follow-ups without moving forward)
    if (cf.followUpCount >= 5 && l.status === "follow up") {
      escalationItems.push({
        id: `esc-hoarding-${l.id}`,
        leadId: l.id,
        leadName: l.name,
        phone: l.phone,
        status: l.status,
        assignedUser,
        assignedUserId,
        category: "ENDLESS_FOLLOWUP",
        categoryLabel: "Endless Follow-up Trap (5+ Retries)",
        severity: "MEDIUM",
        details: `Caller has pushed this lead to follow-up ${cf.followUpCount} consecutive times without advancing to Site Visit or Quotation. Possible lead hoarding.`,
        actionRequired: "Review call recording notes or reassign to senior closer.",
      });
    }
  });

  // Group escalations by user for the summary accordion
  const escalationsByUser: Record<string, {
    userName: string;
    totalEscalations: number;
    breakdown: Record<string, number>;
    items: any[];
  }> = {};

  teamMembers.forEach((m) => {
    escalationsByUser[m.name] = {
      userName: m.name,
      totalEscalations: 0,
      breakdown: {
        MISSED_FOLLOWUP: 0,
        GHOSTED_CONTACT: 0,
        UNVERIFIED_SITE_VISIT: 0,
        POST_VISIT_NEGLECT: 0,
        ENDLESS_FOLLOWUP: 0,
      },
      items: [],
    };
  });

  escalationItems.forEach((item) => {
    if (!escalationsByUser[item.assignedUser]) {
      escalationsByUser[item.assignedUser] = {
        userName: item.assignedUser,
        totalEscalations: 0,
        breakdown: {
          MISSED_FOLLOWUP: 0,
          GHOSTED_CONTACT: 0,
          UNVERIFIED_SITE_VISIT: 0,
          POST_VISIT_NEGLECT: 0,
          ENDLESS_FOLLOWUP: 0,
        },
        items: [],
      };
    }
    const entry = escalationsByUser[item.assignedUser];
    entry.totalEscalations++;
    entry.breakdown[item.category] = (entry.breakdown[item.category] || 0) + 1;
    entry.items.push(item);
  });

  // 7. Format Totals for Top Summary Banner
  const totalCalls = userPerformance.reduce((acc, u) => acc + u.userCalls, 0);
  const totalNotes = userPerformance.reduce((acc, u) => acc + u.notesCount, 0);
  const totalSiteVisitsScheduled = userPerformance.reduce((acc, u) => acc + u.siteVisitsScheduled, 0);
  const totalLeadsWon = userPerformance.reduce((acc, u) => acc + u.leadsWon, 0);
  const totalEscalationsCount = escalationItems.length;

  return {
    period,
    leadCohort,
    rangeStart: rangeStart.toISOString(),
    rangeEnd: rangeEnd.toISOString(),
    totals: {
      totalCalls,
      totalNotes,
      totalSiteVisitsScheduled,
      totalLeadsWon,
      totalEscalationsCount,
      totalLeadsAnalyzed: leads.length,
    },
    userPerformance,
    escalationItems,
    escalationsByUser: Object.values(escalationsByUser),
    allActivityLogs: rawActivityLogs.map((log) => ({
      id: log.id,
      userName: log.user?.name || "System",
      userEmail: log.user?.email || "",
      userRole: log.user?.role || "USER",
      action: log.action,
      details: log.details || "",
      createdAt: log.createdAt.toISOString(),
      formattedTime: new Date(log.createdAt).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    })),
  };
}
