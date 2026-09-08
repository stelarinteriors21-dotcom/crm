import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/authActions";
import LeaderboardClient from "@/components/LeaderboardClient";

export default async function LeaderboardPage() {
  const user = await getCurrentUser();

  // Fetch all users in the org with their call logs
  const members = await prisma.user.findMany({
    where: { organizationId: user?.organizationId },
    include: {
      assignedLeads: {
        include: { calls: true }
      }
    },
    orderBy: { name: "asc" }
  });

  function formatSecs(s: number) {
    if (s === 0) return "0s";
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
  }

  function timeAgo(d: Date | null) {
    if (!d) return "NA";
    const diff = Math.floor((Date.now() - d.getTime()) / 1000 / 60 / 60);
    if (diff < 1) return "Just now";
    if (diff < 24) return `${diff}h ago`;
    return `${Math.floor(diff / 24)}d ago`;
  }

  const team = members.map((m, idx) => {
    const allCalls = m.assignedLeads.flatMap(l => l.calls);
    const totalSecs = allCalls.reduce((s, c) => s + (c.duration ?? 0), 0);
    const callDates = allCalls.map(c => c.createdAt).sort((a, b) => a.getTime() - b.getTime());
    
    return {
      name: m.name ?? "Unknown",
      role: m.role ?? "Member",
      initials: (m.name ?? "??").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase(),
      calls: allCalls.length,
      duration: formatSecs(totalSecs),
      sales: 0, // Could be tracked via a "Won" status count
      firstCall: callDates[0] ? timeAgo(callDates[0]) : "NA",
      lastCall: callDates[callDates.length - 1] ? timeAgo(callDates[callDates.length - 1]) : "NA",
    };
  });

  // Sort by calls descending
  team.sort((a, b) => b.calls - a.calls);

  return <LeaderboardClient team={team} />;
}
