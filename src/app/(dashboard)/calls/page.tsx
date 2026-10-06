import { RefreshCw, Filter } from "lucide-react";
import prisma from "@/lib/prisma";
import CallsView from "@/components/CallsView";
import { getCurrentUser } from "@/app/actions/authActions";
import SearchBar from "@/components/SearchBar";

export default async function CallsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const user = await getCurrentUser();
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
      
      {/* Sub-header Toolbar */}
      <div className="h-14 px-4 md:px-6 border-b border-gray-100 flex items-center shrink-0 justify-between gap-4">
        <h1 className="text-[17px] font-bold text-gray-800 flex items-center whitespace-nowrap">
          My Calls <RefreshCw className="w-4 h-4 ml-3 text-[#4f46e5] cursor-pointer" />
        </h1>
        
        <div className="flex-1 max-w-md">
           <SearchBar placeholder="Search callers by name or phone..." />
        </div>

        <div className="flex items-center space-x-2">
          <button className="flex items-center px-3 py-1.5 text-gray-600 bg-gray-50 border border-gray-200 rounded text-sm hover:bg-gray-100 transition-colors">
            <Filter className="w-4 h-4 mr-1.5" /> Filters
          </button>
        </div>
      </div>

      {/* Main Split View */}
      <CallsView leads={leads} />

    </div>
  );
}
