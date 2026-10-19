import { getLeads } from "@/app/actions/leadActions";
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
  const dbLeads = await getLeads(undefined, undefined, undefined, undefined, undefined, true);

  // Filter scheduled leads
  const scheduledLeads = dbLeads.filter((lead: any) => {
    const sv = lead.customFields?.siteVisit;
    return sv && (sv.type === "Scheduled" || sv.type === "Rescheduled");
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

  // Sort completed by verifiedAt / updatedAt descending (most recent first)
  completedLeads.sort((a: any, b: any) => {
    const timeA = new Date(a.customFields?.siteVisit?.verifiedAt || a.updatedAt).getTime();
    const timeB = new Date(b.customFields?.siteVisit?.verifiedAt || b.updatedAt).getTime();
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
