import { redirect } from "next/navigation";
import { Settings, RefreshCw } from "lucide-react";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { getDashboardStats } from "@/app/actions/dashboardActions";
import { getCurrentUser } from "@/app/actions/authActions";
import prisma from "@/lib/prisma";
import DashboardClient from "@/components/DashboardClient";
import { calculateLeadScore } from "@/lib/leadScore";
import { getUserInvolvementStats } from "@/app/actions/activityActions";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const stats = await getDashboardStats();
  const involvementStats = await getUserInvolvementStats();

  
  let pendingLeads: any[] = [];
  let allLeads: any[] = [];
  let hotLeads: any[] = [];
  let statusBreakdown: any[] = [];
  let teamActivity: any[] = []; let sLeads: any[] = [];

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
        scoreLocation: l.scoreLocation,
        scoreBudget: l.scoreBudget,
        scoreTimeline: l.scoreTimeline,
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

    // Computed Scheduled Leads
    sLeads = allLeads.filter((l: any) => {
      const sv = l.customFields?.siteVisit;
      return sv && (sv.type === "Scheduled" || sv.type === "Rescheduled");
    });
    sLeads.sort((a: any, b: any) => {
      const svA = a.customFields.siteVisit;
      const svB = b.customFields.siteVisit;
      const dateA = new Date(`${svA.date}T${svA.time || '00:00'}`);
      const dateB = new Date(`${svB.date}T${svB.time || '00:00'}`);
      return dateA.getTime() - dateB.getTime();
    });


    // Calculate start and end of today in Asia/Kolkata timezone (IST)
    const kolkataDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // "YYYY-MM-DD"
    const startOfToday = new Date(`${kolkataDateStr}T00:00:00+05:30`);
    const endOfToday = new Date(`${kolkataDateStr}T23:59:59.999+05:30`);

    // Team activity — count calls made TODAY by each person
    const members = await prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        name: true,
        calls: {
          where: {
            createdAt: { gte: startOfToday, lte: endOfToday }
          },
          select: { duration: true }
        }
      }
    });

    teamActivity = members.map(m => {
      const todayCalls = m.calls || [];
      const totalSecs = todayCalls.reduce((s: number, c: any) => s + (c.duration ?? 0), 0);
      const initials = (m.name ?? "??").split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
      function fmtSecs(s: number) {
        if (s === 0) return "0s";
        if (s < 60) return `${s}s`;
        return `${Math.floor(s / 60)}m ${s % 60}s`;
      }
      const invStat = involvementStats.find(s => s.name === m.name);
      return {
        id: m.id,
        initials,
        name: m.name ?? "Unknown",
        calls: todayCalls.length,
        duration: fmtSecs(totalSecs),
        revenue: "₹0",
        activeMinutes: invStat?.activeMinutes || 0
      };
    });
  }

  return (
    <DashboardClient
      pendingLeads={pendingLeads}
      allLeads={allLeads}
      hotLeads={hotLeads}
      scheduledLeads={sLeads}
      statusBreakdown={statusBreakdown}
      teamActivity={teamActivity}
      totalLeads={stats?.totalLeads ?? 0}
      userId={user?.id ?? ""}
      userRole={user?.role ?? ""}
      userName={user?.name ?? ""}
    />
  );
}
