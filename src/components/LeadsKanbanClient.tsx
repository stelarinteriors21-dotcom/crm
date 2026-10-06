"use client"
import { useState, useEffect } from "react";
import Link from "next/link";
import { LEAD_STATUS_OPTIONS, LEAD_STATUS_COLORS } from "@/lib/constants";
import { updateLeadStatus } from "@/app/actions/leadActions";

type Lead = any;

export default function LeadsKanbanClient({ leads }: { leads: Lead[] }) {
  const [localLeads, setLocalLeads] = useState<Lead[]>(leads);

  useEffect(() => {
    setLocalLeads(leads);
  }, [leads]);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId) return;

    const leadToMove = localLeads.find(l => l.id === leadId);
    if (!leadToMove || leadToMove.status === newStatus) return;

    setLocalLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, status: newStatus } : l
    ));

    try {
      await updateLeadStatus(leadId, newStatus);
    } catch (err) {
      console.error("Failed to update lead status", err);
      setLocalLeads(leads);
    }
  };

  function timeAgo(dateStr: string) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    const diffDays = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}M ago`;
  }
  
  return (
    <div className="flex-1 flex overflow-x-auto bg-gray-50/50 p-6 space-x-6 min-h-[calc(100vh-200px)]">
      {LEAD_STATUS_OPTIONS.map((status) => {
        const columnLeads = localLeads.filter(l => (l.status || "Fresh") === status);
        
        return (
          <div 
            key={status} 
            className="w-80 shrink-0 flex flex-col bg-gray-100/50 rounded-xl border border-gray-200/60 overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className={`px-4 py-3 border-b border-gray-200/60 flex items-center justify-between bg-white/50 backdrop-blur-sm sticky top-0 z-10`}>
              <div className="flex items-center space-x-2">
                <span className={`w-3 h-3 rounded-full ${LEAD_STATUS_COLORS[status]?.split(' ')[0] || "bg-gray-400"}`}></span>
                <h3 className="font-bold text-gray-800 text-sm tracking-tight">{status}</h3>
              </div>
              <span className="bg-gray-200/80 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {columnLeads.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {columnLeads.map(lead => (
                <div 
                  key={lead.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, lead.id)}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm cursor-grab active:cursor-grabbing hover:border-purple-300 hover:shadow-md transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <Link href={`/leads/${lead.id}`} className="font-semibold text-gray-900 text-sm hover:text-[#4f46e5] hover:underline flex-1 truncate pr-2">
                      {lead.name}
                    </Link>
                    {lead.assignedTo && (
                      <div 
                        className="w-6 h-6 rounded-full bg-purple-50 text-[#4f46e5] flex items-center justify-center text-[10px] font-bold border border-purple-100 shrink-0" 
                        title={lead.assignedTo.name ?? ""}
                      >
                        {(lead.assignedTo.name ?? "?").split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2">{lead.phone || '--'}</div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <span className="text-[10px] text-gray-400 font-medium">
                      {timeAgo(lead.createdAt)}
                    </span>
                    {lead.source && (
                      <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-1 rounded font-medium truncate max-w-[100px]">
                        {lead.source}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
