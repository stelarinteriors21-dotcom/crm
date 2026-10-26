"use client"
import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Edit3, GripVertical, History } from "lucide-react";
import { getCallHistoryByPhone } from "@/app/actions/leadActions";
import Link from "next/link";
import * as XLSX from "xlsx";
import LeadActionsMenu from "@/components/LeadActionsMenu";
import { triggerSmartCall } from "@/components/SmartCallManager";
import { updateLeadTag } from "@/app/actions/leadActions";
import { addCustomTag } from "@/app/actions/settingsActions";
import { LEAD_STATUS_OPTIONS, LEAD_STATUS_COLORS } from "@/lib/constants";

type Lead = any;

const BASE_COLUMNS = [
  { id: "name", label: "Name", type: "T", defaultVisible: true },
  { id: "status", label: "Status", type: "🔴", defaultVisible: true },
  { id: "followUpReason", label: "Follow-up Reason", type: "💬", defaultVisible: true },
  { id: "approximateBudget", label: "Approximate Budget", type: "💰", defaultVisible: true },
  { id: "city", label: "City", type: "T", defaultVisible: true },
    { id: "siteVisitDate", label: "Site Visit Date", type: "📅", defaultVisible: true },
  { id: "email", label: "Email", type: "📧", defaultVisible: true },
  { id: "typeOfSpace", label: "Type of space", type: "🏢", defaultVisible: false },
  { id: "alternatePhone", label: "Alternate Phone", type: "📱", defaultVisible: false },
    { id: "capturedOn", label: "Captured On", type: "📅", defaultVisible: true },
  { id: "facebookAd", label: "Facebook Ad", type: "T", defaultVisible: true },
  { id: "facebookCampaign", label: "Facebook Campaign", type: "T", defaultVisible: false },
  { id: "leadSource", label: "Lead Source", type: "🌐", defaultVisible: true },
  { id: "modifiedOn", label: "Modified On", type: "📅", defaultVisible: false },
    { id: "tag", label: "Tag", type: "🏷️", defaultVisible: true },
  { id: "assignee", label: "Assignee", type: "👤", defaultVisible: true },
  { id: "phone", label: "Phone", type: "📱", defaultVisible: true }
];


const CallHistoryModal = ({ phone, onClose }: { phone: string, onClose: () => void }) => {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getCallHistoryByPhone(phone).then(res => {
      setLogs(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [phone]);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center">
            <History className="w-4 h-4 mr-2 text-[#4f46e5]" />
            Call History: {phone}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? <p className="text-gray-500 text-sm text-center py-4">Loading calls...</p> : 
           logs.length === 0 ? <p className="text-gray-500 text-sm text-center py-4">No calls logged yet.</p> :
           <div className="space-y-3">
             {logs.map(log => (
               <div key={log.id} className="border border-gray-100 p-3 rounded-lg bg-white shadow-sm text-sm">
                 <div className="flex justify-between text-[11px] text-gray-500 mb-2 pb-2 border-b border-gray-50">
                   <span className="font-bold text-[#4f46e5]">{log.user?.name || "User"}</span>
                   <span>{new Date(log.createdAt).toLocaleString('en-IN', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                 </div>
                 <div className="font-medium text-gray-800 flex justify-between items-center">
                    <span>Lead: {log.lead?.name || "Unknown"}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                      Duration: {Math.floor(log.duration/60)}m {log.duration%60}s
                    </span>
                 </div>
                 {log.notes && <p className="mt-2 text-gray-600 text-xs italic bg-gray-50 p-2 rounded">"{log.notes}"</p>}
                 {log.recordingUrl && (
                   <div className="mt-2">
                     <audio controls className="w-full h-8">
                       <source src={log.recordingUrl} type="audio/mpeg" />
                       Your browser does not support audio element.
                     </audio>
                   </div>
                 )}
               </div>
             ))}
           </div>
          }
        </div>
      </div>
    </div>
  )
}

const INTERNAL_SYSTEM_KEYS = new Set([
  "sitevisit",
  "sitevisithistory",
  "site_visit",
  "site_visit_history",
  "site visit date",
  "site_visit_date",
  "quotation",
  "quotationhistory",
  "quotation_history",
  "quotationsentat",
  "quotationfollowupactive",
  "quotationapproved",
  "revisionalertactive",
  "followupdate",
  "followup_date",
  "followupcount",
  "statuschangedat",
  "status_changed_at",
  "converted",
  "convertedhistory",
  "junk",
  "junkhistory",
  "projectstage",
  "project_stage",
  "bulkimported",
  "bulk_imported",
  "importbatchid",
  "import_batch_id",
  "importedat",
  "imported_at",
  "inactivity48halert",
  "inactivity48h_alert",
]);

function isInternalCustomField(key: string): boolean {
  if (!key) return true;
  const normalized = key.toLowerCase().replace(/[\s_\-]/g, "");
  if (INTERNAL_SYSTEM_KEYS.has(normalized)) return true;
  if (
    normalized.includes("quotation") ||
    normalized.includes("sitevisit") ||
    normalized.includes("followup") ||
    normalized.includes("statuschanged") ||
    normalized.includes("converted") ||
    normalized.includes("junk") ||
    normalized.includes("batch") ||
    normalized.includes("alert") ||
    normalized.includes("history")
  ) {
    return true;
  }
  return false;
}

export default function LeadsTableClient({ leads, totalLeads, customTags = [], isAdmin = false }: { leads: Lead[], totalLeads: number, customTags?: any[], isAdmin?: boolean }) {
  const [historyPhone, setHistoryPhone] = React.useState<string | null>(null);
  // Extract custom fields from leads, excluding internal metadata keys
  const customFieldKeys = new Set<string>();
  let customLabels: Record<string, string> = {};
  
  leads.forEach(l => {
    if (l.organization?.customFieldLabels) {
      customLabels = { ...customLabels, ...(l.organization.customFieldLabels as Record<string, string>) };
    }
    if (l.customFields && typeof l.customFields === "object") {
      Object.entries(l.customFields as Record<string, any>).forEach(([k, val]) => {
        if (isInternalCustomField(k)) return;
        if (typeof val === "object" && val !== null) return;
        customFieldKeys.add(k);
      });
    }
  });

  const dynamicColumns = Array.from(customFieldKeys).map(k => ({
    id: `custom_${k}`,
    label: customLabels[k] || k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: "⚡",
    defaultVisible: false
  }));

  const allColumns = [...BASE_COLUMNS, ...dynamicColumns];

  const [columnOrder, setColumnOrder] = useState<string[]>(() => BASE_COLUMNS.map(c => c.id));
  useEffect(() => {
    const saved = localStorage.getItem('leadsColumnOrder');
    let savedOrder: string[] = [];
    if (saved) {
      try { savedOrder = JSON.parse(saved); } catch (e) {}
    }
    
    // Purge any column IDs that no longer exist (e.g. removed 'createdOn', internal custom fields)
    savedOrder = savedOrder.filter(id => allColumns.some(c => c.id === id));

    // Ensure followUpReason is inserted right next to status if not already in saved order
    if (savedOrder.length > 0 && !savedOrder.includes("followUpReason")) {
      const statusIdx = savedOrder.indexOf("status");
      if (statusIdx !== -1) {
        savedOrder.splice(statusIdx + 1, 0, "followUpReason");
      }
    }

    // Merge: keep saved order, append any new columns that aren't in saved order
    const newColumns = allColumns.map(c => c.id).filter(id => !savedOrder.includes(id));
    const finalOrder = savedOrder.length > 0 ? [...savedOrder, ...newColumns] : allColumns.map(c => c.id);
    
    setColumnOrder(finalOrder);
    if (saved) {
      localStorage.setItem('leadsColumnOrder', JSON.stringify(finalOrder));
    }
  }, [leads.length]); // Re-run if leads length changes to capture new custom fields

  const [visibleCols, setVisibleCols] = useState<string[]>(
    allColumns.filter(c => c.defaultVisible).map(c => c.id)
  );
  const [showColMenu, setShowColMenu] = useState(false);
  const colMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(event.target as Node)) {
        setShowColMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  const filteredLeads = leads; // Server-side filtering now handles this

  const downloadExcel = () => {
    const rows = filteredLeads.map((l: any) => {
      const cf = (l.customFields as any) || {};
      const isStatusFollowUp = (l.status || "").toLowerCase().includes("follow");
      const isAutoFollowUp = Boolean(cf.isAutoFollowUp || cf.staleConvertingAlert || cf.staleFollowUpReason);
      let reason = "";
      if (isStatusFollowUp || isAutoFollowUp) {
        reason = cf.lastFollowUpNote || cf.staleFollowUpReason || cf.followUpReason || (Array.isArray(l.notes) ? l.notes.find((n: any) => !n.content?.startsWith("[SYSTEM:"))?.content : "") || "";
      }

      return {
        "Name": l.name || "",
        "Phone": l.phone || "",
        "Alternate Phone": cf?.alternatePhone || (l as any).alternatePhone || "",
        "Email": l.email || "",
        "Status": l.status || "",
        "Follow-up Reason": reason,
        "Source": l.source || "",
        "City": l.city || "",
        "Budget": l.approximateBudget || l.budget || "",
        "Assignee": l.assignedTo?.name || "",
        "Captured On": (l.capturedOn || l.createdAt) ? new Date(l.capturedOn || l.createdAt).toLocaleDateString() : "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `leads_${new Date().toISOString().split("T")[0]}.xlsx`);
    setShowMoreMenu(false);
  };

  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Leads Report", 14, 16);
    autoTable(doc, {
      startY: 22,
      head: [["Name", "Phone", "Alt Phone", "Status", "Follow-up Reason", "Source", "City", "Budget", "Assignee", "Captured On"]],
      body: filteredLeads.map((l: any) => {
        const cf = (l.customFields as any) || {};
        const isStatusFollowUp = (l.status || "").toLowerCase().includes("follow");
        const isAutoFollowUp = Boolean(cf.isAutoFollowUp || cf.staleConvertingAlert || cf.staleFollowUpReason);
        let reason = "";
        if (isStatusFollowUp || isAutoFollowUp) {
          reason = cf.lastFollowUpNote || cf.staleFollowUpReason || cf.followUpReason || (Array.isArray(l.notes) ? l.notes.find((n: any) => !n.content?.startsWith("[SYSTEM:"))?.content : "") || "";
        }

        return [
          l.name || "",
          l.phone || "",
          cf?.alternatePhone || (l as any).alternatePhone || "",
          l.status || "",
          reason,
          l.source || "",
          l.city || "",
          l.approximateBudget || l.budget || "",
          l.assignedTo?.name || "",
          (l.capturedOn || l.createdAt) ? new Date(l.capturedOn || l.createdAt).toLocaleDateString() : "",
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [97, 60, 188] },
    });
    doc.save(`leads_${new Date().toISOString().split("T")[0]}.pdf`);
    setShowMoreMenu(false);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map((l: any) => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeads(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const [draggedCol, setDraggedCol] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCol(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedCol || draggedCol === targetId) {
      setDraggedCol(null);
      return;
    }

    const oldIdx = columnOrder.indexOf(draggedCol);
    const newIdx = columnOrder.indexOf(targetId);

    const newOrder = [...columnOrder];
    newOrder.splice(oldIdx, 1);
    newOrder.splice(newIdx, 0, draggedCol);

    setColumnOrder(newOrder);
    localStorage.setItem('leadsColumnOrder', JSON.stringify(newOrder));
    setDraggedCol(null);
  };

  const toggleCol = (id: string) => {
    setVisibleCols(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id);
      return [...prev, id];
    });
  };

  const isCol = (id: string) => visibleCols.includes(id);

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    const diffDays = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 3600 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays < 30) return `${diffDays}d ago`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}M ago`;
  };

  const handleBulkEditSubmit = async (e: any) => {
    e.preventDefault();
    const status = e.target.status.value;
    if (!status || selectedLeads.length === 0) return;
    
    // In a real app we'd make a PUT request here to update multiple leads
    alert(`Successfully updated ${selectedLeads.length} leads to status: ${status}`);
    setShowBulkEdit(false);
    setSelectedLeads([]);
  };

  return (
    <>
      <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-2 sm:py-3 border-b border-gray-100 bg-white gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <input 
              type="checkbox" 
              checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-[#4f46e5] focus:ring-[#4f46e5] w-3.5 h-3.5 sm:w-4 sm:h-4" 
            />
            <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] sm:text-xs font-semibold flex items-center shrink-0">
              {selectedLeads.length > 0 ? `${selectedLeads.length} selected` : `1-${filteredLeads.length} of ${totalLeads}`}
            </span>
          </div>

          <div className="relative hidden md:block" ref={colMenuRef}>
            <button 
              onClick={() => setShowColMenu(!showColMenu)}
              className="flex items-center hover:text-gray-900 focus:outline-none"
            >
              ◫ Column <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
            </button>
            {showColMenu && (
              <div className="absolute left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2">
                <div className="text-xs font-semibold text-gray-700 px-2 pt-1">Customise view ({visibleCols.length}/12)</div>
                <div className="text-[10px] text-gray-400 px-2 pb-2">Select at max 12 fields</div>
                <div className="px-2 mb-2">
                   <input type="text" placeholder="Search fields" className="w-full border border-gray-200 rounded px-2 py-1 text-xs outline-none" />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {columnOrder.map(colId => {
    const col = allColumns.find(c => c.id === colId);
    if (!col) return null;
    return (
      <div 
        key={col.id} 
        draggable
        onDragStart={(e) => handleDragStart(e, col.id)}
        onDragOver={(e) => handleDragOver(e, col.id)}
        onDrop={(e) => handleDrop(e, col.id)}
        className={`flex items-center justify-between hover:bg-gray-50 rounded px-2 py-1.5 cursor-grab active:cursor-grabbing ${draggedCol === col.id ? 'opacity-50 bg-gray-100' : ''}`}
      >
        <div className="flex items-center flex-1">
          <GripVertical className="w-3.5 h-3.5 text-gray-400 mr-2 hover:text-gray-600 cursor-grab active:cursor-grabbing" />
          <label className="flex items-center flex-1 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isCol(col.id)} 
              onChange={() => toggleCol(col.id)} 
              className="rounded border-gray-300 text-[#4f46e5] focus:ring-[#4f46e5] mr-2"
            />
            <span className="text-xs text-gray-700 select-none">{col.label}</span>
          </label>
        </div>
      </div>
    );
  })}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2 relative">
          <button 
            onClick={() => {
              if (selectedLeads.length === 0) alert("Please select at least one lead first.");
              else setShowBulkEdit(true);
            }}
            className={`flex items-center px-3 py-1 border rounded text-sm transition-colors ${selectedLeads.length > 0 ? 'border-[#4f46e5] text-[#4f46e5] bg-purple-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Edit3 className="w-3.5 h-3.5 mr-1" /> Bulk Edit
          </button>
          
          {showBulkEdit && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
               <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 font-medium text-gray-800 flex justify-between">
                 Bulk Edit ({selectedLeads.length})
                 <button onClick={() => setShowBulkEdit(false)} className="text-gray-400 hover:text-gray-600">×</button>
               </div>
               <form onSubmit={handleBulkEditSubmit} className="p-4 space-y-4">
                 <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Update Status</label>
                   <select name="status" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#4f46e5]">
                     <option value="">Select new status...</option>
                      {LEAD_STATUS_OPTIONS.filter(opt => !['Fresh', 'RNR', 'Contacted'].includes(opt)).map(opt => (
                        <option key={opt} value={opt} className="bg-white text-gray-900 font-medium">{opt}</option>
                      ))}
                   </select>
                 </div>
                 <button type="submit" className="w-full bg-[#4f46e5] text-white rounded py-2 text-sm font-medium hover:bg-purple-700 transition-colors">
                   Apply Changes
                 </button>
               </form>
            </div>
          )}

            <div className="relative">
              <button 
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="flex items-center px-3 py-1 border border-gray-200 text-gray-600 rounded text-sm hover:bg-gray-50"
              >
                More <ChevronDown className="w-4 h-4 ml-1 text-gray-400" />
              </button>
              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">Actions</div>
                  <button onClick={downloadExcel} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-[#4f46e5] transition-colors">
                    📊 Download Excel
                  </button>
                  <button onClick={downloadPDF} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-[#4f46e5] transition-colors">
                    📄 Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* ── MOBILE CARD VIEW ── */}
      <div className="flex-1 overflow-auto md:hidden p-2 sm:p-3 space-y-2 bg-gray-50/50">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <div className="font-semibold text-gray-600">No leads yet</div>
            <div className="text-sm mt-1">Add your first lead to get started</div>
          </div>
        ) : filteredLeads.map((lead) => {
          const isSelected = selectedLeads.includes(lead.id);
          return (
            <div 
              key={lead.id} 
              className={`p-3 bg-white rounded-xl border transition-all shadow-2xs flex items-center justify-between gap-2.5 ${
                isSelected ? 'border-[#4f46e5] ring-1 ring-[#4f46e5]/30 bg-purple-50/20' : 'border-gray-200/80 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <input 
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelectLead(lead.id);
                  }}
                  className="rounded border-gray-300 text-[#4f46e5] focus:ring-[#4f46e5] w-4 h-4 mt-0.5 shrink-0" 
                />
                <Link 
                  href={`/leads/${lead.id}`}
                  className="flex-1 min-w-0 cursor-pointer block"
                >
                  <div className="font-bold text-gray-900 text-[14px] truncate flex items-center justify-between">
                    <span>{lead.name}</span>
                    <span className="text-gray-400 text-xs font-normal">›</span>
                  </div>
                  <div className="text-xs text-gray-500 font-medium truncate mt-0.5">
                    {lead.phone || '--'}
                    {((lead.customFields as any)?.alternatePhone || (lead as any).alternatePhone) && (
                      <span className="text-indigo-600 font-semibold ml-2">
                        · Alt: {(lead.customFields as any)?.alternatePhone || (lead as any).alternatePhone}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEAD_STATUS_COLORS[lead.status ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                      {lead.status ?? "Fresh"}
                    </span>
                    {(() => {
                      const cf = (lead.customFields as any) || {};
                      const isInactive48h = Boolean(cf.inactivity48hAlert);
                      const isRevisionActive = Boolean(cf.revisionAlertActive);
                      const isQuoteFollowUp = Boolean(cf.quotationFollowUpActive);
                      const isSiteVisitDue = cf?.siteVisit?.type === "Done" && cf.siteVisit.verifiedAt && (Date.now() - new Date(cf.siteVisit.verifiedAt).getTime() > 24 * 60 * 60 * 1000) && !["Quotation shared", "Estimated Quotation", "final Quotation", "Quotation Requested", "Revised Quotation", "Quotation without site visit", "Won", "Advance recieved", "Pay Pending"].includes(lead.status || "");
                      
                      if (isInactive48h) {
                        return (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-300">
                            🚨 48h Inactive
                          </span>
                        );
                      }
                      if (isSiteVisitDue) {
                        return (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            ⚠️ Site Visit Done (&gt;24h)
                          </span>
                        );
                      }
                      if (isRevisionActive) {
                        return (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                            📝 Revision Req.
                          </span>
                        );
                      }
                      if (isQuoteFollowUp) {
                        return (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300">
                            💬 Quote Follow-up
                          </span>
                        );
                      }

                      const isStatusFollowUp = (lead.status || "").toLowerCase().includes("follow");
                      const isAutoFollowUp = Boolean(cf.isAutoFollowUp || cf.staleConvertingAlert || cf.staleFollowUpReason);
                      if (!isStatusFollowUp && !isAutoFollowUp) return null;
                      let reason = cf.lastFollowUpNote || cf.staleFollowUpReason || cf.followUpReason || "";
                      if (!reason && Array.isArray(lead.notes) && lead.notes.length > 0) {
                        const userNote = lead.notes.find((n: any) => !n.content?.startsWith("[SYSTEM:"));
                        if (userNote?.content) reason = userNote.content;
                      }
                      if (!reason) return null;
                      return (
                        <span 
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 truncate max-w-[200px]"
                          title={reason}
                        >
                          💬 {reason}
                        </span>
                      );
                    })()}
                    {lead.source && (
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        lead.source.toLowerCase().includes('whatsapp') ? 'bg-green-100 text-green-800' :
                        lead.source.toLowerCase().includes('facebook') ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {lead.source}
                      </span>
                    )}
                    {lead.city && (
                      <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
                        📍 {lead.city}
                      </span>
                    )}
                  </div>
                </Link>
              </div>

              {lead.phone && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    triggerSmartCall(lead.id, lead.name, lead.phone);
                  }}
                  className="shrink-0 w-10 h-10 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-full flex items-center justify-center shadow-sm transition-all active:scale-95"
                  title="Smart Call"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP TABLE VIEW ── */}
      <div className="flex-1 overflow-auto hidden md:block">
        <table className="min-w-max w-full divide-y divide-gray-200 border-b border-gray-200">
          
            <thead className="bg-gray-100/80 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox" checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length} onChange={toggleSelectAll} className="rounded border-gray-300 text-[#4f46e5] focus:ring-[#4f46e5]" />
                </th>
                {columnOrder.filter(id => isCol(id)).map(colId => {
                  switch(colId) {
                    case 'name': return <React.Fragment key="name"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Name</th></React.Fragment>;
                    case 'status': return <React.Fragment key="status"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Status</th></React.Fragment>;
                    case 'followUpReason': return <React.Fragment key="followUpReason"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Follow-up Reason</th></React.Fragment>;
                    case 'tag': return <React.Fragment key="tag"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Tag</th></React.Fragment>;
                    case 'leadSource': return <React.Fragment key="leadSource"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Lead Source</th></React.Fragment>;
                    case 'approximateBudget': return <React.Fragment key="approximateBudget"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Approximate Budget</th></React.Fragment>;
                    case 'assignee': return <React.Fragment key="assignee"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Assignee</th></React.Fragment>;
                    case 'capturedOn': return <React.Fragment key="capturedOn"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Captured On ⇕</th></React.Fragment>;
                    case 'city': return <React.Fragment key="city"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">City</th></React.Fragment>;
                                        case 'siteVisitDate': return <React.Fragment key="siteVisitDate"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Site Visit Date ⇕</th></React.Fragment>;
                    case 'email': return <React.Fragment key="email"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Email</th></React.Fragment>;
                    case 'typeOfSpace': return <React.Fragment key="typeOfSpace"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Type of space</th></React.Fragment>;
                    case 'facebookAd': return <React.Fragment key="facebookAd"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Facebook Ad</th></React.Fragment>;
                    case 'facebookCampaign': return <React.Fragment key="facebookCampaign"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Facebook Campaign</th></React.Fragment>;
                    case 'phone': return <React.Fragment key="phone"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Phone</th></React.Fragment>;
                    case 'alternatePhone': return <React.Fragment key="alternatePhone"><th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Alternate Phone</th></React.Fragment>;
                    default: 
                      if (colId.startsWith('custom_')) {
                        const col = allColumns.find(c => c.id === colId);
                        return <th key={colId} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">{col?.label}</th>;
                      }
                      return null;
                  }
                })}
              </tr>
            </thead>
          <tbody className="bg-white divide-y divide-gray-200 text-sm">
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className={`hover:bg-gray-50/50 ${selectedLeads.includes(lead.id) ? 'bg-purple-50/30' : ''}`}>
                  <td className="px-4 py-2.5">
                    <input 
                      type="checkbox" 
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => toggleSelectLead(lead.id)}
                      className="rounded border-gray-300 text-[#4f46e5] focus:ring-[#4f46e5]" 
                    />
                  </td>
                  {columnOrder.filter(id => isCol(id)).map(colId => {
                    switch(colId) {
                      case 'name': return <React.Fragment key="name"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-[#4f46e5] font-semibold hover:underline text-left cursor-pointer"
                        title="Open Full Details"
                      >
                        {lead.name}
                      </Link>
                  </td></React.Fragment>;
                      case 'status': return <React.Fragment key="status"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${LEAD_STATUS_COLORS[lead.status ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                      {lead.status ?? "Fresh"}
                    </span>
                  </td></React.Fragment>;
                      case 'followUpReason': return <React.Fragment key="followUpReason">{(() => {
                    const cf = (lead.customFields as any) || {};
                    const isStatusFollowUp = (lead.status || "").toLowerCase().includes("follow");
                    const isAutoFollowUp = Boolean(cf.isAutoFollowUp || cf.staleConvertingAlert || cf.staleFollowUpReason);
                    const isInactive48h = Boolean(cf.inactivity48hAlert);
                    const isRevisionActive = Boolean(cf.revisionAlertActive);
                    const isQuoteFollowUp = Boolean(cf.quotationFollowUpActive);
                    const isSiteVisitDue = cf?.siteVisit?.type === "Done" && cf.siteVisit.verifiedAt && (Date.now() - new Date(cf.siteVisit.verifiedAt).getTime() > 24 * 60 * 60 * 1000) && !["Quotation shared", "Estimated Quotation", "final Quotation", "Quotation Requested", "Revised Quotation", "Quotation without site visit", "Won", "Advance recieved", "Pay Pending"].includes(lead.status || "");

                    let violationBadge = null;
                    if (isInactive48h) {
                      violationBadge = (
                        <span 
                          title={`Inactivity Alert: ${cf.inactivity48hHours || '>48'} hours with 0 calls in last 48 hours`}
                          className="inline-flex items-center text-red-900 bg-red-50 border border-red-300 px-2 py-0.5 rounded text-[11px] font-bold truncate max-w-full cursor-help shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse mr-1 shrink-0" />
                          <span className="truncate">🚨 48h Inactive (0 calls)</span>
                        </span>
                      );
                    } else if (isSiteVisitDue) {
                      violationBadge = (
                        <span 
                          title="Site visit verified >24h ago without advancing to quotation"
                          className="inline-flex items-center text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-bold truncate max-w-full cursor-help shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse mr-1 shrink-0" />
                          <span className="truncate">⚠️ Site Visit Done (&gt;24h)</span>
                        </span>
                      );
                    } else if (isRevisionActive) {
                      violationBadge = (
                        <span 
                          title="Quotation revision requested by client"
                          className="inline-flex items-center text-purple-900 bg-purple-50 border border-purple-300 px-2 py-0.5 rounded text-[11px] font-bold truncate max-w-full cursor-help shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mr-1 shrink-0" />
                          <span className="truncate">📝 Revision Requested</span>
                        </span>
                      );
                    } else if (isQuoteFollowUp) {
                      violationBadge = (
                        <span 
                          title="Quotation follow-up due (24h cycle)"
                          className="inline-flex items-center text-blue-900 bg-blue-50 border border-blue-300 px-2 py-0.5 rounded text-[11px] font-bold truncate max-w-full cursor-help shadow-2xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1 shrink-0" />
                          <span className="truncate">💬 Quote Follow-up Due</span>
                        </span>
                      );
                    }

                    let reason = cf.lastFollowUpNote || cf.staleFollowUpReason || cf.followUpReason || "";
                    if (!reason && Array.isArray(lead.notes) && lead.notes.length > 0) {
                      const userNote = lead.notes.find((n: any) => !n.content?.startsWith("[SYSTEM:"));
                      if (userNote?.content) reason = userNote.content;
                    }
                    const shouldShowReason = (isStatusFollowUp || isAutoFollowUp) && Boolean(reason);

                    return (
                      <td className="px-4 py-2.5 max-w-[260px] truncate border-r border-gray-100 text-xs">
                        {violationBadge ? (
                          <div className="flex flex-col gap-1 items-start">
                            {violationBadge}
                            {shouldShowReason && (
                              <span 
                                title={reason}
                                className="inline-flex items-center text-gray-700 text-[11px] truncate max-w-full"
                              >
                                {reason}
                              </span>
                            )}
                          </div>
                        ) : shouldShowReason ? (
                          <span 
                            title={reason}
                            className="inline-flex items-center text-gray-800 bg-amber-50 border border-amber-200/90 px-2.5 py-0.5 rounded-md text-xs font-medium truncate max-w-full cursor-help hover:bg-amber-100 transition-colors shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 shrink-0" />
                            <span className="truncate">{reason}</span>
                          </span>
                        ) : (
                          <span className="text-gray-300 font-mono text-center block">—</span>
                        )}
                      </td>
                    );
                  })()}</React.Fragment>;
                      case 'tag': return <React.Fragment key="tag"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100">
                    <select
                      value={lead.tag || ""}
                      onChange={async (e) => {
                        const val = e.target.value || null;
                        if (val === "__ADD_NEW__") {
                          if (!isAdmin) return;
                          const newTag = window.prompt("Enter new tag name:");
                          if (newTag && newTag.trim()) {
                            try {
                              const res = await addCustomTag(newTag.trim());
                              if (res.success) {
                                await updateLeadTag(lead.id, newTag.trim());
                              } else {
                                alert(res.error || "Failed to add tag");
                              }
                            } catch(e) {
                              alert("Failed to add new tag");
                            }
                          }
                          // Reset the select if they cancelled
                          e.target.value = lead.tag || "";
                          return;
                        }
                        try {
                          await updateLeadTag(lead.id, val);
                        } catch (err) {
                          alert('Failed to update tag');
                        }
                      }}
                      style={lead.tag ? { color: customTags.find((t: any) => t.name === lead.tag)?.color || 'inherit', fontWeight: 600 } : {}}
                      className="text-xs border-0 bg-transparent text-gray-500 hover:bg-gray-50 rounded px-1 py-0.5 focus:ring-0 cursor-pointer w-[140px]"
                    >
                      <option value="">-- No Tag --</option>
                      {customTags.map((t: any) => (
                        <option key={t.name} value={t.name}>{t.name}</option>
                      ))}
                      {isAdmin && <option value="__ADD_NEW__" className="text-[#4f46e5] font-bold">+ Add New Tag</option>}
                    </select>
                  </td></React.Fragment>;
                      case 'leadSource': return <React.Fragment key="leadSource"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      lead.source?.toLowerCase().includes('whatsapp') ? 'bg-green-100 text-green-800' : 
                      lead.source?.toLowerCase().includes('facebook') ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {lead.source || '--'}
                    </span>
                  </td></React.Fragment>;
                      case 'approximateBudget': return <React.Fragment key="approximateBudget"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100">
                    <span className="inline-flex px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-xs font-medium">
                      {lead.budget || '₹1l - ₹5l'}
                    </span>
                  </td></React.Fragment>;
                      case 'assignee': return <React.Fragment key="assignee"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-[#4f46e5] font-medium text-xs">
                    <div className="flex items-center">
                    {lead.assignedTo ? (
                      <>
                        <span className="w-6 h-6 rounded-full bg-purple-200 text-purple-800 flex items-center justify-center mr-2 text-[10px] uppercase">
                          {lead.assignedTo.name.substring(0, 2)}
                        </span>
                        {lead.assignedTo.name}
                      </>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                    </div>
                  </td></React.Fragment>;
                      case 'capturedOn': return <React.Fragment key="capturedOn"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600" title={new Date(lead.capturedOn || lead.createdAt).toLocaleString()}>
                    {lead.capturedOn ? timeAgo(lead.capturedOn) : timeAgo(lead.createdAt)}
                  </td></React.Fragment>;
                      case 'city': return <React.Fragment key="city"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600">
                    {lead.city || 'Thiruvananthapuram'}
                  </td></React.Fragment>;
                                            case 'siteVisitDate': return <React.Fragment key="siteVisitDate"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600">
                    {lead.customFields?.['Site Visit Date'] || lead.customFields?.['Site_Visit_Date'] || '--'}
                  </td></React.Fragment>;
                      case 'email': return <React.Fragment key="email"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600">
                    {lead.email || '--'}
                  </td></React.Fragment>;
                      case 'typeOfSpace': return <React.Fragment key="typeOfSpace"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600">
                    residential
                  </td></React.Fragment>;
                      case 'facebookAd': return <React.Fragment key="facebookAd"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600">
                    {lead.fbAd || 'Stelar Interiors | onam c...'}
                  </td></React.Fragment>;
                      case 'facebookCampaign': return <React.Fragment key="facebookCampaign"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600">
                    --
                  </td></React.Fragment>;
                      case 'phone': return <React.Fragment key="phone"><td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-900 font-medium">
  <div className="flex items-center justify-between">
  <span>{lead.phone}</span>
  <div className="flex space-x-2 ml-4">
    <button onClick={() => setHistoryPhone(lead.phone)} title="Call History" className="p-1 bg-purple-50 text-[#4f46e5] rounded hover:bg-purple-100 flex items-center justify-center">
      <History className="w-3.5 h-3.5" />
    </button>
                      <button type="button" onClick={() => triggerSmartCall(lead.id, lead.name, lead.phone)} title="Smart Call" className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center justify-center">📞</button>
                      <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="p-1 bg-green-50 text-emerald-500 rounded hover:bg-green-100 flex items-center justify-center">💬</a>
                      <div className="relative flex items-center justify-center">
                        <LeadActionsMenu leadId={lead.id} />
                      </div>
                    </div>
                  
</div>
</td></React.Fragment>;
                      case 'alternatePhone': {
                        const altPhone = (lead.customFields as any)?.alternatePhone || (lead as any).alternatePhone;
                        return (
                          <React.Fragment key="alternatePhone">
                            <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-900 font-medium">
                              {altPhone ? (
                                <div className="flex items-center justify-between">
                                  <span>{altPhone}</span>
                                  <div className="flex space-x-2 ml-4">
                                    <button onClick={() => setHistoryPhone(altPhone)} title="Call History" className="p-1 bg-purple-50 text-[#4f46e5] rounded hover:bg-purple-100 flex items-center justify-center">
                                      <History className="w-3.5 h-3.5" />
                                    </button>
                                    <button type="button" onClick={() => triggerSmartCall(lead.id, `${lead.name} (Alt)`, altPhone)} title="Smart Call" className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center justify-center">📞</button>
                                    <a href={`https://wa.me/${String(altPhone).replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="p-1 bg-green-50 text-emerald-500 rounded hover:bg-green-100 flex items-center justify-center">💬</a>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">--</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      }
                      default:
                        if (colId.startsWith('custom_')) {
                          const rawKey = colId.replace('custom_', '');
                          return (
                            <td key={colId} className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-700">
                              {typeof lead.customFields?.[rawKey] === "object" && lead.customFields?.[rawKey] !== null ? JSON.stringify(lead.customFields?.[rawKey]) : String(lead.customFields?.[rawKey] || "-")}
                            </td>
                          );
                        }
                        return null;
                    }
                  })}
    </tr>
            ))}
          </tbody>
        </table>
        {historyPhone && <CallHistoryModal phone={historyPhone} onClose={() => setHistoryPhone(null)} />}
      </div>
    </>
  );
}
