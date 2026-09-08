"use client";

import { useState } from "react";
import { MessageSquare, FileText, Loader2, ChevronDown, ChevronUp, Check, Pencil, Wand2 } from "lucide-react";

async function saveCallNotes(callId: string, notes: string) {
  const res = await fetch(`/api/call-notes/${callId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  return res.ok;
}

export default function CallLogCard({ log, leadPhone }: { log: any; leadPhone: string }) {
  const [notes, setNotes] = useState(log.notes || "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  const [whatsappDraft, setWhatsappDraft] = useState("");
  const [showWaDraft, setShowWaDraft] = useState(false);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    const ok = await saveCallNotes(log.id, notes);
    setSavingNotes(false);
    if (ok) {
      setEditingNotes(false);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    }
  };

  const handleTranscribe = async () => {
    if (!log.recordingUrl) return;
    setTranscribing(true);
    setTranscriptError(null);
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingUrl: log.recordingUrl }),
      });
      const data = await res.json();
      if (data.error) {
        setTranscriptError(data.error);
      } else {
        setTranscript(data.transcript);
        setShowTranscript(true);
        // Pre-fill WhatsApp draft
        const draft = `Hi, following up on our call today.\n\nKey points from our conversation:\n${data.transcript}\n\nLet me know if you have any questions!`;
        setWhatsappDraft(draft);
        setShowWaDraft(true);
      }
    } catch {
      setTranscriptError("Network error. Please try again.");
    }
    setTranscribing(false);
  };

  const sendWhatsApp = () => {
    const phone = leadPhone.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsappDraft)}`;
    window.open(url, "_blank");
  };

  function timeAgo(d: Date | string) {
    const ms = Date.now() - new Date(d).getTime();
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  function formatDuration(secs: number | null) {
    if (!secs || secs === 0) return "0s";
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }

  return (
    <div className="px-5 py-4">
      {/* Header row */}
      <div className="flex items-start space-x-4">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-semibold text-gray-800">Call Completed</span>
            <span className="text-[11px] text-gray-400">{timeAgo(log.createdAt)}</span>
          </div>
          <div className="flex items-center space-x-4 text-[12px] text-gray-500 mb-3">
            <span>? Duration: <strong className="text-gray-700">{formatDuration(log.duration)}</strong></span>
            <span className="text-gray-300">|</span>
            <span>{new Date(log.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
          </div>

          {/* Notes Section */}
          <div className="mb-3">
            {editingNotes ? (
              <div className="space-y-2 bg-purple-50/60 p-3 rounded-xl border border-purple-200">
                <label className="block text-[11px] font-bold text-[#613cbc] uppercase tracking-wider">
                  Call Summary / Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Type key discussion points, requirements, or follow-up notes..."
                  className="w-full text-xs text-gray-900 bg-white border border-purple-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#613cbc]/20 focus:border-[#613cbc] resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="flex items-center text-xs bg-[#613cbc] hover:bg-purple-800 text-white font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {savingNotes ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                    {savingNotes ? "Saving..." : "Save Note"}
                  </button>
                  <button 
                    onClick={() => { setEditingNotes(false); setNotes(log.notes || ""); }} 
                    className="text-xs text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {notes ? (
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 flex items-start justify-between">
                    <div className="flex items-start space-x-2 flex-1 mr-2">
                      <MessageSquare className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-bold text-amber-900 block text-[10px] uppercase tracking-wider mb-0.5">Call Note</span>
                        <span className="whitespace-pre-wrap text-gray-700 leading-relaxed">{notes}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setEditingNotes(true)} 
                      className="flex items-center text-[11px] font-bold text-[#613cbc] hover:bg-purple-50 px-2 py-1 rounded-md transition-colors flex-shrink-0 border border-purple-200 bg-white"
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="flex items-center text-xs font-bold text-[#613cbc] bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    {notesSaved ? "✓ Note Saved!" : "+ Add Call Note"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Audio Player + Transcribe */}
          {log.recordingUrl && (
            <div className="space-y-2">
              <audio controls className="w-full h-9">
                <source src={log.recordingUrl} type="audio/mpeg" />
              </audio>

              <button
                onClick={handleTranscribe}
                disabled={transcribing}
                className="flex items-center text-[11px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors disabled:opacity-60"
              >
                {transcribing ? (
                  <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Transcribing...</>
                ) : (
                  <><Wand2 className="w-3 h-3 mr-1.5" /> Transcribe & Draft WhatsApp Reply</>
                )}
              </button>

              {transcriptError && (
                <div className="text-[11px] text-red-500 bg-red-50 rounded-lg px-3 py-2">{transcriptError}</div>
              )}

              {transcript && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-[12px] font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    <span className="flex items-center"><FileText className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> Call Transcript</span>
                    {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {showTranscript && (
                    <div className="px-3 py-2 text-[12px] text-gray-600 bg-white leading-relaxed border-t border-gray-100">
                      {transcript}
                    </div>
                  )}
                </div>
              )}

              {showWaDraft && (
                <div className="border border-green-200 rounded-lg overflow-hidden">
                  <div className="px-3 py-2 bg-green-50 flex items-center justify-between">
                    <span className="text-[12px] font-semibold text-green-700">?? WhatsApp Reply Draft</span>
                    <button onClick={() => setShowWaDraft(false)} className="text-[11px] text-green-600 hover:text-green-800">?</button>
                  </div>
                  <div className="p-3">
                    <textarea
                      value={whatsappDraft}
                      onChange={(e) => setWhatsappDraft(e.target.value)}
                      className="w-full text-[12px] text-gray-700 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-green-400 resize-none"
                      rows={5}
                    />
                    <button
                      onClick={sendWhatsApp}
                      className="mt-2 flex items-center text-[12px] bg-[#25D366] hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg shadow-sm"
                    >
                      Send on WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
