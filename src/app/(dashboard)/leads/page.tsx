import { Search, ChevronDown } from "lucide-react";
import { getLeads, getUniqueCities } from "@/app/actions/leadActions";
import { getOrganizationSettings } from "@/app/actions/settingsActions";
import LeadsHeaderActions from "@/components/LeadsHeaderActions";
import LeadsFilterDropdowns from "@/components/LeadsFilterDropdowns";
import LeadsTableClient from "@/components/LeadsTableClient";
import LeadsKanbanClient from "@/components/LeadsKanbanClient";
import SearchBar from "@/components/SearchBar";
import LeadsFilterTracker from "@/components/LeadsFilterTracker";

import { getCurrentUser } from "@/app/actions/authActions";
import { redirect } from "next/navigation";

export default async function LeadsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user?.role === "SITE_VISITOR") {
    redirect("/dashboard");
  }
  const isAdmin = user?.role === "ADMIN" || user?.role === "ROOT";

  const query = typeof searchParams.query === "string" ? searchParams.query : undefined;
  const searchField = typeof searchParams.searchField === "string" ? searchParams.searchField : undefined;
  const status = searchParams.status as string | string[] | undefined;
  const city = searchParams.city as string | string[] | undefined;
  const source = typeof searchParams.source === "string" ? searchParams.source : undefined;
  const assigned = typeof searchParams.assigned === "string" ? searchParams.assigned : undefined;
  const active = searchParams.active === "true";
  const startDate = typeof searchParams.startDate === "string" ? searchParams.startDate : undefined;
  const endDate = typeof searchParams.endDate === "string" ? searchParams.endDate : undefined;
  const tag = typeof searchParams.tag === "string" ? searchParams.tag : undefined;
  const stage = typeof searchParams.stage === "string" ? searchParams.stage : undefined;

  const dbLeads = await getLeads(query, searchField, status, source, assigned, active, startDate, endDate, tag, city, stage);
  const settings = await getOrganizationSettings();
  const uniqueCities = await getUniqueCities();
  const customTags = (settings?.customTags as any[]) || [{name: "Potential lead", color: "#3b82f6"}, {name: "Future potential lead", color: "#8b5cf6"}];

  return (
    <div className="h-full bg-white flex flex-col -m-3 md:-m-6">
      <LeadsFilterTracker />
      <LeadsHeaderActions />

      {/* Stage Tabs (ROOT only) */}
      {user?.role === "ROOT" && (
        <div className="px-4 md:px-6 pt-3 flex space-x-4 border-b border-gray-200 overflow-x-auto">
          <a href="?stage=" className={`pb-2 text-sm font-medium whitespace-nowrap ${!stage ? 'border-b-2 border-[#4f46e5] text-[#4f46e5]' : 'text-gray-500 hover:text-gray-700'}`}>All Leads</a>
          <a href="?stage=converting" className={`pb-2 text-sm font-medium whitespace-nowrap ${stage === 'converting' ? 'border-b-2 border-[#4f46e5] text-[#4f46e5]' : 'text-gray-500 hover:text-gray-700'}`}>Converting</a>
          <a href="?stage=converted" className={`pb-2 text-sm font-medium whitespace-nowrap ${stage === 'converted' ? 'border-b-2 border-[#4f46e5] text-[#4f46e5]' : 'text-gray-500 hover:text-gray-700'}`}>Converted</a>
          <a href="?stage=junk" className={`pb-2 text-sm font-medium whitespace-nowrap ${stage === 'junk' ? 'border-b-2 border-[#4f46e5] text-[#4f46e5]' : 'text-gray-500 hover:text-gray-700'}`}>Junk / Lost</a>
        </div>
      )}

      {/* Search & Filters */}
      <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between shrink-0 bg-[#FDFDFD] gap-2.5 sm:gap-3 relative z-50">
        <div className="w-full lg:w-auto shrink-0">
          <SearchBar />
        </div>
        <div className="flex items-center w-full lg:w-auto shrink-0 relative z-50">
          <LeadsFilterDropdowns customTags={customTags} uniqueCities={uniqueCities} />
        </div>
      </div>

      {/* View Switcher is typically added in LeadsHeaderActions, but we check searchParams here */}
      {searchParams.view === "kanban" ? (
        <LeadsKanbanClient leads={dbLeads} customTags={customTags} />
      ) : (
        <LeadsTableClient leads={dbLeads} totalLeads={dbLeads.length} customTags={customTags} isAdmin={isAdmin} />
      )}

    </div>
  );
}
