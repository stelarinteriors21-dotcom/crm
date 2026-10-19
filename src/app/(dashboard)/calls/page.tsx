import { RefreshCw, Filter } from "lucide-react";
import prisma from "@/lib/prisma";
import CallsView from "@/components/CallsView";
import { getCurrentUser } from "@/app/actions/authActions";
import SearchBar from "@/components/SearchBar";
import { redirect } from "next/navigation";

export default async function CallsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const user = await getCurrentUser();
  if (user?.role === "SITE_VISITOR") {
    redirect("/site-visits");
  }
  const query = typeof searchParams.query === "string" ? searchParams.query : undefined;
  
  // Enforce RBAC for callers
  const whereClause: any = {
    organizationId: user?.organizationId
  };
  
  if (user?.role !== "ADMIN" && user?.role !== "ROOT") {
    whereClause.assignedToId = user?.id;
  }

  if (query) {
    whereClause.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { phone: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ];
  }
  
  // Fetch real leads with their call history
  const leads = await prisma.lead.findMany({
    where: whereClause,
    include: {
      assignedTo: true,
      calls: {
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 50 // Limit for performance
  });

  return (
    <div className="h-full bg-white flex flex-col -m-3 md:-m-6 relative overflow-hidden">
      {/* Main Split View with Responsive Mobile Toolbar */}
      <CallsView leads={leads} />
    </div>
  );
}
