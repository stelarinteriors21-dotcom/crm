import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Phone, FileText, MapPin, Mail, User, Calendar, Tag, PhoneCall, ArrowLeft, Edit3, MessageSquare, MessageCircle, Trash2, Home, Ruler, Camera, CheckCircle2, History, ExternalLink, FileCheck } from "lucide-react";
import LeadStatusDropdown from "@/components/LeadStatusDropdown";
import SiteVisitDropdown from "@/components/SiteVisitDropdown";
import QuotationDropdown from "@/components/QuotationDropdown";
import ConvertedDropdown from "@/components/ConvertedDropdown";
import JunkDropdown from "@/components/JunkDropdown";
import QuickFollowUp from "@/components/QuickFollowUp";
import WhatsAppLogForm from "@/components/WhatsAppLogForm";
import AutonomousAiWhatsAppWidget from "@/components/AutonomousAiWhatsAppWidget";
import AddNoteForm from "@/components/AddNoteForm";
import ConsolidatedNotesSection from "@/components/ConsolidatedNotesSection";
import SystemNotesSection from "@/components/SystemNotesSection";
import CallLogCard from "@/components/CallLogCard";
import { parseCallNotes } from "@/lib/callNotes";
import EmailLogForm from "@/components/EmailLogForm";
import FileAttachmentForm from "@/components/FileAttachmentForm";
import { getCallers, deleteTask } from "@/app/actions/leadActions";
import ReassignButton from "@/components/ReassignButton";
import { getCurrentUser } from "@/app/actions/authActions";
import { formatDeterministicDate, formatDeterministicDateTime, formatDeterministicTimeAgo } from "@/lib/dateUtils";
import SmartCallButton from "@/components/SmartCallButton";
import WhatsAppConversationThread from "@/components/WhatsAppConversationThread";
import BackToLeadsButton from "@/components/BackToLeadsButton";
import LeadTagSelector from "@/components/LeadTagSelector";

export default async function LeadDetailsPage({ params }: { params: { id: string } }) {
  let lead: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      lead = await prisma.lead.findUnique({
        where: { id: params.id },
        include: {
          calls: { orderBy: { createdAt: "desc" } },
          tasks: { orderBy: { dueDate: "asc" } },
          whatsAppLogs: { orderBy: { createdAt: "desc" } },
          fileAttachments: { orderBy: { createdAt: "desc" } },
          emailLogs: { orderBy: { createdAt: "desc" } },
          notes: { orderBy: { createdAt: "desc" } },
          assignedTo: true,
          organization: true,
        }
      });
      if (lead) break;
    } catch (e) {
      console.warn(`LeadDetailsPage fetch error (attempt ${attempt + 1}/2):`, e);
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  if (!lead) return notFound();

  const user = await getCurrentUser();
  if (!user) return redirect("/login");
  const isAdmin = user?.role === "ADMIN" || user?.role === "ROOT";
  const callers = isAdmin ? await getCallers() : [];
  const customTags = (lead.organization?.customTags as any[]) || [];

  const initials = lead.name.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase();
  const formattedDate = formatDeterministicDate(lead.createdAt);

  function formatDuration(secs: number | null) {
    if (!secs || secs === 0) return "0s";
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }

  function timeAgo(d: Date | string | number) { return formatDeterministicTimeAgo(d); }

  const altPhone = (lead.customFields as any)?.alternatePhone || (lead as any).alternatePhone || null;

  const fields = [
    { label: "Phone", value: lead.phone, icon: Phone, link: lead.phone ? `tel:${lead.phone}` : null, isPhone: true, rawPhone: lead.phone },
    ...(altPhone ? [{ label: "Alt Phone", value: altPhone, icon: Phone, link: `tel:${altPhone}`, isPhone: true, rawPhone: altPhone }] : []),
    { label: "Email", value: lead.email, icon: Mail, link: lead.email ? `mailto:${lead.email}` : null },
    { label: "City", value: lead.city, icon: MapPin },
    { label: "Source", value: lead.source, icon: FileText },
    { label: "Lead Source", value: (lead as any).leadSource || lead.source, icon: Tag },
    { label: "Assignee", value: lead.assignedTo?.name ?? "Unassigned", icon: User },
    { label: "Budget", value: lead.budget, icon: FileText },
    { label: "Created", value: formattedDate, icon: Calendar },
  ];

  // Conversion Funnel Progress Calculation
  const cf = (lead.customFields as any) || {};
  const isContacted = Boolean(
    (lead.calls && lead.calls.length > 0) ||
    (lead.whatsAppLogs && lead.whatsAppLogs.length > 0) ||
    (lead.status && !["NEW", "FRESH"].includes(String(lead.status).toUpperCase()))
  );

  // Site visit is ONLY done when explicitly marked as "Done" or verified with OTP
  const siteVisitType = String(
    (typeof cf.siteVisit === "object" ? cf.siteVisit?.type : cf.siteVisit) ||
    cf.siteVisitStatus ||
    ""
  ).trim().toLowerCase();

  const isSiteVisitDone = Boolean(
    siteVisitType === "done" ||
    (typeof cf.siteVisit === "object" && Boolean(cf.siteVisit?.verifiedOtp)) ||
    String(lead.scoreSiteVisit || "").trim().toLowerCase() === "done" ||
    String(lead.status || "").trim().toLowerCase() === "site visit done"
  );

  const quotationStage = String(
    (typeof cf.quotation === "object" ? (cf.quotation?.stage || cf.quotation?.status) : cf.quotation) ||
    cf.quotationStatus ||
    ""
  ).trim().toLowerCase();

  const isQuotationDone = Boolean(
    (quotationStage && !["not started", "none", "no docs", "preparing", ""].includes(quotationStage)) ||
    (typeof lead.scoreQuotation === "number" && lead.scoreQuotation > 0) ||
    (typeof lead.scoreQuotation === "string" && !["none", "0", ""].includes(String(lead.scoreQuotation).trim().toLowerCase())) ||
    ["quotation sent", "quotation approved", "final quote"].some(term => String(lead.status || "").toLowerCase().includes(term))
  );

  const convertedStatus = String(
    (typeof cf.converted === "object" ? cf.converted?.status : cf.converted) ||
    cf.convertedStatus ||
    ""
  ).trim().toLowerCase();

  const isConverted = Boolean(
    ["converted", "won", "advance recieved", "pay pending"].includes(String(lead.status || "").toLowerCase()) ||
    cf.converted === true ||
    convertedStatus === "converted" ||
    convertedStatus === "won" ||
    convertedStatus === "true" ||
    convertedStatus === "yes" ||
    convertedStatus === "advance recieved" ||
    convertedStatus === "pay pending"
  );

  let conversionPercent = 0;
  if (isContacted) conversionPercent += 25;
  if (isSiteVisitDone) conversionPercent += 25;
  if (isQuotationDone) conversionPercent += 25;
  if (isConverted) conversionPercent = 100;

  return (
    <div className="min-h-full bg-[#f8fafc] -m-3 md:-m-6 flex flex-col">
      
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sticky -top-3 md:-top-6 z-10 shadow-2xs">
        <div className="flex items-center min-w-0 mr-2">
          <BackToLeadsButton />
          <span className="text-gray-300 mr-2 shrink-0">/</span>
          <span className="text-[14px] font-bold text-gray-800 truncate">{lead.name}</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LeadTagSelector leadId={lead.id} initialTag={lead.tag} customTags={customTags} isAdmin={isAdmin} />
          {isAdmin && (
            <ReassignButton leadId={lead.id} currentAssigneeId={lead.assignedToId} callers={callers} />
          )}

          <Link
            href={`/leads/${lead.id}/edit`}
            className="flex items-center px-3 py-1.5 text-[12px] font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Link>
          {lead.phone && (
            <SmartCallButton leadId={lead.id} leadName={lead.name} phone={lead.phone} />
          )}
          {altPhone && (
            <SmartCallButton 
              leadId={lead.id} 
              leadName={`${lead.name} (Alt)`} 
              phone={altPhone} 
              label="Call Alt" 
              className="flex items-center px-3 py-1.5 text-[12px] font-bold text-[#4f46e5] bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors shadow-xs"
            />
          )}
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto p-3 sm:p-5 lg:p-6 flex flex-col lg:flex-row gap-6 items-start">

        {/* Left Column */}
        <div className="w-full lg:w-80 lg:shrink-0 space-y-4">

          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
            <div className="flex items-center mb-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#E8E2F7] text-[#4f46e5] flex items-center justify-center text-lg sm:text-xl font-black mr-3 sm:mr-4 flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-[15px] sm:text-[16px] font-bold text-gray-900 truncate">{lead.name}</h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <LeadStatusDropdown leadId={lead.id} initialStatus={lead.status ?? "NEW"} isAdmin={isAdmin} />
                  <LeadTagSelector leadId={lead.id} initialTag={lead.tag} customTags={customTags} isAdmin={isAdmin} />
                </div>
              </div>
            </div>

            {/* Conversion Completion Bar */}
            <div className="mb-3.5 p-3 bg-slate-50/80 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-gray-700 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${conversionPercent === 100 ? "bg-emerald-500" : "bg-[#4f46e5] animate-pulse"}`} />
                  Conversion Progress
                </span>
                <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                  conversionPercent === 100 
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                    : conversionPercent >= 50
                    ? "bg-purple-100 text-purple-800 border border-purple-200"
                    : "bg-blue-100 text-blue-800 border border-blue-200"
                }`}>
                  {conversionPercent}%
                </span>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-gray-200/90 rounded-full h-2 overflow-hidden mb-2.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    conversionPercent === 100 
                      ? "bg-emerald-500" 
                      : "bg-gradient-to-r from-[#4f46e5] to-[#7c3aed]"
                  }`}
                  style={{ width: `${conversionPercent}%` }}
                />
              </div>

              {/* Milestone Steps */}
              <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-medium">
                <div className={`flex flex-col items-center ${isContacted ? "text-[#4f46e5] font-bold" : "text-gray-400"}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] mb-0.5 ${isContacted ? "bg-[#4f46e5] text-white" : "bg-gray-200 text-gray-500"}`}>
                    {isContacted ? "✓" : "1"}
                  </span>
                  <span>Contact</span>
                </div>
                <div className={`flex flex-col items-center ${isSiteVisitDone ? "text-[#4f46e5] font-bold" : "text-gray-400"}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] mb-0.5 ${isSiteVisitDone ? "bg-[#4f46e5] text-white" : "bg-gray-200 text-gray-500"}`}>
                    {isSiteVisitDone ? "✓" : "2"}
                  </span>
                  <span>Visit</span>
                </div>
                <div className={`flex flex-col items-center ${isQuotationDone ? "text-[#4f46e5] font-bold" : "text-gray-400"}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] mb-0.5 ${isQuotationDone ? "bg-[#4f46e5] text-white" : "bg-gray-200 text-gray-500"}`}>
                    {isQuotationDone ? "✓" : "3"}
                  </span>
                  <span>Quote</span>
                </div>
                <div className={`flex flex-col items-center ${isConverted ? "text-emerald-600 font-bold" : "text-gray-400"}`}>
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] mb-0.5 ${isConverted ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                    {isConverted ? "✓" : "4"}
                  </span>
                  <span>Won</span>
                </div>
              </div>
            </div>

            {/* Lead Pipeline & Junk Actions */}
            <div className="space-y-2 mb-4 pt-2 border-t border-gray-100">
              <SiteVisitDropdown lead={lead} isAdmin={isAdmin} />
              <QuotationDropdown lead={lead} />
              <ConvertedDropdown lead={lead} />
              <JunkDropdown lead={lead} />
            </div>

            <div className="space-y-3">
              {fields.map(f => (
                f.value ? (
                  <div key={f.label} className="flex items-center text-[13px]">
                    <f.icon className="w-3.5 h-3.5 text-gray-400 mr-2.5 flex-shrink-0" />
                    <span className="text-gray-500 w-20 flex-shrink-0">{f.label}</span>
                    {f.isPhone && f.rawPhone ? (
                      <div className="flex items-center gap-2 truncate">
                        <SmartCallButton 
                          leadId={lead.id} 
                          leadName={f.label === "Alt Phone" ? `${lead.name} (Alt)` : lead.name} 
                          phone={f.rawPhone} 
                          showIcon={false}
                          label={f.value}
                          className="text-[#4f46e5] hover:underline font-medium truncate text-left p-0 bg-transparent shadow-none" 
                        />
                        <a 
                          href={`https://wa.me/${String(f.rawPhone).replace(/[^0-9]/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          title={`WhatsApp ${f.value}`} 
                          className="p-1 text-[#25D366] hover:bg-emerald-50 rounded inline-flex items-center justify-center transition-colors"
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12.031 2c-5.508 0-9.985 4.477-9.985 9.985 0 1.761.459 3.477 1.332 4.992L2 22l5.166-1.354a9.96 9.96 0 0 0 4.865 1.259h.004c5.508 0 9.985-4.477 9.985-9.985 0-2.668-1.039-5.176-2.925-7.062A9.923 9.923 0 0 0 12.031 2zm0 18.232c-1.492 0-2.955-.4-4.232-1.157l-.304-.18-3.146.825.839-3.067-.198-.315a8.21 8.21 0 0 1-1.258-4.354c0-4.564 3.713-8.277 8.283-8.277 2.213 0 4.293.862 5.858 2.428a8.23 8.23 0 0 1 2.424 5.857c0 4.565-3.714 8.283-8.284 8.283zm4.538-6.195c-.249-.125-1.472-.727-1.7-.81-.229-.083-.395-.125-.561.125-.166.249-.644.81-.789.977-.145.166-.291.187-.54.062-.249-.125-1.053-.388-2.006-1.238-.742-.662-1.243-1.479-1.389-1.728-.145-.249-.015-.384.109-.508.112-.112.249-.291.374-.436.125-.145.166-.249.249-.415.083-.166.042-.312-.021-.436-.062-.125-.561-1.352-.769-1.851-.202-.486-.408-.42-.561-.428l-.478-.008c-.166 0-.436.062-.664.312-.229.249-.873.853-.873 2.08s.894 2.413 1.019 2.58c.125.166 1.758 2.685 4.26 3.765.595.257 1.06.41 1.423.526.598.19 1.142.163 1.572.099.479-.072 1.472-.602 1.68-1.185.207-.582.207-1.081.145-1.185-.062-.104-.228-.166-.477-.291z" />
                          </svg>
                        </a>
                      </div>
                    ) : f.link ? (
                      <a href={f.link} className="text-[#4f46e5] hover:underline font-medium truncate">{f.value}</a>
                    ) : (
                      <span suppressHydrationWarning className="text-gray-800 font-medium truncate">{f.value}</span>
                    )}
                  </div>
                ) : null
              ))}
            </div>
          </div>

          {/* Dynamic Custom Fields */}
          {(() => {
            const customFieldEntries = Object.entries((lead.customFields as object) || {})
              .filter(([k, val]) => {
                const norm = k.toLowerCase().replace(/[\s_\-]/g, "");
                const isInternal = [
                  "sitevisit", "sitevisithistory", "quotation", "quotationhistory",
                  "followupdate", "statuschangedat", "converted", "junk", "batch",
                  "alert", "stale", "import", "alternatephone", "altphone"
                ].some(x => norm.includes(x));
                return !isInternal && typeof val !== "object";
              });

            if (customFieldEntries.length === 0) return null;

            return (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-[13px] font-bold text-gray-700 mb-3 flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-[#4f46e5]" /> Additional Information
                </h3>
                <div className="space-y-3">
                  {customFieldEntries.map(([key, value]) => {
                    const labels = (lead.organization?.customFieldLabels as Record<string, string>) || {};
                    const displayName = labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return (
                      <div key={key} className="flex flex-col text-[13px]">
                        <span className="text-gray-500 mb-0.5">{displayName}</span>
                        <span className="text-gray-800 font-medium break-words">{String(value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Site Visit Logs & Confirmation Card */}
          {(() => {
            const history = (lead.customFields as any)?.siteVisitHistory || [];
            const currentSv = (lead.customFields as any)?.siteVisit || {};
            const hasHistory = history.length > 0;
            const hasCurrentVisit = currentSv && (currentSv.type || currentSv.verifiedAt || currentSv.date);
            if (!hasHistory && !hasCurrentVisit) return null;

            return (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-4 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <h3 className="text-[13px] font-bold text-gray-800 flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-[#4f46e5]" /> Site Visit History & Confirmation
                  </h3>
                  {currentSv.type === "Done" && (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Visit Done
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  {(hasHistory ? history : [currentSv]).map((log: any, idx: number) => (
                    <div key={idx} className="flex flex-col text-[13px] border-l-2 border-[#4f46e5] pl-3 py-1 space-y-1.5 bg-slate-50/50 p-2.5 rounded-r-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-800 flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.type === "Done" ? "bg-emerald-100 text-emerald-800" :
                            log.type === "Rescheduled" ? "bg-amber-100 text-amber-800" : "bg-indigo-100 text-indigo-800"
                          }`}>
                            {log.type || "Visit Log"}
                          </span>
                          {log.verifiedOtp && (
                            <span className="text-emerald-700 font-bold text-[11px] flex items-center">
                              ✓ OTP: {log.verifiedOtp}
                            </span>
                          )}
                        </span>
                        <span className="text-gray-400 text-[10px]">
                          <span suppressHydrationWarning>{formatDeterministicDateTime(log.timestamp || log.verifiedAt)}</span>
                        </span>
                      </div>

                      {(log.date || log.time) && (
                        <div className="text-gray-600 text-xs">
                          Scheduled for: <span className="font-semibold text-gray-800">{log.date || "N/A"} at {log.time || "N/A"}</span>
                        </div>
                      )}

                      {log.roomsToRenovate && (
                        <div className="text-xs text-gray-700 flex items-center">
                          <Home className="w-3.5 h-3.5 mr-1.5 text-indigo-600 shrink-0" />
                          <span>Rooms to Renovate: <strong className="text-gray-900">{log.roomsToRenovate}</strong></span>
                        </div>
                      )}

                      {log.nextMeetingDate && (
                        <div className="text-xs text-gray-700 flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
                          <span>Next Meeting: <strong className="text-gray-900">{formatDeterministicDateTime(log.nextMeetingDate)}</strong></span>
                        </div>
                      )}

                      {log.measurements && (
                        <div className="text-xs text-gray-700 bg-white p-2 rounded border border-gray-200/80">
                          <div className="font-bold text-[10px] text-gray-400 uppercase tracking-wider mb-0.5 flex items-center">
                            <Ruler className="w-3 h-3 mr-1 text-purple-600" /> Measurements
                          </div>
                          <div className="whitespace-pre-wrap font-medium text-gray-800">{log.measurements}</div>
                        </div>
                      )}

                      {log.photos && Array.isArray(log.photos) && log.photos.length > 0 && (
                        <div className="pt-1">
                          <div className="font-bold text-[10px] text-gray-400 uppercase tracking-wider mb-1 flex items-center">
                            <Camera className="w-3 h-3 mr-1 text-pink-600" /> Site Photos ({log.photos.length})
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {log.photos.map((pUrl: string, pIdx: number) => (
                              <a
                                key={pIdx}
                                href={pUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-500 shadow-2xs block"
                                title="Click to view full photo"
                              >
                                <img src={pUrl} alt={`Photo ${pIdx + 1}`} className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Schedule Follow-up */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            
              <QuickFollowUp leadId={lead.id} />

            {/* Existing Follow-ups */}
            {lead.tasks && lead.tasks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Upcoming Follow-ups</h4>
                {lead.tasks.map((task: any) => (
                  <div key={task.id} className="flex items-center justify-between bg-purple-50/50 p-2.5 rounded-lg border border-purple-100">
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[12px] font-bold text-gray-800 truncate">{task.title}</span>
                      <span suppressHydrationWarning className="text-[10px] text-[#4f46e5] font-semibold mt-0.5">
                        {formatDeterministicDateTime(task.dueDate)}
                      </span>
                    </div>
                    <form action={async () => {
                      "use server";
                      await deleteTask(task.id, lead.id);
                    }}>
                      <button 
                        type="submit" 
                        title="Delete follow-up"
                        className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex-1 min-w-0 w-full space-y-5">

          {/* 1. Top KPI Summary Row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2.5 sm:p-4 text-center min-w-0">
              <div className="text-lg sm:text-2xl font-black text-[#4f46e5] truncate">{lead.calls.length}</div>
              <div className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 sm:mt-1 truncate">Total Calls</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2.5 sm:p-4 text-center min-w-0">
              <div className="text-lg sm:text-2xl font-black text-gray-700 truncate">
                {formatDuration(lead.calls.reduce((s: number, c: any) => s + (c.duration ?? 0), 0))}
              </div>
              <div className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 sm:mt-1 truncate">Total Duration</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-2.5 sm:p-4 text-center min-w-0">
              <div className="text-lg sm:text-2xl font-black text-gray-700 truncate">
                <span suppressHydrationWarning>{lead.calls[0] ? timeAgo(lead.calls[0].createdAt) : "NA"}</span>
              </div>
              <div className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5 sm:mt-1 truncate">Last Call</div>
            </div>
          </div>

          {/* 2. WhatsApp Chat Widget */}
          <div>
            {(() => {
              const cf = (lead.customFields as any) || {};
              const svOtp = cf.siteVisit?.otp || null;
              return (
                <WhatsAppConversationThread
                  leadId={lead.id}
                  leadName={lead.name}
                  phone={lead.phone}
                  siteVisitOtp={svOtp}
                  messages={lead.whatsAppLogs as any}
                />
              );
            })()}
          </div>

          {/* 3. Consolidated Notes Section (Human Notes: General & Calls) */}
          <ConsolidatedNotesSection
            leadId={lead.id}
            notes={lead.notes || []}
            calls={lead.calls || []}
          />

          {/* 4. Call History (Call Logs) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-gray-800 flex items-center">
                <PhoneCall className="w-4 h-4 mr-2 text-[#4f46e5]" /> Call History
              </h2>
              <span className="text-[11px] text-gray-400">{lead.calls.length} call{lead.calls.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {lead.calls.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-2 text-[#4f46e5]">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div className="text-[12px] font-semibold text-gray-600">No calls logged yet</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Use the mobile app to make a call!</div>
                </div>
              ) : (
                lead.calls.map((log: any) => (
                  <CallLogCard key={log.id} log={log} leadPhone={lead.phone} />
                ))
              )}
            </div>
          </div>

          {/* 5. Document Attachments */}
          {(() => {
            const cf = (lead.customFields as any) || {};
            const currentQuotation = cf.quotation || {};
            const quotationHistory: any[] = Array.isArray(cf.quotationHistory) ? cf.quotationHistory : [];

            const allDocuments: Array<{
              id: string;
              name: string;
              url: string;
              type: "upload" | "drive";
              category: string;
              createdAt?: Date | string;
              isPrimary?: boolean;
            }> = [];

            // Direct attachments from database
            (lead.fileAttachments || []).forEach((file: any) => {
              const isDrive = (file.url || "").includes("drive.google.com") || (file.url || "").includes("share.google");
              allDocuments.push({
                id: file.id,
                name: file.name,
                url: file.url,
                type: isDrive ? "drive" : "upload",
                category: isDrive ? "Quotation / Drive Link" : "Uploaded File",
                createdAt: file.createdAt
              });
            });

            // Current Quotation docLink
            if (currentQuotation.docLink && currentQuotation.docLink.trim()) {
              const qUrl = currentQuotation.docLink.trim();
              if (!allDocuments.some(d => d.url === qUrl)) {
                allDocuments.push({
                  id: "doc-current-quotation",
                  name: `Quotation (${currentQuotation.stage || currentQuotation.status || "Estimate"}) - Google Drive`,
                  url: qUrl,
                  type: "drive",
                  category: "Current Quotation",
                  createdAt: cf.statusChangedAt || lead.createdAt,
                  isPrimary: true
                });
              }
            }

            // Historical Quotation Revisions
            quotationHistory.forEach((h: any, idx: number) => {
              if (h.docLink && h.docLink.trim()) {
                const hUrl = h.docLink.trim();
                if (!allDocuments.some(d => d.url === hUrl)) {
                  allDocuments.push({
                    id: `doc-quote-history-${idx}`,
                    name: `Quotation Revision (${h.stage || "Estimate"}) - Google Drive`,
                    url: hUrl,
                    type: "drive",
                    category: "Quotation History",
                    createdAt: h.timestamp || lead.createdAt
                  });
                }
              }
            });

            // Floor Plan Link
            if (cf.floorPlanLink && cf.floorPlanLink.trim()) {
              const fpUrl = cf.floorPlanLink.trim();
              if (!allDocuments.some(d => d.url === fpUrl)) {
                allDocuments.push({
                  id: "doc-floor-plan",
                  name: "Floor Plan Document - Google Drive",
                  url: fpUrl,
                  type: "drive",
                  category: "Floor Plan",
                  createdAt: lead.createdAt
                });
              }
            }

            return (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-[14px] font-bold text-gray-800 flex items-center">
                    <FileText className="w-4 h-4 mr-2 text-[#F59E0B]" /> Document Attachments
                  </h2>
                  <span className="text-[11px] text-gray-400">{allDocuments.length} document{allDocuments.length !== 1 ? "s" : ""}</span>
                </div>

                <div className="p-4 bg-gray-50 border-b border-gray-100">
                  <FileAttachmentForm leadId={lead.id} />
                </div>

                <div className="divide-y divide-gray-100">
                  {allDocuments.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <div className="w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-2">
                        <FileText className="w-5 h-5 text-[#F59E0B]" />
                      </div>
                      <div className="text-[12px] font-semibold text-gray-600">No documents attached</div>
                    </div>
                  ) : (
                    allDocuments.map((doc: any) => (
                      <div key={doc.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            doc.type === "drive" ? "bg-blue-100 text-blue-600" : "bg-yellow-100 text-[#F59E0B]"
                          }`}>
                            {doc.type === "drive" ? <FileCheck className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                          </div>
                          <div className="truncate">
                            <div className="flex flex-wrap items-center gap-2">
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[13px] font-semibold text-gray-800 hover:text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <span>{doc.name}</span>
                                <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                              </a>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                doc.category === "Current Quotation" 
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : doc.category === "Quotation History"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : doc.category === "Floor Plan"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {doc.category}
                              </span>
                            </div>
                            <div suppressHydrationWarning className="text-[10px] text-gray-400 mt-0.5">
                              {doc.createdAt ? timeAgo(doc.createdAt) : "Attached"}
                            </div>
                          </div>
                        </div>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors shrink-0 ml-3"
                        >
                          <span>Open Link</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}

          {/* 6. System Notes & Workflow Activity (System Logs) */}
          <div className="mb-8">
            <SystemNotesSection
              notes={lead.notes || []}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
