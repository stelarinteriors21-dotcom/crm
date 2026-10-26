import prisma from "@/lib/prisma";
import { getOrganizationSettings } from "@/app/actions/settingsActions";
import SiteVisitsDashboardClient from "@/components/SiteVisitsDashboardClient";
import { getCurrentUser } from "@/app/actions/authActions";
import { redirect } from "next/navigation";

export default async function SiteVisitsDashboard() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT" && user.role !== "SITE_VISITOR")) {
    redirect("/dashboard");
  }

  const settings = await getOrganizationSettings();
  const requireGps = settings?.requireGps || false;

  // Fetch leads with site visits and their consolidated notes
  const dbLeads = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      ...(user.role === "TELECALLER" ? { assignedToId: user.id } : {}),
      customFields: {
        path: ['siteVisit'],
        not: null
      }
    },
    include: {
      assignedTo: true,
      notes: {
        include: {
          user: { select: { id: true, name: true, role: true } }
        },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Filter scheduled leads
  const scheduledLeads = dbLeads.filter((lead: any) => {
    const sv = lead.customFields?.siteVisit;
    return sv && (sv.type === "Scheduled" || sv.type === "Rescheduled") && sv.type !== "Done";
  });

  // Filter completed/previous leads
  const completedLeads = dbLeads.filter((lead: any) => {
    const sv = lead.customFields?.siteVisit;
    const isDone = sv && (sv.type === "Done" || !!sv.verifiedAt || (lead.status || "").toLowerCase() === "site visit done");
    return isDone;
  });

  // Sort scheduled by date/time ascending
  scheduledLeads.sort((a: any, b: any) => {
    const svA = a.customFields?.siteVisit || {};
    const svB = b.customFields?.siteVisit || {};
    const dateA = new Date(`${svA.date || "1970-01-01"}T${svA.time || '00:00'}`);
    const dateB = new Date(`${svB.date || "1970-01-01"}T${svB.time || '00:00'}`);
    return dateA.getTime() - dateB.getTime();
  });

  // Sort completed by verifiedAt / createdAt descending (most recent first)
  completedLeads.sort((a: any, b: any) => {
    const timeA = new Date(a.customFields?.siteVisit?.verifiedAt || a.createdAt).getTime();
    const timeB = new Date(b.customFields?.siteVisit?.verifiedAt || b.createdAt).getTime();
    return timeB - timeA;
  });

  return (
    <SiteVisitsDashboardClient
      scheduledLeads={scheduledLeads}
      completedLeads={completedLeads}
      requireGps={requireGps}
      userRole={user.role}
    />
  );
}
