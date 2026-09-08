"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";

export async function getDashboardStats() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const orgId = user.organizationId;

  const totalLeads = await prisma.lead.count({ where: { organizationId: orgId } });
  
  const statusGroups = await prisma.lead.groupBy({
    by: ['status'],
    where: { organizationId: orgId },
    _count: true
  });

  const statuses = statusGroups.map(g => ({
    name: g.status,
    count: g._count,
    percent: totalLeads > 0 ? ((g._count / totalLeads) * 100).toFixed(1) + "%" : "0%"
  }));

  // Activity summary (mock for now, would aggregate calls table)
  const activity = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { name: true }
  });
  
  const performance = activity.map(a => ({
    initials: a.name.substring(0, 2).toUpperCase(),
    name: a.name,
    calls: 0,
    duration: "0s",
    revenue: "₹ 0"
  }));

  return { totalLeads, statuses, performance };
}
