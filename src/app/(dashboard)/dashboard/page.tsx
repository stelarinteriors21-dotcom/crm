import { Settings, RefreshCw } from "lucide-react";
import { getDashboardStats } from "@/app/actions/dashboardActions";
import { getCurrentUser } from "@/app/actions/authActions";
import prisma from "@/lib/prisma";
import DashboardClient from "@/components/DashboardClient";
import { calculateLeadScore } from "@/lib/leadScore";
import { getUserInvolvementStats } from "@/app/actions/activityActions";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const stats = await getDashboardStats();
  const involvementStats = await getUserInvolvementStats();

  
  let pendingLeads: any[] = [];
  let allLeads: any[] = [];
  let hotLeads: any[] = [];
  let statusBreakdown: any[] = [];
  let teamActivity: any[] = [];

  if (user) {
    // Leads pending acceptance
    pendingLeads = await prisma.lead.findMany({
      where: { assignedToId: user.id, assignedStatus: "PENDING" },
      orderBy: { assignedAt: "desc" }
    });

    // All leads in the org
    allLeads = await prisma.lead.findMany({
      where: { organizationId: user.organizationId },
      include: { assignedTo: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    hotLeads = allLeads.map((l: any) => ({
      ...l,
      computedScore: calculateLeadScore({
        scoreEngagement: l.scoreEngagement,
        scoreLocation: l.scoreLocation,
        scoreBudget: l.scoreBudget,
        scoreTimeline: l.scoreTimeline,
        scoreStatus: l.scoreStatus,
        scoreFullHome: l.scoreFullHome,
        scoreFloorPlan: l.scoreFloorPlan,
        scoreMoodBoard: l.scoreMoodBoard,
        scoreSiteVisit: l.scoreSiteVisit,
        scoreQuotation: l.scoreQuotation,
      }).total
    })).sort((a: any, b: any) => b.computedScore - a.computedScore).slice(0, 5);

    // Status breakdown
    const grouped = await prisma.lead.groupBy({
      by: ["status"],
      where: { organizationId: user.organizationId },
      _count: { status: true },
      orderBy: { _count: { status: "desc" } }
    });
    const total = grouped.reduce((s, g) => s + g._count.status, 0);
    statusBreakdown = grouped.map(g => ({
      label: g.status ?? "Unknown",
      count: g._count.status,
      percent: total > 0 ? `${((g._count.status / total) * 100).toFixed(1)}%` : "0%"
    }));

    // Team activity — count calls on leads assigned to each person
    const members = await prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
        assignedLeads: {
          select: {
            calls: {
              select: { duration: true }
            }
          }
        }
      }
    });
    teamActivity = members.map(m => {
      // Calls on leads assigned to this person (regardless of who made the call)
      const allCalls = m.assignedLeads.flatMap((l: any) => l.calls);
      const totalSecs = allCalls.reduce((s: number, c: any) => s + (c.duration ?? 0), 0);
      const initials = (m.name ?? "??").split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
      function fmtSecs(s: number) {
        if (s === 0) return "0s";
        if (s < 60) return `${s}s`;
        return `${Math.floor(s / 60)}m ${s % 60}s`;
      }
      const invStat = involvementStats.find(s => s.name === m.name);
      return {
        initials,
        name: m.name ?? "Unknown",
        calls: allCalls.length,
        duration: fmtSecs(totalSecs),
        activeMinutes: invStat?.activeMinutes || 0
      };
    });
  }

  return (
    <DashboardClient
      pendingLeads={pendingLeads}
      allLeads={allLeads}
      hotLeads={hotLeads}
      statusBreakdown={statusBreakdown}
      teamActivity={teamActivity}
      totalLeads={stats?.totalLeads ?? 0}
      userId={user?.id ?? ""}
      userRole={user?.role ?? ""}
      userName={user?.name ?? ""}
    />
  );
}
