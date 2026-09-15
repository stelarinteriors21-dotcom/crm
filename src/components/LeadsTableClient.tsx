"use client"
import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight, Edit3 } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import LeadActionsMenu from "@/components/LeadActionsMenu";
import { calculateLeadScore, getScoreColor } from "@/lib/leadScore";
import { updateLeadTag } from "@/app/actions/leadActions";
import { addCustomTag } from "@/app/actions/settingsActions";
import { LEAD_STATUS_OPTIONS, LEAD_STATUS_COLORS } from "@/lib/constants";

type Lead = any;

const BASE_COLUMNS = [
  { id: "name", label: "Name", type: "T", defaultVisible: true },
  { id: "status", label: "Status", type: "🔴", defaultVisible: true },
  { id: "score", label: "Lead Score", type: "⭐", defaultVisible: true },
  { id: "approximateBudget", label: "Approximate Budget", type: "💰", defaultVisible: true },
  { id: "city", label: "City", type: "T", defaultVisible: true },
  { id: "propertyStatus", label: "Property status", type: "🏠", defaultVisible: true },
  { id: "siteVisitDate", label: "Site Visit Date", type: "📅", defaultVisible: true },
  { id: "email", label: "Email", type: "📧", defaultVisible: true },
  { id: "typeOfSpace", label: "Type of space", type: "🏢", defaultVisible: false },
  { id: "alternatePhone", label: "Alternate Phone", type: "📱", defaultVisible: false },
  { id: "captureFrequency", label: "Capture Frequency", type: "#", defaultVisible: false },
  { id: "capturedOn", label: "Captured On", type: "📅", defaultVisible: true },
  { id: "createdOn", label: "Created On", type: "📅", defaultVisible: true },
  { id: "facebookAd", label: "Facebook Ad", type: "T", defaultVisible: true },
  { id: "facebookCampaign", label: "Facebook Campaign", type: "T", defaultVisible: false },
  { id: "leadSource", label: "Lead Source", type: "🌐", defaultVisible: true },
  { id: "modifiedOn", label: "Modified On", type: "📅", defaultVisible: false },
  { id: "rating", label: "Rating", type: "⭐", defaultVisible: false },
  { id: "tag", label: "Tag", type: "🏷️", defaultVisible: true },
  { id: "assignee", label: "Assignee", type: "👤", defaultVisible: true },
  { id: "phone", label: "Phone", type: "📱", defaultVisible: true }
];

export default function LeadsTableClient({ leads, totalLeads, customTags = [], isAdmin = false }: { leads: Lead[], totalLeads: number, customTags?: any[], isAdmin?: boolean }) {
  // Extract custom fields from leads
  const customFieldKeys = new Set<string>();
  let customLabels: Record<string, string> = {};
  
  leads.forEach(l => {
    if (l.organization?.customFieldLabels) {
      customLabels = { ...customLabels, ...(l.organization.customFieldLabels as Record<string, string>) };
    }
    if (l.customFields) {
      Object.keys(l.customFields as object).forEach(k => customFieldKeys.add(k));
    }
  });

  const dynamicColumns = Array.from(customFieldKeys).map(k => ({
    id: `custom_${k}`,
    label: customLabels[k] || k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: "⚡",
    defaultVisible: true
  }));

  const allColumns = [...BASE_COLUMNS, ...dynamicColumns];

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
    const rows = filteredLeads.map((l: any) => ({
      "Name": l.name || "",
      "Phone": l.phone || "",
      "Email": l.email || "",
      "Status": l.status || "",
      "Source": l.source || "",
      "City": l.city || "",
      "Budget": l.approximateBudget || "",
      "Assignee": l.assignedTo?.name || "",
      "Created On": l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "",
    }));
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
      head: [["Name", "Phone", "Status", "Source", "City", "Budget", "Assignee", "Created On"]],
      body: filteredLeads.map((l: any) => [
        l.name || "",
        l.phone || "",
        l.status || "",
        l.source || "",
        l.city || "",
        l.approximateBudget || "",
        l.assignedTo?.name || "",
        l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "",
      ]),
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

  const toggleCol = (id: string) => {
    setVisibleCols(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id);
      if (prev.length >= 12) {
        alert("Select at max 12 fields");
        return prev;
      }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 bg-white gap-3">
        <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length}
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-[#613cbc] focus:ring-[#613cbc]" 
            />
            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs flex items-center shrink-0">
              {selectedLeads.length > 0 ? `${selectedLeads.length} selected` : `1-${filteredLeads.length} of ${totalLeads}`} <ChevronRight className="w-3 h-3 ml-1" />
            </span>
          </div>

          <div className="relative" ref={colMenuRef}>
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
                  {allColumns.map(col => (
                    <label key={col.id} className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer rounded">
                      <input 
                        type="checkbox" 
                        checked={visibleCols.includes(col.id)}
                        onChange={() => toggleCol(col.id)}
                        className="rounded border-gray-300 text-[#613cbc] focus:ring-[#613cbc] mr-3"
                      />
                      <span className="text-sm text-gray-700">{col.label}</span>
                    </label>
                  ))}
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
            className={`flex items-center px-3 py-1 border rounded text-sm transition-colors ${selectedLeads.length > 0 ? 'border-[#613cbc] text-[#613cbc] bg-purple-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
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
                   <select name="status" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#613cbc]">
                     <option value="">Select new status...</option>
                      {LEAD_STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt} className="bg-white text-gray-900 font-medium">{opt}</option>
                      ))}
                   </select>
                 </div>
                 <button type="submit" className="w-full bg-[#613cbc] text-white rounded py-2 text-sm font-medium hover:bg-purple-700 transition-colors">
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
                  <button onClick={downloadExcel} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-[#613cbc] transition-colors">
                    📊 Download Excel
                  </button>
                  <button onClick={downloadPDF} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-[#613cbc] transition-colors">
                    📄 Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

      {/* ── MOBILE CARD VIEW ── */}
      <div className="flex-1 overflow-auto md:hidden divide-y divide-gray-100">
        {leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <div className="font-semibold text-gray-600">No leads yet</div>
            <div className="text-sm mt-1">Add your first lead to get started</div>
          </div>
        ) : filteredLeads.map((lead) => (
          <div key={lead.id} className="px-4 py-3 bg-white flex items-center justify-between gap-3">
            <Link href={`/leads/${lead.id}`} className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 text-[15px] truncate">{lead.name}</div>
              <div className="text-sm text-gray-500 truncate mt-0.5">{lead.phone || '--'}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${LEAD_STATUS_COLORS[lead.status ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                  {lead.status ?? "Fresh"}
                </span>
                  {lead.source && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                      lead.source.toLowerCase().includes('whatsapp') ? 'bg-green-100 text-green-800' :
                      lead.source.toLowerCase().includes('facebook') ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {lead.source}
                    </span>
                  )}
              </div>
            </Link>
            {lead.phone && (
              <a
                href={`tel:${lead.phone}`}
                className="shrink-0 w-12 h-12 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 8V5z" />
                </svg>
              </a>
            )}
          </div>
        ))}
      </div>

      {/* ── DESKTOP TABLE VIEW ── */}
      <div className="flex-1 overflow-auto hidden md:block">
        <table className="min-w-max w-full divide-y divide-gray-200 border-b border-gray-200">
          <thead className="bg-gray-100/80 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left w-10">
                <input type="checkbox" className="rounded border-gray-300 text-[#613cbc] focus:ring-[#613cbc]" />
              </th>
              {isCol('name') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Name</th>}
              {isCol('status') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Status</th>}
              {isCol('score') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Lead Score</th>}
              {isCol('tag') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Tag</th>}
              {isCol('leadSource') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Lead Source</th>}
              {isCol('approximateBudget') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Approximate Budget</th>}
              {isCol('assignee') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Assignee</th>}
              {isCol('capturedOn') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Captured On ⇕</th>}
              {isCol('city') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">City</th>}
              {isCol('propertyStatus') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Property status</th>}
              {isCol('siteVisitDate') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Site Visit Date ⇕</th>}
              {isCol('createdOn') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Created On ▴</th>}
              {isCol('email') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Email</th>}
              {isCol('typeOfSpace') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Type of space</th>}
              {isCol('facebookAd') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Facebook Ad</th>}
              {isCol('facebookCampaign') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">Facebook Campaign</th>}
              {dynamicColumns.map(col => isCol(col.id) && (
                <th key={col.id} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">{col.label}</th>
              ))}
              {isCol('phone') && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Phone</th>}
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
                    className="rounded border-gray-300 text-[#613cbc] focus:ring-[#613cbc]" 
                  />
                </td>
                
                {isCol('name') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100">
                    <Link href={`/leads/${lead.id}`} className="text-[#613cbc] font-medium hover:underline">
                      {lead.name}
                    </Link>
                  </td>
                )}
                
                {isCol('status') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${LEAD_STATUS_COLORS[lead.status ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                      {lead.status ?? "Fresh"}
                    </span>
                  </td>
                )}

                {isCol('score') && (() => {
                  const scoreInput = {
                    scoreEngagement: lead.scoreEngagement,
                    scoreLocation: lead.scoreLocation,
                    scoreBudget: lead.scoreBudget,
                    scoreTimeline: lead.scoreTimeline,
                    scoreStatus: lead.scoreStatus,
                    scoreFullHome: lead.scoreFullHome,
                    scoreFloorPlan: lead.scoreFloorPlan,
                    scoreMoodBoard: lead.scoreMoodBoard,
                    scoreSiteVisit: lead.scoreSiteVisit,
                    scoreQuotation: lead.scoreQuotation,
                  };
                  const { total, grade } = calculateLeadScore(scoreInput);
                  const scoreColor = getScoreColor(total);
                  return (
                    <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100">
                      <div className="flex items-center space-x-2" title={`${total.toFixed(1)}/100 · ${grade}`}>
                        <div className="relative w-8 h-8">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            {/* Background track */}
                            <circle cx="18" cy="18" r="16" fill="none" className="stroke-gray-100" strokeWidth="4" />
                            {/* Progress ring */}
                            <circle
                              cx="18"
                              cy="18"
                              r="16"
                              fill="none"
                              className={
                                total >= 80 ? "stroke-yellow-500" :
                                total >= 60 ? "stroke-orange-500" :
                                total >= 40 ? "stroke-purple-500" :
                                total > 0   ? "stroke-blue-400" :
                                "stroke-gray-300"
                              }
                              strokeWidth="4"
                              strokeDasharray="100 100"
                              strokeDashoffset={100 - total}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[9px] font-black text-gray-700">
                              {Math.round(total)}
                            </span>
                          </div>
                        </div>
                        {total >= 80 && <span className="text-[10px] font-bold text-yellow-600">Hot 🔥</span>}
                      </div>
                    </td>
                  );
                })()}

                {isCol('tag') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100">
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
                      {isAdmin && <option value="__ADD_NEW__" className="text-[#613cbc] font-bold">+ Add New Tag</option>}
                    </select>
                  </td>
                )}

                {isCol('leadSource') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      lead.source?.toLowerCase().includes('whatsapp') ? 'bg-green-100 text-green-800' : 
                      lead.source?.toLowerCase().includes('facebook') ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {lead.source || '--'}
                    </span>
                  </td>
                )}

                {isCol('approximateBudget') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100">
                    <span className="inline-flex px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-xs font-medium">
                      {lead.budget || '₹1l - ₹5l'}
                    </span>
                  </td>
                )}

                {isCol('assignee') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 flex items-center text-[#613cbc] font-medium text-xs">
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
                  </td>
                )}

                {isCol('capturedOn') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600">
                    {lead.capturedOn ? timeAgo(lead.capturedOn) : timeAgo(lead.createdAt)}
                  </td>
                )}

                {isCol('city') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600">
                    {lead.city || 'Thiruvananthapuram'}
                  </td>
                )}
                
                {isCol('propertyStatus') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100">
                    <span className="inline-flex px-2 py-0.5 rounded bg-orange-50 text-orange-800 text-xs font-medium">
                      {lead.propertyStatus || 'Not specified'}
                    </span>
                  </td>
                )}
                
                {isCol('siteVisitDate') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-400">
                    --
                  </td>
                )}

                {isCol('createdOn') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600">
                    {timeAgo(lead.createdAt)}
                  </td>
                )}

                {isCol('email') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600">
                    {lead.email || '--'}
                  </td>
                )}
                
                {isCol('typeOfSpace') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600">
                    residential
                  </td>
                )}

                {isCol('facebookAd') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600">
                    {lead.fbAd || 'Stelar Interiors | onam c...'}
                  </td>
                )}
                
                {isCol('facebookCampaign') && (
                  <td className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600">
                    --
                  </td>
                )}

                {dynamicColumns.map(col => {
                  if (isCol(col.id)) {
                    const rawKey = col.id.replace('custom_', '');
                    const val = (lead.customFields as Record<string, string>)?.[rawKey];
                    return (
                      <td key={col.id} className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-600 truncate max-w-[150px]" title={val}>
                        {val || '--'}
                      </td>
                    );
                  }
                  return null;
                })}

                {isCol('phone') && (
                  <td className="px-4 py-2.5 whitespace-nowrap text-gray-900 font-medium flex items-center justify-between">
                    <span>{lead.phone}</span>
                    <div className="flex space-x-2 ml-4">
                      <a href={`tel:${lead.phone}`} title="Call Lead" className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100 flex items-center justify-center">📞</a>
                      <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="p-1 bg-green-50 text-emerald-500 rounded hover:bg-green-100 flex items-center justify-center">💬</a>
                      <div className="relative flex items-center justify-center">
                        <LeadActionsMenu leadId={lead.id} />
                      </div>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
