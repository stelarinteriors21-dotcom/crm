"use client";

import { useState } from "react";
import { updateLeadStage } from "@/app/actions/projectActions";
import { MapPin, Phone, User, Calendar, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const STAGES = [
  "2D Design Finalized",
  "3D Renders Approved",
  "Factory Production",
  "Site Installation",
  "Final Handover"
];

export default function ProjectsBoard({ initialProjects }: { initialProjects: any[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [loading, setLoading] = useState(false);

  const moveProject = async (leadId: string, newStage: string) => {
    setLoading(true);
    // Optimistic update
    setProjects(prev => prev.map(p => {
      if (p.id === leadId) {
        const cf = p.customFields || {};
        return { ...p, customFields: { ...cf, projectStage: newStage } };
      }
      return p;
    }));

    try {
      await updateLeadStage(leadId, newStage);
    } catch (err) {
      console.error(err);
      alert("Failed to update project stage");
      window.location.reload();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden min-h-[500px]">
      <div className="flex space-x-4 h-full min-w-max pb-4">
        {STAGES.map((stage) => {
          const stageProjects = projects.filter(p => (p.customFields?.projectStage || "2D Design Finalized") === stage);
          
          return (
            <div key={stage} className="w-80 flex flex-col bg-gray-50 border border-gray-200 rounded-xl max-h-full">
              <div className="p-3 border-b border-gray-200 bg-white rounded-t-xl flex justify-between items-center shrink-0 shadow-sm">
                <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wide">{stage}</h3>
                <div className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {stageProjects.length}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {stageProjects.map(project => (
                  <div key={project.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-2">
                      <Link href={`/leads/${project.id}`} className="font-bold text-indigo-600 hover:underline text-sm truncate pr-2">
                        {project.name}
                      </Link>
                      <div className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded uppercase">WON</div>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1 mb-3">
                      <div className="flex items-center"><Phone className="w-3 h-3 mr-1.5 opacity-70" /> {project.phone}</div>
                      <div className="flex items-center truncate"><MapPin className="w-3 h-3 mr-1.5 opacity-70" /> {project.city || "No City"}</div>
                    </div>

                    <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                      <select 
                        value={stage} 
                        onChange={(e) => moveProject(project.id, e.target.value)}
                        disabled={loading}
                        className="text-[10px] font-bold bg-gray-100 border-none outline-none py-1 px-2 rounded cursor-pointer text-gray-700"
                      >
                        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      
                      {stage === "Final Handover" && (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                  </div>
                ))}
                {stageProjects.length === 0 && (
                  <div className="h-20 flex items-center justify-center text-xs text-gray-400 font-bold uppercase tracking-wider dashed border border-gray-300 rounded bg-transparent">
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
