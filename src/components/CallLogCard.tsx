"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { formatDeterministicDate, formatDeterministicTimeAgo } from "@/lib/dateUtils";
import { MessageSquare, FileText, Loader2, ChevronDown, ChevronUp, Check, Pencil, Wand2, Clock, MessageCircle, X, Music, Search, Upload } from "lucide-react";

async function saveCallNotes(callId: string, notes: string) {
  const res = await fetch(`/api/call-notes/${callId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  return res.ok;
}

import { parseCallNotes } from "@/lib/callNotes";
import { getRecordingUploadUrl, attachRecordingToCall } from "@/app/actions/callActions";

export default function CallLogCard({ log, leadPhone }: { log: any; leadPhone: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { userNote: initialUserNote } = parseCallNotes(log.notes);

  const [notes, setNotes] = useState(initialUserNote);
  const [displayNotes, setDisplayNotes] = useState(initialUserNote);
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const [currentRecordingUrl, setCurrentRecordingUrl] = useState<string | null>(log.recordingUrl || null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isScanningPhone, setIsScanningPhone] = useState(false);
  const [audioFeedback, setAudioFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
      setDisplayNotes(notes.trim());
      setEditingNotes(false);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
      router.refresh();
    }
  };

  const handleTranscribe = async () => {
    if (!currentRecordingUrl) return;
    setTranscribing(true);
    setTranscriptError(null);
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingUrl: currentRecordingUrl }),
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAudio(true);
    setAudioFeedback(null);
    try {
      // 1. Direct to Supabase Storage via signed URL (bypasses Vercel 4.5MB limit, supports recordings up to 50MB and MP4)
      const uploadUrlRes = await getRecordingUploadUrl(log.leadId, file.name);

      if (uploadUrlRes && uploadUrlRes.success && uploadUrlRes.signedUrl && uploadUrlRes.publicUrl) {
        const directUploadRes = await fetch(uploadUrlRes.signedUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "audio/mpeg"
          }
        });

        if (directUploadRes.ok) {
          const attachRes = await attachRecordingToCall(log.id, uploadUrlRes.publicUrl, log.duration);
          if (attachRes?.success) {
            setCurrentRecordingUrl(uploadUrlRes.publicUrl);
            setAudioFeedback({ type: "success", message: "Audio recording attached successfully!" });
            router.refresh();
            return;
          }
        }
      }

      // 2. Fallback: upload via standard endpoint
      const fd = new FormData();
      fd.append("audio", file);
      fd.append("callId", log.id);
      fd.append("leadId", log.leadId);
      fd.append("phone", leadPhone);
      fd.append("duration", (log.duration || 0).toString());

      const res = await fetch("/api/mobile/call-logs", {
        method: "POST",
        body: fd,
      });

      if (res.ok) {
        const data = await res.json();
        const url = data.callLog?.recordingUrl;
        if (url) {
          setCurrentRecordingUrl(url);
          setAudioFeedback({ type: "success", message: "Audio recording attached successfully!" });
          router.refresh();
        } else {
          setAudioFeedback({ type: "error", message: "Audio uploaded, refresh to listen." });
        }
      } else {
        const errText = await res.text();
        setAudioFeedback({ type: "error", message: `Upload failed: ${errText}` });
      }
    } catch (err: any) {
      setAudioFeedback({ type: "error", message: err.message || "Failed to upload audio." });
    } finally {
      setIsUploadingAudio(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleScanDevice = async () => {
    const capacitor = (window as any).Capacitor;
    if (!capacitor?.Plugins?.AndroidCallLog?.syncRecordingsForLead) {
      setAudioFeedback({
        type: "error",
        message: "Device scan is available inside the Android mobile app. Please use 'Attach Audio' to select your audio file.",
      });
      return;
    }

    setIsScanningPhone(true);
    setAudioFeedback(null);
    try {
      const res = await capacitor.Plugins.AndroidCallLog.syncRecordingsForLead({
        phone: leadPhone,
        leadId: log.leadId,
        callId: log.id,
        leadName: (log as any)?.lead?.name || "",
        timestamp: new Date(log.createdAt).getTime(),
        duration: log.duration,
        serverUrl: window.location.origin + "/api/mobile/call-logs",
      });

      if (res?.uploaded) {
        setAudioFeedback({ type: "success", message: `Found device recording (${res.fileName || "audio"}) and attached it!` });
        router.refresh();
      } else {
        setAudioFeedback({
          type: "error",
          message: res?.message || "No recording matching this lead was found in device storage. Please use 'Attach Audio' to choose the file directly.",
        });
      }
    } catch (err: any) {
      setAudioFeedback({ type: "error", message: "Error scanning phone: " + err.message });
    } finally {
      setIsScanningPhone(false);
    }
  };

  const sendWhatsApp = () => {
    const phone = leadPhone.replace(/[^0-9]/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsappDraft)}`;
    window.open(url, "_blank");
  };

  function timeAgo(d: Date | string | number) { return formatDeterministicTimeAgo(d); }

  function formatDuration(secs: number | null) {
    if (!secs || secs === 0) return "0s";
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }

  // Extract effective duration if notes or recording has talk time
  const extractedDuration = log.duration && log.duration > 0
    ? log.duration
    : (log.notes?.match(/(\d+)\s*s\s*talk time/i)?.[1] ? parseInt(log.notes.match(/(\d+)\s*s\s*talk time/i)[1]) : 0);
  const displayDuration = extractedDuration > 0 ? extractedDuration : (log.duration || 0);
  const isMissed = (!displayDuration || displayDuration === 0) && !log.recordingUrl;

  return (
    <div className="px-3 sm:px-5 py-3 sm:py-4">
      {/* Header row */}
      <div className="flex items-start space-x-3 sm:space-x-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isMissed ? 'bg-red-100' : 'bg-green-100'}`}>
          <svg className={`w-4 h-4 ${isMissed ? 'text-red-600' : 'text-green-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            {isMissed && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9l6 6m0-6l-6 6" />}
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[13px] font-semibold ${isMissed ? 'text-red-700' : 'text-gray-800'}`}>
              {isMissed ? 'Call Attempted (Missed)' : 'Call Completed'}
            </span>
            <span suppressHydrationWarning className="text-[11px] text-gray-400">{timeAgo(log.createdAt)}</span>
          </div>
          <div className="flex items-center flex-wrap gap-2 text-[12px] text-gray-500 mb-3">
            <span className="flex items-center shrink-0"><Clock className="w-3 h-3 mr-1 text-gray-400" /> Duration: <strong className="text-gray-700 ml-1">{formatDuration(displayDuration)}</strong></span>
            {log.notes && (log.notes.includes('FAKE DIAL') || log.notes.includes('Quick Drop') || log.notes.includes('QUICK DROP') || log.notes.includes('INSTANT DROP')) && !log.recordingUrl && (!displayDuration || displayDuration === 0) && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Quick Drop
              </span>
            )}
            {log.notes && log.notes.includes('[⚠️ SHORT RING') && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                ⚠️ Short Ring (~1 ring)
              </span>
            )}
            {log.notes && log.notes.includes('[🔔') && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                {log.notes.match(/\[🔔 (?:FULL RINGOUT|PARTIAL RING|UNANSWERED):\s*([^\]]+)\]/)?.[1] 
                  || log.notes.match(/~(\d+)\s*rings?/i)?.[0] 
                  || "🔔 Rang unanswered"}
              </span>
            )}
            {log.notes && log.notes.includes('[✅ CONNECTED') && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                {log.notes.match(/Pre-ring\s*(~\d+\s*rings?)/i)
                  ? `✅ Connected (${log.notes.match(/Pre-ring\s*(~\d+\s*rings?)/i)?.[1]})`
                  : `✅ Connected (${formatDuration(displayDuration)})`}
              </span>
            )}
            <span className="text-gray-300">|</span>
            <span><span suppressHydrationWarning>{formatDeterministicDate(log.createdAt)}</span></span>
          </div>

          {/* Notes Section */}
          <div className="mb-3">
            {editingNotes ? (
              <div className="space-y-2 bg-purple-50/60 p-3 rounded-xl border border-purple-200">
                <label className="block text-[11px] font-bold text-[#4f46e5] uppercase tracking-wider">
                  Call Summary / Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Type key discussion points, requirements, or follow-up notes..."
                  className="w-full text-xs text-gray-900 bg-white border border-purple-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5] resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="flex items-center text-xs bg-[#4f46e5] hover:bg-purple-800 text-white font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {savingNotes ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                    {savingNotes ? "Saving..." : "Save Note"}
                  </button>
                  <button 
                    onClick={() => { setEditingNotes(false); setNotes(displayNotes); }} 
                    className="text-xs text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {displayNotes ? (
                  <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 flex items-start justify-between">
                    <div className="flex items-start space-x-2 flex-1 mr-2">
                      <MessageSquare className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <span className="font-bold text-amber-900 block text-[10px] uppercase tracking-wider mb-0.5">Call Note</span>
                        <span className="whitespace-pre-wrap text-gray-700 leading-relaxed">{displayNotes}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setEditingNotes(true)} 
                      className="flex items-center text-[11px] font-bold text-[#4f46e5] hover:bg-purple-50 px-2 py-1 rounded-md transition-colors flex-shrink-0 border border-purple-200 bg-white"
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingNotes(true)}
                    className="flex items-center text-xs font-bold text-[#4f46e5] bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    {notesSaved ? "✓ Note Saved!" : "+ Add Call Note"}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Audio Player + Transcribe */}
          {currentRecordingUrl ? (
            <div className="space-y-2">
              <audio controls className="w-full h-9">
                <source src={currentRecordingUrl} type="audio/mpeg" />
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
                    <span className="text-[12px] font-semibold text-green-700"><MessageCircle className="w-3.5 h-3.5 inline mr-1" /> WhatsApp Reply Draft</span>
                    <button onClick={() => setShowWaDraft(false)} className="text-[11px] text-green-600 hover:text-green-800"><X className="w-3.5 h-3.5" /></button>
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
          ) : (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-xs text-slate-600">
                  <Music className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">No recording attached</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleScanDevice}
                    disabled={isScanningPhone || isUploadingAudio}
                    className="flex items-center text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {isScanningPhone ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin text-indigo-600" /> Scanning...</>
                    ) : (
                      <><Search className="w-3 h-3 mr-1 text-indigo-600" /> Auto-Detect on Phone</>
                    )}
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAudio || isScanningPhone}
                    className="flex items-center text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {isUploadingAudio ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin text-slate-600" /> Uploading...</>
                    ) : (
                      <><Upload className="w-3 h-3 mr-1 text-slate-600" /> Attach Audio</>
                    )}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="audio/*,video/mp4,audio/mp4,.mp4,.m4a,.mp3,.wav,.aac,.ogg,.opus,.3gp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {audioFeedback && (
                <div className={`mt-2 text-[11px] px-2.5 py-1.5 rounded-lg font-medium flex items-center justify-between ${
                  audioFeedback.type === "success" 
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                    : "bg-amber-50 text-amber-800 border border-amber-200"
                }`}>
                  <span>{audioFeedback.message}</span>
                  <button onClick={() => setAudioFeedback(null)} className="ml-2 hover:opacity-75">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
