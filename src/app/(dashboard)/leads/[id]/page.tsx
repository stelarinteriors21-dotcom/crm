import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Phone, FileText, MapPin, Mail, User, Calendar, Tag, PhoneCall, ArrowLeft, Edit3, MessageSquare, MessageCircle } from "lucide-react";
import LeadScoreWidget from "@/components/LeadScoreWidget";
import { calculateLeadScore, getScoreColor } from "@/lib/leadScore";
import LeadStatusDropdown from "@/components/LeadStatusDropdown";
import WhatsAppLogForm from "@/components/WhatsAppLogForm";
import CallLogCard from "@/components/CallLogCard";
import EmailLogForm from "@/components/EmailLogForm";
import FileAttachmentForm from "@/components/FileAttachmentForm";

export default async function LeadDetailsPage({ params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      calls: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { dueDate: "asc" } },
      whatsAppLogs: { orderBy: { createdAt: "desc" } },
      fileAttachments: { orderBy: { createdAt: "desc" } },
      emailLogs: { orderBy: { createdAt: "desc" } },
      assignedTo: true,
    }
  });

  if (!lead) return notFound();

  const initials = lead.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const formattedDate = lead.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  function formatDuration(secs: number | null) {
    if (!secs || secs === 0) return "0s";
    if (secs < 60) return `${secs}s`;
    return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }

  function timeAgo(d: Date) {
    const ms = Date.now() - d.getTime();
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  const fields = [
    { label: "Phone", value: lead.phone, icon: Phone, link: lead.phone ? `tel:${lead.phone}` : null },
    { label: "Email", value: lead.email, icon: Mail, link: lead.email ? `mailto:${lead.email}` : null },
    { label: "City", value: lead.city, icon: MapPin },
    { label: "Source", value: lead.source, icon: FileText },
    { label: "Lead Source", value: lead.leadSource, icon: Tag },
    { label: "Assignee", value: lead.assignedTo?.name ?? "Unassigned", icon: User },
    { label: "Budget", value: lead.approximateBudget, icon: FileText },
    { label: "Created", value: formattedDate, icon: Calendar },
  ];

  const leadScoreInput = {
    scoreEngagement: lead.scoreEngagement,
    scoreLocation:   lead.scoreLocation,
    scoreBudget:     lead.scoreBudget,
    scoreTimeline:   lead.scoreTimeline,
    scoreFullHome:   lead.scoreFullHome,
    scoreFloorPlan:  lead.scoreFloorPlan,
    scoreMoodBoard:  lead.scoreMoodBoard,
    scoreSiteVisit:  lead.scoreSiteVisit,
    scoreQuotation:  lead.scoreQuotation,
  };
  const { total, grade } = calculateLeadScore(leadScoreInput);
  const scoreColor = getScoreColor(total);

  return (
    <div className="h-full bg-[#F8F9FA] -m-3 md:-m-6 overflow-y-auto">
      
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-10">
        <div className="flex items-center">
          <Link href="/leads" className="flex items-center text-[13px] text-gray-500 hover:text-[#613cbc] mr-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Leads
          </Link>
          <span className="text-gray-300 mr-4">/</span>
          <span className="text-[13px] font-semibold text-gray-700 truncate">{lead.name}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Score badge in top bar */}
          <div className="flex items-center space-x-2 mr-2" title={`Score: ${total.toFixed(1)}/100 · ${grade}`}>
            <div className="relative w-8 h-8">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="none" className="stroke-gray-100" strokeWidth="4" />
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
                <span className="text-[9px] font-black text-gray-700">{Math.round(total)}</span>
              </div>
            </div>
            {total >= 80 && <span className="text-[10px] font-bold text-yellow-600">Hot 🔥</span>}
          </div>
          <Link
            href={`/leads/${lead.id}/edit`}
            className="flex items-center px-3 py-1.5 text-[12px] font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Link>
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="flex items-center px-3 py-1.5 text-[12px] font-bold text-white bg-[#613cbc] rounded-lg hover:bg-purple-800 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 mr-1.5" /> Call Now
            </a>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 flex flex-col md:flex-row gap-6">

        {/* Left Column */}
        <div className="w-full md:w-80 flex-shrink-0 space-y-4">

          {/* Profile Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center mb-4">
              <div className="w-14 h-14 rounded-full bg-[#E8E2F7] text-[#613cbc] flex items-center justify-center text-xl font-black mr-4 flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-[16px] font-bold text-gray-900 truncate">{lead.name}</h1>
                <LeadStatusDropdown leadId={lead.id} initialStatus={lead.status ?? "NEW"} />
              </div>
            </div>

            <div className="space-y-3">
              {fields.map(f => (
                f.value ? (
                  <div key={f.label} className="flex items-center text-[13px]">
                    <f.icon className="w-3.5 h-3.5 text-gray-400 mr-2.5 flex-shrink-0" />
                    <span className="text-gray-500 w-20 flex-shrink-0">{f.label}</span>
                    {f.link ? (
                      <a href={f.link} className="text-[#613cbc] hover:underline font-medium truncate">{f.value}</a>
                    ) : (
                      <span className="text-gray-800 font-medium truncate">{f.value}</span>
                    )}
                  </div>
                ) : null
              ))}
            </div>
          </div>

          {/* Schedule Follow-up */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-[13px] font-bold text-gray-700 mb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-[#613cbc]" /> Schedule Follow-up
            </h3>
            <form action={async (formData) => {
              "use server";
              const title = formData.get("title") as string;
              const dueDate = formData.get("dueDate") as string;
              if (!title || !dueDate) return;
              
              const { getCurrentUser } = await import("@/app/actions/authActions");
              const user = await getCurrentUser();
              const taskUserId = user?.id || lead.assignedToId;
              
              if (!taskUserId) return; // Prevent crash if somehow no user is attached
              
              await prisma.task.create({
                data: { title, dueDate: new Date(dueDate), leadId: lead.id, userId: taskUserId }
              });
              
              const { revalidatePath } = await import("next/cache");
              revalidatePath(`/leads/${lead.id}`);
            }} className="space-y-3">
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Call back about pricing"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[12px] outline-none focus:border-[#613cbc]"
              />
              <input
                type="datetime-local"
                name="dueDate"
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[12px] outline-none focus:border-[#613cbc]"
              />
              <button type="submit" className="w-full bg-[#613cbc] text-white py-2 rounded-lg text-[12px] font-bold hover:bg-purple-800 transition-colors">
                Save Follow-up
              </button>
            </form>

            {/* Existing Follow-ups */}
            {lead.tasks && lead.tasks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Upcoming Follow-ups</h4>
                {lead.tasks.map((task: any) => (
                  <div key={task.id} className="flex flex-col bg-purple-50/50 p-2.5 rounded-lg border border-purple-100">
                    <span className="text-[12px] font-bold text-gray-800">{task.title}</span>
                    <span className="text-[10px] text-[#613cbc] font-semibold mt-0.5">
                      {new Date(task.dueDate).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stelar Lead Score Widget */}
          <LeadScoreWidget leadId={lead.id} initialScores={leadScoreInput} />

        </div>

        {/* Right Column */}
        <div className="flex-1 space-y-4">

          {/* Call Stats Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <div className="text-2xl font-black text-[#613cbc]">{lead.calls.length}</div>
              <div className="text-[11px] text-gray-500 mt-1">Total Calls</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <div className="text-2xl font-black text-gray-700">
                {formatDuration(lead.calls.reduce((s, c) => s + (c.duration ?? 0), 0))}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Total Duration</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <div className="text-2xl font-black text-gray-700">
                {lead.calls[0] ? timeAgo(lead.calls[0].createdAt) : "NA"}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Last Call</div>
            </div>
          </div>

          {/* Call Logs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-gray-800 flex items-center">
                <PhoneCall className="w-4 h-4 mr-2 text-[#613cbc]" /> Call History
              </h2>
              <span className="text-[11px] text-gray-400">{lead.calls.length} call{lead.calls.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="divide-y divide-gray-100">
              {lead.calls.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <PhoneCall className="w-6 h-6 text-[#613cbc]" />
                  </div>
                  <div className="text-[13px] font-semibold text-gray-600">No calls logged yet</div>
                  <div className="text-[11px] text-gray-400 mt-1">Use the mobile app to make a call!</div>
                </div>
              ) : (
                lead.calls.map((log) => (
                  <CallLogCard key={log.id} log={log} leadPhone={lead.phone} />
                ))
              )}
            </div>
          </div>

          {/* WhatsApp Logs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-gray-800 flex items-center">
                <MessageCircle className="w-4 h-4 mr-2 text-[#25D366]" /> WhatsApp History
              </h2>
              <span className="text-[11px] text-gray-400">{lead.whatsAppLogs.length} message{lead.whatsAppLogs.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <WhatsAppLogForm leadId={lead.id} phone={lead.phone} />
            </div>

            <div className="divide-y divide-gray-100">
              {lead.whatsAppLogs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageCircle className="w-6 h-6 text-[#25D366]" />
                  </div>
                  <div className="text-[13px] font-semibold text-gray-600">No WhatsApp messages yet</div>
                  <div className="text-[11px] text-gray-400 mt-1">Send a message to start the conversation!</div>
                </div>
              ) : (
                lead.whatsAppLogs.map((log: any) => (
                  <div key={log.id} className="px-5 py-4 flex items-start space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${log.direction === 'OUTBOUND' ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <MessageCircle className={`w-4 h-4 ${log.direction === 'OUTBOUND' ? 'text-[#25D366]' : 'text-gray-500'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-semibold text-gray-800">{log.direction === "OUTBOUND" ? "Sent to Client" : "Received from Client"}</span>
                        <span className="text-[11px] text-gray-400">{timeAgo(log.createdAt)}</span>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-3 py-2 text-[13px] text-gray-700 mt-2 whitespace-pre-wrap">
                        {log.message}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Email Logs */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-gray-800 flex items-center">
                <Mail className="w-4 h-4 mr-2 text-[#0b5cff]" /> Email History
              </h2>
              <span className="text-[11px] text-gray-400">{lead.emailLogs.length} email{lead.emailLogs.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <EmailLogForm leadId={lead.id} email={lead.email} />
            </div>

            <div className="divide-y divide-gray-100">
              {lead.emailLogs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-6 h-6 text-[#0b5cff]" />
                  </div>
                  <div className="text-[13px] font-semibold text-gray-600">No emails logged yet</div>
                </div>
              ) : (
                lead.emailLogs.map((log: any) => (
                  <div key={log.id} className="px-5 py-4 flex items-start space-x-4 hover:bg-gray-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-[#0b5cff]" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-semibold text-gray-800">{log.subject}</span>
                        <span className="text-[11px] text-gray-400">{timeAgo(log.createdAt)}</span>
                      </div>
                      <div className="text-[12px] text-gray-600 mt-1 whitespace-pre-wrap line-clamp-3">
                        {log.body}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Document Attachments */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6 mb-10">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-gray-800 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-[#F59E0B]" /> Document Attachments
              </h2>
              <span className="text-[11px] text-gray-400">{lead.fileAttachments.length} file{lead.fileAttachments.length !== 1 ? "s" : ""}</span>
            </div>

            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <FileAttachmentForm leadId={lead.id} />
            </div>

            <div className="divide-y divide-gray-100">
              {lead.fileAttachments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-[#F59E0B]" />
                  </div>
                  <div className="text-[13px] font-semibold text-gray-600">No documents attached</div>
                </div>
              ) : (
                lead.fileAttachments.map((file: any) => (
                  <div key={file.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-[#F59E0B]" />
                      </div>
                      <div className="truncate">
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-semibold text-gray-800 hover:text-blue-600 hover:underline">
                          {file.name}
                        </a>
                        <div className="text-[10px] text-gray-400 mt-0.5">{timeAgo(file.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
