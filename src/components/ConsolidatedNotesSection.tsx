"use client";

import React, { useState } from "react";
import { FileText, PhoneCall, Layers } from "lucide-react";
import AddNoteForm from "@/components/AddNoteForm";
import { parseCallNotes } from "@/lib/callNotes";
import { formatDeterministicTimeAgo } from "@/lib/dateUtils";

interface ConsolidatedNotesSectionProps {
  leadId: string;
  notes: any[];
  calls: any[];
}

export function isSystemNoteContent(content: string): boolean {
  if (!content) return false;
  const t = content.trim();
  return (
    t.startsWith("[SYSTEM:") ||
    t.startsWith("[SYSTEM") ||
    t.startsWith("Site visit updated:") ||
    t.startsWith("Site visit status:")
  );
}

export default function ConsolidatedNotesSection({ leadId, notes = [], calls = [] }: ConsolidatedNotesSectionProps) {
  const [activeTab, setActiveTab] = useState<"ALL" | "GENERAL" | "CALLS">("ALL");

  // Only human notes (General Notes + Call Notes) in Consolidated Notes
  const parsedGeneralNotes: any[] = [];

  (notes || []).forEach((n: any) => {
    // Exclude system notes completely from Consolidated Notes
    if (!isSystemNoteContent(n.content)) {
      parsedGeneralNotes.push({
        id: "note-" + n.id,
        type: "General Note",
        content: n.content,
        date: n.createdAt,
        user: n.user?.name
      });
    }
  });

  const parsedCallNotes = (calls || [])
    .map((c: any) => ({ call: c, userNote: parseCallNotes(c.notes).userNote }))
    .filter((item: any) => Boolean(item.userNote))
    .map((item: any) => ({
      id: "call-" + item.call.id,
      type: "Call Note",
      content: item.userNote,
      date: item.call.createdAt,
      user: item.call.user?.name
    }));

  const allNotes = [...parsedGeneralNotes, ...parsedCallNotes].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const displayedNotes = allNotes.filter((n) => {
    if (activeTab === "GENERAL") return n.type === "General Note";
    if (activeTab === "CALLS") return n.type === "Call Note";
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6 mb-6">
      {/* Header with Title and Tabs */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50/50">
        <div className="flex items-center">
          <FileText className="w-4 h-4 mr-2 text-indigo-600" />
          <h2 className="text-[14px] font-bold text-gray-800">Consolidated Notes</h2>
          <span className="ml-2 text-[11px] font-medium bg-gray-200/80 text-gray-600 px-2 py-0.5 rounded-full">
            {allNotes.length}
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1 bg-gray-200/60 p-0.5 rounded-lg text-[10px] sm:text-[11px] font-semibold overflow-x-auto max-w-full shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeTab === "ALL"
                ? "bg-white text-gray-900 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All ({allNotes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("GENERAL")}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              activeTab === "GENERAL"
                ? "bg-white text-amber-700 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            General ({parsedGeneralNotes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("CALLS")}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              activeTab === "CALLS"
                ? "bg-white text-indigo-700 shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Calls ({parsedCallNotes.length})
          </button>
        </div>
      </div>

      {/* Add General Note Input */}
      <AddNoteForm leadId={leadId} />

      {/* Notes List */}
      <div className="divide-y divide-gray-100 max-h-[450px] overflow-y-auto">
        {displayedNotes.length === 0 ? (
          <div className="text-center py-10">
            <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <div className="text-[13px] font-medium text-gray-500">No {activeTab.toLowerCase()} notes found</div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {activeTab === "GENERAL" && "Use the box above to write a note about this lead."}
              {activeTab === "CALLS" && "Caller notes will appear here once calls are logged."}
              {activeTab === "ALL" && "No notes have been logged for this lead yet."}
            </div>
          </div>
        ) : (
          displayedNotes.map((note) => {
            const isCall = note.type === "Call Note";

            return (
              <div
                key={note.id}
                className={`px-5 py-3.5 flex items-start space-x-3 transition-colors ${
                  isCall ? "hover:bg-indigo-50/30" : "hover:bg-amber-50/30"
                }`}
              >
                {/* Icon Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isCall ? "bg-indigo-100 text-indigo-600" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {isCall ? (
                    <PhoneCall className="w-3.5 h-3.5 text-indigo-600" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-amber-700" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[12px] font-bold ${
                          isCall ? "text-indigo-900" : "text-gray-900"
                        }`}
                      >
                        {note.type}
                      </span>
                      {note.user && (
                        <span className="text-[11px] text-gray-500 font-normal">by {note.user}</span>
                      )}
                    </div>
                    <span suppressHydrationWarning className="text-[10px] text-gray-400 font-medium">
                      {formatDeterministicTimeAgo(note.date)}
                    </span>
                  </div>

                  <p className="text-[12px] text-gray-700 whitespace-pre-wrap leading-relaxed mt-0.5">
                    {note.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
