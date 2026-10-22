"use client";

import React, { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { acceptLead, rejectLead } from '@/app/actions/leadActions';
import { triggerSmartCall } from '@/components/SmartCallManager';

export default function PendingLeadsBanner({ initialLeads }: { initialLeads: any[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (leads.length === 0) return null;

  const handleAccept = async (leadId: string) => {
    setLoadingId(leadId);
    await acceptLead(leadId);
    setLeads(leads.filter(l => l.id !== leadId));
    setLoadingId(null);
  };

  const handleReject = async (leadId: string) => {
    setLoadingId(leadId);
    await rejectLead(leadId);
    setLeads(leads.filter(l => l.id !== leadId));
    setLoadingId(null);
  };

  return (
    <div className="mb-6">
      <h3 className="text-[13px] font-bold text-gray-800 mb-2">New Leads Assigned to You ({leads.length})</h3>
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm p-4 space-y-3">
        {leads.map(lead => (
          <div key={lead.id} className="flex items-center justify-between bg-white p-3 rounded shadow-sm border border-yellow-100">
            <div>
              <div className="font-bold text-[14px] text-gray-800">{lead.name}</div>
              <div className="text-[12px] text-gray-500 mt-1">{lead.phone} • {lead.source}</div>
              <div className="text-[10px] text-red-500 mt-1 font-bold">
                Accept within 10 minutes or it will be escalated to admin.
              </div>
            </div>
              <div className="flex space-x-2 shrink-0">
                <button
                  onClick={() => {
                    handleAccept(lead.id);
                    triggerSmartCall(lead.id, lead.name, lead.phone);
                  }}
                  disabled={loadingId === lead.id}
                  className="flex items-center px-3 py-1.5 bg-green-600 text-white text-[11px] font-bold rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" /> Call
                </button>
                <button
                  onClick={() => handleReject(lead.id)}
                  disabled={loadingId === lead.id}
                  className="flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 text-[11px] font-bold rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Pass
                </button>
              </div>
          </div>
        ))}
      </div>
    </div>
  );
}
