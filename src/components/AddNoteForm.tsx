"use client";

import { useState } from "react";
import { StickyNote, Loader2 } from "lucide-react";
import { addNote } from "@/app/actions/noteActions";

export default function AddNoteForm({ leadId }: { leadId: string }) {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    await addNote(leadId, content);
    setContent("");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 bg-yellow-50 border-b border-yellow-100">
      <textarea
        placeholder="Add a general note about this lead..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full text-[13px] border border-yellow-200 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 resize-none bg-white"
        rows={3}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="flex items-center text-[12px] bg-yellow-500 hover:bg-yellow-600 text-white font-bold px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <StickyNote className="w-3.5 h-3.5 mr-1.5" />}
          Add Note
        </button>
      </div>
    </form>
  );
}