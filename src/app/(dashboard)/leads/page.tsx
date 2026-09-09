import { Search, ChevronDown } from "lucide-react";
import { getLeads } from "@/app/actions/leadActions";
import LeadsHeaderActions from "@/components/LeadsHeaderActions";
import LeadsFilterDropdowns from "@/components/LeadsFilterDropdowns";
import LeadsTableClient from "@/components/LeadsTableClient";
import LeadsKanbanClient from "@/components/LeadsKanbanClient";
import SearchBar from "@/components/SearchBar";

export default async function LeadsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const query = typeof searchParams.query === "string" ? searchParams.query : undefined;
  const status = searchParams.status as string | string[] | undefined;
  const source = typeof searchParams.source === "string" ? searchParams.source : undefined;
  const assigned = typeof searchParams.assigned === "string" ? searchParams.assigned : undefined;
  const active = searchParams.active === "true";
  const startDate = typeof searchParams.startDate === "string" ? searchParams.startDate : undefined;
  const endDate = typeof searchParams.endDate === "string" ? searchParams.endDate : undefined;
  const tag = typeof searchParams.tag === "string" ? searchParams.tag : undefined;

  const dbLeads = await getLeads(query, status, source, assigned, active, startDate, endDate, tag);

  return (
    <div className="h-full bg-white flex flex-col -m-3 md:-m-6">
      
      <LeadsHeaderActions />

      {/* Search & Filters */}
      <div className="px-4 md:px-6 py-3 border-b border-gray-100 flex items-center justify-between shrink-0 bg-[#FDFDFD]">
        <SearchBar />
        <div className="flex items-center space-x-3 ml-4">
          <LeadsFilterDropdowns />
        </div>
      </div>

      {/* View Switcher is typically added in LeadsHeaderActions, but we check searchParams here */}
      {searchParams.view === 'kanban' ? (
        <LeadsKanbanClient leads={dbLeads} />
      ) : (
        <LeadsTableClient leads={dbLeads} totalLeads={dbLeads.length} />
      )}

    </div>
  );
}
