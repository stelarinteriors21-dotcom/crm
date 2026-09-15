import { Search, ChevronDown } from "lucide-react";
import { getLeads } from "@/app/actions/leadActions";
import { getOrganizationSettings } from "@/app/actions/settingsActions";
import LeadsHeaderActions from "@/components/LeadsHeaderActions";
import LeadsFilterDropdowns from "@/components/LeadsFilterDropdowns";
import LeadsTableClient from "@/components/LeadsTableClient";
import LeadsKanbanClient from "@/components/LeadsKanbanClient";
import SearchBar from "@/components/SearchBar";

import { getCurrentUser } from "@/app/actions/authActions";

export default async function LeadsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN" || user?.role === "ROOT";

  const query = typeof searchParams.query === "string" ? searchParams.query : undefined;
  const searchField = typeof searchParams.searchField === "string" ? searchParams.searchField : undefined;
  const status = searchParams.status as string | string[] | undefined;
  const source = typeof searchParams.source === "string" ? searchParams.source : undefined;
  const assigned = typeof searchParams.assigned === "string" ? searchParams.assigned : undefined;
  const active = searchParams.active === "true";
  const startDate = typeof searchParams.startDate === "string" ? searchParams.startDate : undefined;
  const endDate = typeof searchParams.endDate === "string" ? searchParams.endDate : undefined;
  const tag = typeof searchParams.tag === "string" ? searchParams.tag : undefined;

  const dbLeads = await getLeads(query, searchField, status, source, assigned, active, startDate, endDate, tag);
  const settings = await getOrganizationSettings();
  const customTags = (settings?.customTags as any[]) || [{name: "Potential lead", color: "#3b82f6"}, {name: "Future potential lead", color: "#8b5cf6"}];

  return (
    <div className="h-full bg-white flex flex-col -m-3 md:-m-6">
      
      <LeadsHeaderActions />

      {/* Search & Filters */}
      <div className="px-4 md:px-6 py-3 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between shrink-0 bg-[#FDFDFD] gap-3 relative z-50">
        <div className="w-full lg:w-auto shrink-0">
          <SearchBar />
        </div>
        <div className="flex flex-wrap items-center w-full lg:w-auto shrink-0 gap-2">
          <LeadsFilterDropdowns customTags={customTags} />
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
