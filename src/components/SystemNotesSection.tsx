"use client";

import React, { useState } from "react";
import { Bot, Activity, ChevronDown, ChevronUp } from "lucide-react";
import { formatDeterministicTimeAgo } from "@/lib/dateUtils";
import { isSystemNoteContent } from "@/components/ConsolidatedNotesSection";

interface SystemNotesSectionProps {
  notes: any[];
}

function parseSystemNoteDetails(content: string) {
  const t = content.trim();
  if (t.startsWith("[SYSTEM:") || t.startsWith("[SYSTEM")) {
    const endBracket = t.indexOf("]");
    if (endBracket !== -1) {
      const title = t.substring(t.indexOf(":") !== -1 ? t.indexOf(":") + 1 : 7, endBracket).trim();
      const body = t.substring(endBracket + 1).trim();
      return { title, body };
    }
  }
  if (t.startsWith("Site visit updated:")) {
    return {
      title: "Site Visit Updated",
      body: t.replace(/^Site visit updated:\s*/i, "").trim()
    };
  }
  return { title: "Automated System Event", body: t };
}

export default function SystemNotesSection({ notes = [] }: SystemNotesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const systemNotes = (notes || [])
    .filter((n: any) => isSystemNoteContent(n.content))
    .map((n: any) => ({
      id: "sys-note-" + n.id,
      content: n.content,
      date: n.createdAt,
      user: n.user?.name
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (systemNotes.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6 mb-10">
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-slate-50/70 cursor-pointer hover:bg-slate-100/70 transition-colors select-none"
      >
        <div className="flex items-center">
          <Bot className="w-4 h-4 mr-2 text-blue-600" />
          <h2 className="text-[14px] font-bold text-gray-800">System Notes & Workflow Activity</h2>
          <span className="ml-2 text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
            {systemNotes.length}
          </span>
        </div>

        <div className="flex items-center text-gray-400 hover:text-gray-600 text-xs font-semibold">
          <span className="mr-1 hidden sm:inline">{isExpanded ? "Collapse" : "Expand"}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* System Notes List */}
      {isExpanded && (
        <div className="divide-y divide-gray-100 max-h-[380px] overflow-y-auto">
          {systemNotes.map((note) => {
            const details = parseSystemNoteDetails(note.content);

            return (
              <div
                key={note.id}
                className="px-5 py-3.5 flex items-start space-x-3 bg-slate-50/30 hover:bg-slate-50/70 transition-colors border-l-2 border-blue-400"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 ring-4 ring-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4 text-blue-700" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-blue-950">System Event</span>
                      <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                        Automated
                      </span>
                    </div>
                    <span suppressHydrationWarning className="text-[10px] text-gray-400 font-medium">
                      {formatDeterministicTimeAgo(note.date)}
                    </span>
                  </div>

                  <div className="bg-white border border-blue-100/90 rounded-lg p-2.5 shadow-2xs mt-1">
                    <div className="font-semibold text-slate-800 text-[12px] flex items-center gap-1.5 text-blue-950">
                      <Activity className="w-3.5 h-3.5 text-blue-500" />
                      {details.title}
                    </div>
                    {details.body && (
                      <p className="text-[11.5px] text-slate-600 whitespace-pre-wrap leading-relaxed mt-1">
                        {details.body}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
