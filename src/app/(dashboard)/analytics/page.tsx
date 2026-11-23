import prisma from "@/lib/prisma";
import { Clock } from "lucide-react";
import { getCurrentUser } from "@/app/actions/authActions";
import { redirect } from "next/navigation";
import { getHiddenLeadIdsForOrg } from "@/lib/metaFormFilter";
import AnalyticsDateFilter, { AnalyticsPeriod } from "@/components/AnalyticsDateFilter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

function getIstDateBounds(
  period: AnalyticsPeriod,
  customStart?: string,
  customEnd?: string
): {
  startDate?: Date;
  endDate?: Date;
  label: string;
} {
  const now = new Date();
  const todayIst = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD
  const [y, m, d] = todayIst.split("-").map(Number);

  const fmtDisplay = (dateObj: Date) =>
    dateObj.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

  if (period === "all") {
    return { label: "All Time (All recorded calls)" };
  }

  if (period === "custom" && customStart && customEnd) {
    const s = new Date(`${customStart}T00:00:00+05:30`);
    const e = new Date(`${customEnd}T23:59:59.999+05:30`);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      const [minDate, maxDate] = s <= e ? [s, e] : [e, s];
      return {
        startDate: minDate,
        endDate: maxDate,
        label: `${fmtDisplay(minDate)} - ${fmtDisplay(maxDate)}`,
      };
    }
  }

  const endOfToday = new Date(`${todayIst}T23:59:59.999+05:30`);

  if (period === "today") {
    const startOfToday = new Date(`${todayIst}T00:00:00+05:30`);
    return {
      startDate: startOfToday,
      endDate: endOfToday,
      label: `Today (${fmtDisplay(startOfToday)})`,
    };
  }

  if (period === "week") {
    const noonToday = new Date(`${todayIst}T12:00:00+05:30`);
    const dayOfWeek = noonToday.getUTCDay(); // 0=Sun..6=Sat (aligned with IST noon)
    const diffToMonday = (dayOfWeek + 6) % 7;
    const mondayDate = new Date(noonToday.getTime() - diffToMonday * 86400000);
    const mondayStr = mondayDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const startOfWeek = new Date(`${mondayStr}T00:00:00+05:30`);
    return {
      startDate: startOfWeek,
      endDate: endOfToday,
      label: `This Week (${fmtDisplay(startOfWeek)} - ${fmtDisplay(endOfToday)})`,
    };
  }

  if (period === "last_month") {
    const prevMonthYear = m === 1 ? y - 1 : y;
    const prevMonth = m === 1 ? 12 : m - 1;
    const lastDayNum = new Date(Date.UTC(prevMonthYear, prevMonth, 0)).getUTCDate();
    const mm = String(prevMonth).padStart(2, "0");
    const ddEnd = String(lastDayNum).padStart(2, "0");
    const startOfLastMonth = new Date(`${prevMonthYear}-${mm}-01T00:00:00+05:30`);
    const endOfLastMonth = new Date(`${prevMonthYear}-${mm}-${ddEnd}T23:59:59.999+05:30`);
    return {
      startDate: startOfLastMonth,
      endDate: endOfLastMonth,
      label: `Last Month (${fmtDisplay(startOfLastMonth)} - ${fmtDisplay(endOfLastMonth)})`,
    };
  }

  // Default: "month" (This Month)
  const mm = String(m).padStart(2, "0");
  const startOfMonth = new Date(`${y}-${mm}-01T00:00:00+05:30`);
  return {
    startDate: startOfMonth,
    endDate: endOfToday,
    label: `This Month (${fmtDisplay(startOfMonth)} - ${fmtDisplay(endOfToday)})`,
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) {
    redirect("/dashboard");
  }

  const rawPeriod = typeof searchParams?.period === "string" ? searchParams.period : "month";
  const validPeriods: AnalyticsPeriod[] = ["today", "week", "month", "last_month", "all", "custom"];
  const period: AnalyticsPeriod = validPeriods.includes(rawPeriod as AnalyticsPeriod)
    ? (rawPeriod as AnalyticsPeriod)
    : "month";

  const customStart = typeof searchParams?.start === "string" ? searchParams.start : "";
  const customEnd = typeof searchParams?.end === "string" ? searchParams.end : "";

  const { startDate, endDate, label: rangeLabel } = getIstDateBounds(period, customStart, customEnd);
  const hiddenLeadIds = await getHiddenLeadIdsForOrg(user.organizationId);

  const dateFilter = startDate && endDate ? { gte: startDate, lte: endDate } : undefined;
  const hiddenLeadFilter = hiddenLeadIds.length > 0 ? { notIn: hiddenLeadIds } : undefined;

  const users = await prisma.user.findMany({
    where: { organizationId: user.organizationId },
    include: {
      calls: {
        where: {
          ...(dateFilter ? { createdAt: dateFilter } : {}),
          ...(hiddenLeadFilter ? { leadId: hiddenLeadFilter } : {}),
        },
        select: {
          id: true,
          duration: true,
          recordingUrl: true,
        },
      },
      assignedLeads: {
        where: {
          assignedStatus: { not: "HIDDEN_FORM" },
          ...(hiddenLeadIds.length > 0 ? { id: { notIn: hiddenLeadIds } } : {}),
          ...(dateFilter
            ? {
                OR: [
                  { assignedAt: dateFilter },
                  { AND: [{ assignedAt: null }, { createdAt: dateFilter }] },
                ],
              }
            : {}),
        },
        select: { id: true },
      },
    },
  });

  // Calculate accurate per-agent & organization-wide stats
  const teamStats = users
    .map((u) => {
      const totalCalls = u.calls.length;
      const connectedCalls = u.calls.filter((c) => c.duration > 0 || Boolean(c.recordingUrl)).length;
      const totalDuration = u.calls.reduce((sum, call) => sum + Math.max(0, call.duration || 0), 0);
      const avgDurationSecs = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

      return {
        id: u.id,
        name: u.name,
        role: u.role,
        totalCalls,
        connectedCalls,
        totalDuration,
        totalDurationFormatted: formatDuration(totalDuration),
        avgDurationFormatted: formatDuration(avgDurationSecs),
        leadsAssigned: u.assignedLeads.length,
      };
    })
    .sort((a, b) => b.totalCalls - a.totalCalls || b.totalDuration - a.totalDuration);

  const orgTotalCalls = teamStats.reduce((sum, u) => sum + u.totalCalls, 0);
  const orgConnectedCalls = teamStats.reduce((sum, u) => sum + u.connectedCalls, 0);
  const orgTotalDuration = teamStats.reduce((sum, u) => sum + u.totalDuration, 0);
  const orgLeadsAssigned = teamStats.reduce((sum, u) => sum + u.leadsAssigned, 0);
  const orgAvgDurationSecs = orgTotalCalls > 0 ? Math.round(orgTotalDuration / orgTotalCalls) : 0;
  const connectRate = orgTotalCalls > 0 ? Math.round((orgConnectedCalls / orgTotalCalls) * 100) : 0;

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Call Report</h1>
          <p className="text-sm text-gray-500 mt-1">
            Detailed analytics and performance tracking ·{" "}
            <span className="font-medium text-gray-700">{rangeLabel}</span>
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <AnalyticsDateFilter
            currentPeriod={period}
            customStart={customStart}
            customEnd={customEnd}
            rangeLabel={rangeLabel}
          />
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm font-medium text-gray-500">Total Calls Made</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{orgTotalCalls}</div>
          <div className="mt-1 text-xs text-gray-400">
            Talk time: {formatDuration(orgTotalDuration)}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm font-medium text-gray-500">Avg Duration</div>
          <div className="mt-2 text-3xl font-bold text-[#4f46e5]">
            {formatDuration(orgAvgDurationSecs)}
          </div>
          <div className="mt-1 text-xs text-gray-400">Average across {orgTotalCalls} calls</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm font-medium text-gray-500">Total Connected</div>
          <div className="mt-2 text-3xl font-bold text-green-600">{orgConnectedCalls}</div>
          <div className="mt-1 text-xs text-gray-400">{connectRate}% connect rate</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="text-sm font-medium text-gray-500">Total Leads Assigned</div>
          <div className="mt-2 text-3xl font-bold text-blue-600">{orgLeadsAssigned}</div>
          <div className="mt-1 text-xs text-gray-400">
            {period === "all" ? "All assigned leads" : "Assigned in selected range"}
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">Agent Performance Leaderboard</h2>
          <span className="text-xs font-medium text-gray-500">{rangeLabel}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Caller</th>
                <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned Leads</th>
                <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Calls</th>
                <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Connected</th>
                <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Duration</th>
                <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Talk Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teamStats.map((agent, i) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold mr-3 text-xs">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                        <div className="text-[11px] text-gray-400">{agent.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.leadsAssigned}
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {agent.totalCalls}
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-700">
                    {agent.connectedCalls}
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      <Clock className="w-3 h-3 mr-1" /> {agent.avgDurationFormatted}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.totalDurationFormatted}
                  </td>
                </tr>
              ))}
              {teamStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 md:px-6 py-12 text-center text-gray-500">No agent data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
