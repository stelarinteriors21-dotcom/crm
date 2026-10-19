import { getCurrentUser } from "@/app/actions/authActions";
import prisma from "@/lib/prisma";
import WhatsAppCompanionClient from "@/components/WhatsAppCompanionClient";

export default async function WhatsAppCompanionPage() {
  const user = await getCurrentUser();

  const whereClause: any = {};
  if (user?.organizationId) {
    whereClause.organizationId = user.organizationId;
  }

  // Fetch recent leads with phone numbers to populate quick selection
  const leads = await prisma.lead.findMany({
    where: {
      ...whereClause,
      phone: { not: "" }
    },
    select: {
      id: true,
      name: true,
      phone: true,
      customFields: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 50
  });

  const formattedLeads = leads
    .filter(l => Boolean(l.phone && l.phone.trim().length > 0))
    .map(l => {
      const cf = (l.customFields as any) || {};
      const sv = cf.siteVisit || {};
      return {
        id: l.id,
        name: l.name,
        phone: l.phone,
        siteVisitOtp: sv.otp || null
      };
    });

  return (
    <div className="py-6 px-4 md:px-8">
      <WhatsAppCompanionClient recentLeads={formattedLeads} />
    </div>
  );
}
