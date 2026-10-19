import { getLeads } from "@/app/actions/leadActions";
import ProjectsBoard from "@/components/ProjectsBoard";

export default async function ProjectsPage() {
  const allLeads = await getLeads(undefined, undefined, undefined, undefined, undefined, true);
  
  // Filter for Won leads that have a project stage
  const projectLeads = allLeads.filter(l => l.status === "Won");

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Project Operations Board</h1>
          <p className="text-sm text-gray-500 font-medium">Post-sales tracking for active installations and delivery.</p>
        </div>
      </div>
      
      <ProjectsBoard initialProjects={projectLeads} />
    </div>
  );
}
