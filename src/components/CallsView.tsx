"use client";

import React, { useState } from "react";
import { RefreshCw, Search, Filter, AtSign, ChevronRight, Star, PhoneCall, Phone, Mail, MapPin, User, Calendar } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { triggerSmartCall } from "@/components/SmartCallManager";
import SearchBar from "@/components/SearchBar";
import { updateCallNote } from "@/app/actions/callActions";

export default function CallsView({ leads }: { leads: any[] }) {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => setIsMounted(true), []);

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(leads.length > 0 ? leads[0].id : null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  return (
    <div className="flex flex-col flex-1 overflow-hidden h-full">
      {/* Sub-header Toolbar: Responsive and hides on mobile when drilldown into lead */}
      <div className={`${showMobileDetail ? "hidden md:flex" : "flex"} flex-col sm:flex-row h-auto sm:h-14 px-3 sm:px-4 md:px-6 py-2.5 sm:py-0 border-b border-gray-100 sm:items-center shrink-0 justify-between gap-2.5 sm:gap-3 bg-white`}>
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h1 className="text-[16px] sm:text-[17px] font-bold text-gray-800 flex items-center whitespace-nowrap">
            My Calls <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-2.5 text-[#4f46e5] cursor-pointer hover:rotate-180 transition-transform duration-500" onClick={() => window.location.reload()} />
          </h1>
          <div className="flex items-center space-x-2 sm:hidden">
            <button className="flex items-center px-2.5 py-1 text-gray-600 bg-gray-50 border border-gray-200 rounded text-xs hover:bg-gray-100 transition-colors">
              <Filter className="w-3.5 h-3.5 mr-1" /> Filters
            </button>
          </div>
        </div>
        
        <div className="w-full sm:flex-1 sm:max-w-md">
           <SearchBar placeholder="Search callers by name or phone..." />
        </div>

        <div className="hidden sm:flex items-center space-x-2">
          <button className="flex items-center px-3 py-1.5 text-gray-600 bg-gray-50 border border-gray-200 rounded text-sm hover:bg-gray-100 transition-colors">
            <Filter className="w-4 h-4 mr-1.5" /> Filters
          </button>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-full">
        {/* Left Panel: Calls List */}
        <div className={`${showMobileDetail ? "hidden md:flex" : "flex"} w-full md:w-[380px] border-r border-gray-200 flex-col bg-white shrink-0 h-full overflow-y-auto`}>
        {leads.map((lead, i) => {
          const isSelected = selectedLeadId === lead.id;
          return (
            <div 
              key={lead.id} 
              onClick={() => { setSelectedLeadId(lead.id); setShowMobileDetail(true); }}
              className={`p-4 border-b border-gray-100 cursor-pointer ${isSelected ? 'bg-purple-50 border-l-4 border-l-[#4f46e5]' : 'hover:bg-gray-50'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className={`text-[15px] font-bold truncate pr-2 ${isSelected ? 'text-[#4f46e5]' : 'text-gray-800'}`}>
                  {lead.name}
                </div>
                <div className="flex items-center shrink-0 space-x-2">
                  {lead.phone && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerSmartCall(lead.id, lead.name, lead.phone);
                      }}
                      className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-sm"
                      title="Smart Call"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                  )}
                  <div className="flex items-center text-gray-400 text-[11px] font-medium shrink-0 ml-1">
                    <div className="w-6 h-6 rounded-full bg-[#E8E2F7] text-[#4f46e5] flex items-center justify-center text-[10px] font-bold mr-1">
                      {lead.assignedTo?.name ? lead.assignedTo.name.substring(0,2).toUpperCase() : 'UN'}
                    </div>
                    <ChevronRight className="w-4 h-4 hidden md:block" />
                  </div>
                </div>
              </div>
              
              <div className="text-[12px] text-gray-500 font-medium mb-2">{lead.phone}</div>
              
              <div className="flex items-center space-x-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200 text-gray-700`}>
                  {lead.status}
                </span>
              </div>
              
              <div className="flex items-center text-[11px]">
                <PhoneCall className={`w-3 h-3 mr-1 ${lead.calls?.length > 0 ? 'text-green-500' : 'text-gray-400'}`} />
                <span className={`font-bold mr-1 ${lead.calls?.length > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                  {lead.calls?.length || 0} Calls
                </span>
                <span className="text-gray-400 ml-auto">
                  {lead.createdAt ? formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true }) : ''}
                </span>
              </div>
            </div>
          );
        })}
        {leads.length === 0 && (
          <div className="p-8 text-center text-gray-500 text-sm">No leads found.</div>
        )}
      </div>

      {/* Right Panel: Detail View */}
      <div className={`${showMobileDetail ? "flex flex-col" : "hidden md:flex"} flex-1 bg-gray-50 md:border-t border-gray-200 shadow-inner overflow-y-auto p-4 md:p-8`}>
        {selectedLead ? (
          <div className="max-w-3xl mx-auto">
            
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
              {/* Mobile Back Button */}
              <button onClick={() => setShowMobileDetail(false)} className="md:hidden flex items-center text-[#4f46e5] font-bold text-sm mb-4 bg-purple-50 px-3 py-1.5 rounded-lg">
                <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Back to Leads
              </button>
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">{selectedLead.name}</h2>
                  <div className="text-sm font-medium text-[#4f46e5] bg-purple-50 inline-flex px-3 py-1 rounded-full">
                    {selectedLead.status}
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  {selectedLead.phone && (
                    <>
                      <a
                        href={`https://wa.me/${selectedLead.phone?.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 sm:flex-none justify-center items-center flex px-3 py-2 bg-green-500 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-green-600 transition-colors"
                        title="Open in WhatsApp"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        WhatsApp
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedLead?.phone) {
                            triggerSmartCall(selectedLead.id, selectedLead.name, selectedLead.phone);
                          }
                        }}
                        className="flex-1 sm:flex-none justify-center items-center flex px-4 py-2 bg-[#10b981] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-emerald-600 transition-colors"
                      >
                        <Phone className="w-4 h-4 mr-2" /> Call Now
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm break-all sm:break-normal">
                <div className="flex items-center text-gray-600">
                  <Phone className="w-4 h-4 mr-3 text-gray-400" />
                  <span className="font-medium text-gray-800">{selectedLead.phone}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Mail className="w-4 h-4 mr-3 text-gray-400" />
                  <span>{selectedLead.email || 'No email provided'}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                  <span>{selectedLead.city || 'Unknown Location'}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <User className="w-4 h-4 mr-3 text-gray-400" />
                  <span>Assigned to: <strong className="text-gray-800">{selectedLead.assignedTo?.name || 'Unassigned'}</strong></span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-3 text-gray-400" />
                  <span>Added: {selectedLead.createdAt ? new Date(selectedLead.createdAt).toLocaleDateString('en-GB') : ''}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <span className="font-bold mr-2 text-gray-400">Budget:</span>
                  <span>{selectedLead.budget || 'Not specified'}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <span className="font-bold mr-2 text-gray-400">Source:</span>
                  <span className="uppercase text-xs font-bold tracking-wider">{selectedLead.source}</span>
                </div>
              </div>
            </div>

            {/* Call History Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Call History</h3>
              
              {(!selectedLead.calls || selectedLead.calls.length === 0) ? (
                <div className="text-center text-gray-500 py-6 text-sm">
                  No call logs available for this lead.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedLead.calls.map((call: any, index: number) => (
                    <CallLogItem key={call.id || index} call={call} />
                  ))}
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="text-center text-gray-400 mt-20">
            <User className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>Select a lead from the left to view details</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
}

function CallLogItem({ call }: { call: any }) {
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => setIsMounted(true), []);
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState(call.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateCallNote(call.id, noteText);
    setSaving(false);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col bg-gray-50 p-4 rounded-lg border border-gray-100">
      <div className="flex justify-between items-center mb-2">
        <span className="font-bold text-gray-800 text-sm" suppressHydrationWarning>
          {isMounted ? format(new Date(call.createdAt), 'dd MMM yyyy, hh:mm aa') : ''}
        </span>
        <div className="flex items-center space-x-2">
          {call.recordingUrl && (
            <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded flex items-center">
              🎙️ Recording
            </span>
          )}
          <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-800 rounded">
            {call.duration} seconds
          </span>
        </div>
      </div>
      
      {(!isEditing && call.notes) && (
        <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">{call.notes}</p>
      )}

      {call.recordingUrl && (
        <div className="mt-2 mb-3">
           <audio controls className="w-full h-8">
             <source src={call.recordingUrl} type="audio/mpeg" />
             Your browser does not support the audio element.
           </audio>
        </div>
      )}

      {isEditing ? (
        <div className="mt-2">
          <textarea 
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:border-[#4f46e5] min-h-[80px]"
            placeholder="Write a note about this call..."
          />
          <div className="flex space-x-2 mt-2">
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-[#4f46e5] text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-purple-800 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Note"}
            </button>
            <button 
              onClick={() => { setIsEditing(false); setNoteText(call.notes || ""); }}
              className="bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1">
          <button 
            onClick={() => {
              setNoteText(call.notes || "");
              setIsEditing(true);
            }}
            className="text-xs font-semibold text-[#4f46e5] hover:underline"
          >
            {call.notes ? "Edit Note" : "+ Add Note"}
          </button>
        </div>
      )}
    </div>
  );
}
