"use client";
import DailyReportModal from "./DailyReportModal";
import SiteVisitExecutiveCard from "./SiteVisitExecutiveCard";
import SiteVisitorWorkdesk from "./SiteVisitorWorkdesk";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Settings, RefreshCw, ChevronDown, CheckCircle, XCircle, TrendingUp, Users, User, PhoneCall, Calendar, X, Download, Clock, MapPin, FileText, BarChart3, Sparkles, MessageSquare, AlertTriangle, ArrowRight, CheckCircle2, ChevronRight, PhoneForwarded } from "lucide-react";
import { acceptLead, rejectLead, acceptAllLeads, rejectAllLeads } from "@/app/actions/leadActions";
import { getUserActivityLogs } from "@/app/actions/activityActions";
import { triggerSmartCall } from "@/components/SmartCallManager";

type Lead = {
  id: string;
  name: string;
  phone: string | null;
  source: string | null;
  status: string | null;
  assignedTo?: { name: string | null } | null;
  createdAt: Date;
};

type StatusStat = { label: string; count: number; percent: string };
type TeamMember = { id?: string; initials: string; name: string; calls: number; duration: string; revenue: string; activeMinutes?: number };

type Props = {
  pendingLeads: Lead[];
  allLeads: Lead[];
  hotLeads?: (Lead & { computedScore?: number })[];
  scheduledLeads?: any[];
  statusBreakdown: StatusStat[];
  teamActivity: TeamMember[];
  totalLeads: number;
  userId: string;
  userRole?: string;
  userName?: string;
};

import { LEAD_STATUS_COLORS } from "@/lib/constants";

const STATUS_BAR_COLORS = [
  "bg-gray-400", "bg-orange-700", "bg-purple-700", "bg-blue-600",
  "bg-red-500", "bg-yellow-500", "bg-teal-500", "bg-indigo-500",
];

export default function DashboardClient({ pendingLeads, allLeads, hotLeads = [], scheduledLeads = [], statusBreakdown, teamActivity, totalLeads, userId, userRole, userName }: Props) {
  const [activeTab, setActiveTab] = useState<"default" | "pending">(pendingLeads.length > 0 ? "pending" : "default");
  const [pending, setPending] = useState(pendingLeads);
  const [selectedUserReport, setSelectedUserReport] = useState<string | null>(null);
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [callerTaskTab, setCallerTaskTab] = useState<"TODAY" | "UPCOMING">("TODAY");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState<"accept" | "reject" | null>(null);

  const isAdmin = userRole === "ADMIN" || userRole === "ROOT";
  const isSiteVisitor = userRole === "SITE_VISITOR";

  if (isSiteVisitor) {
    return (
      <SiteVisitorWorkdesk
        allLeads={allLeads}
        userId={userId}
        userName={userName}
      />
    );
  }

  if (!isAdmin) {
    const myActivity = teamActivity.find(m => (m.id && m.id === userId) || m.name === userName);
    const myInitials = userName?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "ME";
    
    // Categorize Caller Tasks:
    // Only active leads assigned to this caller
    const callerAssigned = allLeads.filter(l => 
      (l as any).assignedToId === userId && 
      !['JUNK', 'LOST', 'NOT_INTERESTED', 'WON'].includes(l.status || 'NEW')
    );

    const now = new Date();
    const nowTime = now.getTime();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    const todayTasks: any[] = [];
    const upcomingTasks: any[] = [];

    callerAssigned.forEach((lead: any) => {
      const sLower = (lead.status || '').trim().toLowerCase();
      const cf = lead.customFields || {};
      const isFollowUp = sLower === 'follow up' || sLower === 'followup';
      const isConvertedOrJunk = ['won', 'advance recieved', 'pay pending', 'junk', 'lost', 'job enquiry', 'just curious', 'hold'].includes(sLower);
      const isSiteVisit = sLower === 'site visit schedules' || sLower === 'site visit recheduled';
      const isFresh = sLower === 'fresh' || sLower === 'pending' || sLower === 'new';

      // Determine when this lead entered its current status
      const possibleTimestamps: number[] = [new Date(lead.createdAt).getTime()];
      if (cf.statusChangedAt) possibleTimestamps.push(new Date(cf.statusChangedAt).getTime());
      if (cf.quotation?.timestamp) possibleTimestamps.push(new Date(cf.quotation.timestamp).getTime());
      if (cf.siteVisit?.timestamp) possibleTimestamps.push(new Date(cf.siteVisit.timestamp).getTime());
      if (cf.siteVisit?.verifiedAt) possibleTimestamps.push(new Date(cf.siteVisit.verifiedAt).getTime());
      if (lead.notes?.[0]?.createdAt) possibleTimestamps.push(new Date(lead.notes[0].createdAt).getTime());
      if (lead.calls?.[0]?.createdAt) possibleTimestamps.push(new Date(lead.calls[0].createdAt).getTime());
      const validTimestamps = possibleTimestamps.filter(t => !isNaN(t) && t > 0);
      const statusTimestamp = validTimestamps.length > 0 ? Math.max(...validTimestamps) : new Date(lead.createdAt).getTime();

      // Check exemptions for auto follow-up
      const hasFutureFollowUp = cf.followUpDate && new Date(cf.followUpDate).getTime() > nowTime;
      const hasFutureSiteVisit = cf.siteVisit && (cf.siteVisit.type === "Scheduled" || cf.siteVisit.type === "Rescheduled") && cf.siteVisit.date;

      // Active converting stage that automatically switches to follow-up after 24 hours if unchanged
      const isAutoFollowUpStatus = !isConvertedOrJunk && !isFollowUp && !isFresh && !isSiteVisit && !hasFutureFollowUp && !hasFutureSiteVisit;

      const timeInStatus = nowTime - statusTimestamp;
      const timeRemainingUntilAutoFollowUp = TWENTY_FOUR_HOURS_MS - timeInStatus;
      const isAutoFollowUpWithin24Hours = isAutoFollowUpStatus && timeRemainingUntilAutoFollowUp > 0;
      const isAutoFollowUpExpired = isAutoFollowUpStatus && timeRemainingUntilAutoFollowUp <= 0;

      // Scheduled follow-up / site visit
      let scheduledDueDate: number | null = null;
      let taskType = "Follow-up Call";

      if (cf.siteVisit && (cf.siteVisit.type === "Scheduled" || cf.siteVisit.type === "Rescheduled") && cf.siteVisit.date) {
        scheduledDueDate = new Date(`${cf.siteVisit.date}T${cf.siteVisit.time || '12:00'}`).getTime();
        taskType = "Site Visit Follow-up";
      } else if (cf.followUpDate) {
        scheduledDueDate = new Date(cf.followUpDate).getTime();
        taskType = "Follow-up Call";
      }

      if (isAutoFollowUpWithin24Hours) {
        // Lead's status will be changed to follow up automatically within 24 hours -> UPCOMING!
        const autoDueDate = statusTimestamp + TWENTY_FOUR_HOURS_MS;
        const minsLeft = Math.max(1, Math.round(timeRemainingUntilAutoFollowUp / 60000));
        const hrs = Math.floor(minsLeft / 60);
        const mins = minsLeft % 60;
        const timeRemainingLabel = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;

        const autoDueDateObj = new Date(autoDueDate);
        let hours = autoDueDateObj.getHours();
        const minutes = autoDueDateObj.getMinutes().toString().padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12 || 12;
        const autoDueDateStr = `${hours}:${minutes} ${ampm}`;

        upcomingTasks.push({
          ...lead,
          taskType: "Auto Follow-up Pending",
          taskDueDate: autoDueDate,
          isAutoFollowUp: true,
          timeRemainingLabel,
          autoDueDateStr
        });
      } else if (scheduledDueDate && scheduledDueDate > endOfToday) {
        // Scheduled task for future days -> UPCOMING!
        upcomingTasks.push({
          ...lead,
          taskType,
          taskDueDate: scheduledDueDate,
          isUpcoming: true
        });
      } else if (isFollowUp || isAutoFollowUpExpired || lead.assignedStatus === 'PENDING') {
        // Scheduled for today, past due, expired auto-followup, or fresh pending -> TODAY!
        const dueTime = scheduledDueDate || (isAutoFollowUpExpired ? (statusTimestamp + TWENTY_FOUR_HOURS_MS) : nowTime);
        todayTasks.push({
          ...lead,
          taskType,
          taskDueDate: dueTime,
          isToday: true
        });
      }
    });

    // Sort todayTasks: earlier due dates (including past-due) first, then newly assigned
    todayTasks.sort((a, b) => {
      const aTime = a.taskDueDate || (a.createdAt ? new Date(a.createdAt).getTime() : 0);
      const bTime = b.taskDueDate || (b.createdAt ? new Date(b.createdAt).getTime() : 0);
      return aTime - bTime;
    });

    // Sort upcomingTasks: earlier due dates first
    upcomingTasks.sort((a, b) => {
      const aTime = a.taskDueDate ? new Date(a.taskDueDate).getTime() : 0;
      const bTime = b.taskDueDate ? new Date(b.taskDueDate).getTime() : 0;
      return aTime - bTime;
    });

    const activeList = callerTaskTab === "UPCOMING" ? upcomingTasks : todayTasks;

    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        
        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Caller Daily Workdesk
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Complete your daily call tasks. Carried-over and scheduled tasks appear directly in your Today&apos;s Tasks queue.
            </p>
          </div>

        </div>

        {/* Quick KPI Strip */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div id="tour-calls-stat" className="bg-white p-2.5 sm:p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left">
            <div>
              <div className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">Calls</div>
              <div className="text-base sm:text-2xl font-black text-indigo-600 mt-0.5 sm:mt-1">{myActivity?.calls || 0}</div>
            </div>
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-indigo-50 items-center justify-center text-indigo-600">
              <PhoneCall className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left">
            <div>
              <div className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">Duration</div>
              <div className="text-base sm:text-2xl font-black text-gray-800 mt-0.5 sm:mt-1">{myActivity?.duration || "0s"}</div>
            </div>
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-purple-50 items-center justify-center text-purple-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div id="tour-today-stat" className="bg-white p-2.5 sm:p-4 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-center sm:justify-between text-center sm:text-left">
            <div>
              <div className="text-[10px] sm:text-[11px] font-bold text-gray-400 uppercase tracking-wider">Due Tasks</div>
              <div className="text-base sm:text-2xl font-black text-blue-600 mt-0.5 sm:mt-1">{todayTasks.length}</div>
            </div>
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-blue-50 items-center justify-center text-blue-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Main Workdesk: Tasks Queue */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Navigation Tabs */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
            <div className="flex items-center gap-1.5 bg-gray-200/60 p-1 rounded-xl">
              <button
                id="tour-today-tab"
                onClick={() => setCallerTaskTab("TODAY")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  callerTaskTab === "TODAY" 
                    ? "bg-white text-indigo-700 shadow-xs" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>Today's Tasks</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  callerTaskTab === "TODAY" ? "bg-indigo-100 text-indigo-700" : "bg-gray-300 text-gray-700"
                }`}>
                  {todayTasks.length}
                </span>
              </button>

              <button
                onClick={() => setCallerTaskTab("UPCOMING")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  callerTaskTab === "UPCOMING" 
                    ? "bg-white text-indigo-700 shadow-xs" 
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>Upcoming</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  callerTaskTab === "UPCOMING" ? "bg-indigo-100 text-indigo-700" : "bg-gray-300 text-gray-700"
                }`}>
                  {upcomingTasks.length}
                </span>
              </button>
            </div>

            <div className="text-xs text-gray-400 font-medium">
              Showing <strong>{activeList.length}</strong> client{activeList.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Tasks List */}
          <div className="divide-y divide-gray-100">
            {activeList.length === 0 ? (
              <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                <h4 className="text-base font-bold text-gray-700">All clear in this queue!</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  {callerTaskTab === "TODAY" 
                    ? "You have completed all scheduled tasks for today." 
                    : "No leads due for automatic follow-up within 24 hours or scheduled upcoming."}
                </p>
              </div>
            ) : (
              activeList.map((lead: any) => {
                const cf = lead.customFields || {};
                let dueDateStr = "Today";
                if (lead.taskDueDate) {
                  const d = new Date(lead.taskDueDate);
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const month = months[d.getMonth()];
                  const day = d.getDate();
                  let hours = d.getHours();
                  const minutes = d.getMinutes().toString().padStart(2, "0");
                  const ampm = hours >= 12 ? "PM" : "AM";
                  hours = hours % 12 || 12;
                  dueDateStr = `${month} ${day}, ${hours.toString().padStart(2, "0")}:${minutes} ${ampm}`;
                }

                return (
                  <div 
                    key={lead.id} 
                    className="p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors hover:bg-gray-50/80"
                  >
                    {/* Client Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Link 
                          href={`/leads/${lead.id}`} 
                          className="font-bold text-sm text-gray-900 hover:text-indigo-600 truncate hover:underline"
                        >
                          {lead.name}
                        </Link>
                        <span className="text-xs font-bold text-gray-500 font-mono">
                          {lead.phone || "--"}
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-100">
                          {lead.status || "NEW"}
                        </span>
                      </div>

                      {/* Scheduled Time & Task Type */}
                      <div className="text-xs text-gray-500 mt-1.5 flex flex-wrap items-center gap-3">
                        {lead.isAutoFollowUp ? (
                          <span suppressHydrationWarning className="flex items-center gap-1.5 font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Auto changes to Follow-up in {lead.timeRemainingLabel} ({lead.autoDueDateStr})
                          </span>
                        ) : (
                          <span suppressHydrationWarning className="flex items-center gap-1 font-bold text-gray-600">
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            Due: {dueDateStr}
                          </span>
                        )}

                        {cf.project_type && (
                          <span className="text-gray-400">
                            • Project: <strong className="text-gray-600 font-semibold">{cf.project_type}</strong>
                          </span>
                        )}

                        {lead.source && (
                          <span className="text-gray-400">
                            • Source: <strong className="text-gray-600 font-semibold">{lead.source}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (lead.phone) triggerSmartCall(lead.id, lead.name, lead.phone);
                        }}
                        className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 transition-colors"
                        title="Smart Call Lead"
                      >
                        <PhoneForwarded className="w-4 h-4 text-emerald-600" />
                      </button>

                      <Link
                        id={lead === activeList[0] ? "tour-first-call-btn" : undefined}
                        href={`/leads/${lead.id}`}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all hover:scale-105 flex items-center gap-1.5"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        Call & Update
                      </Link>
                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>
    );
  }

  const maxCount = statusBreakdown[0]?.count ?? 1;

  const handleAccept = async (id: string) => {
    setLoadingId(id);
    await acceptLead(id);
    setPending(prev => prev.filter(l => l.id !== id));
    setLoadingId(null);
  };

  const handleReject = async (id: string) => {
    setLoadingId(id);
    await rejectLead(id);
    setPending(prev => prev.filter(l => l.id !== id));
    setLoadingId(null);
  };

  const handleAcceptAll = async () => {
    if (!confirm(`Accept all ${pending.length} pending leads? They will be added to your leads list.`)) return;
    setBulkLoading("accept");
    await acceptAllLeads(userId);
    setPending([]);
    setBulkLoading(null);
  };

  const handleRejectAll = async () => {
    if (!confirm(`Reject all ${pending.length} pending leads? Escalation alerts will be sent to the admin.`)) return;
    setBulkLoading("reject");
    await rejectAllLeads(userId);
    setPending([]);
    setBulkLoading(null);
  };

  function timeAgo(d: Date | string) {
    const ms = Date.now() - new Date(d).getTime();
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days}d ago`;
  }

  return (
    <div className="h-full bg-[#f8fafc] flex flex-col -m-3 md:-m-6 overflow-y-auto">
      <div className="p-3 md:p-6 flex justify-between items-center bg-white border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link href="/audit" className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors shadow-sm border border-slate-700">
            <BarChart3 className="w-4 h-4 mr-2 text-indigo-400" /> Executive Audit & Reports
          </Link>
          <button onClick={() => setShowDailyReport(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors shadow-sm">
            <FileText className="w-4 h-4 mr-2" /> Daily Report
          </button>
        </div>
      </div>
      <div className="p-3 md:p-6 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          
        {/* Active Team Tasks Overview */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6 col-span-1 md:col-span-3">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-[13px] font-bold text-gray-800 flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-[#4f46e5]" />
              Team Pipeline Overview (Active Caller Tasks)
            </div>
            <div className="text-[11px] font-bold text-gray-500">
              Only showing active stages (Follow Up, Negotiation, etc.)
            </div>
          </div>
          <div className="p-0 max-h-[400px] overflow-y-auto">
            {(() => {
              const activeTeamTasks = allLeads.filter(l => !['JUNK', 'LOST', 'NOT_INTERESTED', 'WON'].includes(l.status || 'NEW'));
              if (activeTeamTasks.length === 0) return <div className="p-8 text-center text-gray-500 text-sm font-bold">No active tasks in the pipeline.</div>;
              return (
                <div className="divide-y divide-gray-100">
                  {activeTeamTasks.map((lead: any) => (
                    <div key={lead.id} className="p-3 px-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 pr-4">
                        <div className="font-bold text-[13px] text-gray-900 truncate">{lead.name}</div>
                        <div className="text-[11px] font-medium text-gray-500 mt-1 flex items-center gap-2 truncate">
                          <span className="inline-block px-2 py-0.5 rounded text-blue-700 bg-blue-50 font-bold border border-blue-100">
                            {lead.status || 'NEW'}
                          </span>
                          <span className="text-gray-500 font-bold flex items-center bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                            <User className="w-3 h-3 mr-1" />
                            {lead.assignedTo?.name || 'Unassigned'}
                          </span>
                        </div>
                      </div>
                      <Link 
                        href={`/leads/${lead.id}`}
                        className="whitespace-nowrap px-4 py-1.5 bg-[#4f46e5] text-white text-[12px] font-bold rounded-lg hover:bg-indigo-600 shadow-sm flex items-center"
                      >
                        <PhoneCall className="w-3 h-3 mr-1.5" /> Manage Task
                      </Link>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Site Visit Schedules */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6 col-span-1 md:col-span-3">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-[13px] font-bold text-gray-800 flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-orange-500" />
              Site Visit Overview (Field Team Tasks)
            </div>
            <Link href="/site-visits" className="text-[11px] text-[#4f46e5] font-bold hover:underline">View All &rarr;</Link>
          </div>
          <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto bg-gray-50/50 grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheduledLeads && scheduledLeads.length > 0 ? (
              scheduledLeads.map((lead: any) => (
                <SiteVisitExecutiveCard key={lead.id} lead={lead} overviewMode={true} />
              ))
            ) : (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300 col-span-1 md:col-span-2">
                <p className="text-gray-500 text-xs">No Site Visits Scheduled</p>
              </div>
            )}
          </div>
        </div>

        {/* Team Activity & Performance */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden col-span-1 md:col-span-3">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="text-[13px] font-bold text-gray-800">Activity & Performance</div>
          </div>
          
          <div className="p-4">
            {teamActivity.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="flex text-xs font-bold text-gray-400 uppercase tracking-wider pb-3 border-b border-gray-100">
                  <div className="flex-1">Team Member</div>
                  <div className="w-16 text-center">Calls</div>
                  <div className="w-20 text-center">Duration</div>
                  <div className="w-24 text-center">Report</div>
                </div>
                <div className="divide-y divide-gray-50">
                  {teamActivity.map(m => (
                    <div key={m.name} className="flex py-3 items-center text-sm">
                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-[#4f46e5] font-bold flex items-center justify-center text-xs">
                          {m.initials}
                        </div>
                        <span className="font-semibold text-gray-700">{m.name}</span>
                      </div>
                      <div className="w-16 text-center text-gray-600">{m.calls}</div>
                      <div className="w-20 text-center text-gray-600">{m.duration}</div>
                      <div className="w-24 text-center">
                        <button
                          onClick={() => setSelectedUserReport(m.name)}
                          className="text-[10px] font-bold text-[#4f46e5] hover:underline"
                        >
                          View Report
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-4 text-sm">No activity recorded yet.</div>
            )}
          </div>
        </div>

      </div>

      {showDailyReport && <DailyReportModal onClose={() => setShowDailyReport(false)} />}
      
      {selectedUserReport && (
        <UserReportModal 
          userName={selectedUserReport} 
          onClose={() => setSelectedUserReport(null)} 
          allLeads={allLeads}
          teamActivity={teamActivity}
        />
      )}
    </div>
  );
}

// ─── Sub-component: Interactive All Leads Widget ──────────────────────────────

function HotLeadsWidget({ hotLeads }: { hotLeads: (Lead & { computedScore?: number })[] }) {
  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-orange-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="p-4 border-b border-orange-100 flex items-center justify-between bg-white/50 backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-4 h-4 text-orange-600" />
          <div className="text-[13px] font-bold text-gray-800">Hot Leads (AI Top Picks)</div>
        </div>
        <Link href="/leads" className="text-[11px] text-orange-600 font-bold hover:underline">View All &rarr;</Link>
      </div>
      <div className="divide-y divide-orange-100/50 overflow-y-auto flex-1">
        {hotLeads.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">No hot leads right now.</div>
        ) : (
          hotLeads.map(lead => (
            <div key={lead.id} className="px-4 py-3 flex items-center justify-between hover:bg-orange-100/50 transition-colors">
              <div className="min-w-0 flex-1 mr-2">
                <Link href={`/leads/${lead.id}`} className="text-[13px] font-semibold text-gray-900 hover:text-orange-700 cursor-pointer hover:underline truncate block">
                  {lead.name}
                </Link>
                <div className="text-[11px] text-gray-500 truncate">{lead.phone ?? "--"} &bull; {lead.status ?? "Fresh"}</div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <div className="flex flex-col items-end">
                  <span className="text-[14px] font-black text-orange-600 leading-none">
                    {lead.computedScore?.toFixed(1) ?? "0.0"}
                  </span>
                  <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider">Score</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const DATE_OPTIONS = ["All Time", "Today", "Yesterday", "Last 7 days", "Last 30 days", "This Month"] as const;
type DateOption = typeof DATE_OPTIONS[number];
type SortOption = "default" | "count-high" | "count-low" | "a-z";

function AllLeadsWidget({ statusBreakdown, totalLeads, title = "All Leads" }: { statusBreakdown: StatusStat[]; totalLeads: number; title?: string }) {
  const [dateFilter, setDateFilter] = useState<DateOption>("All Time");
  const [dateOpen, setDateOpen] = useState(false);
  const [sort, setSort] = useState<SortOption>("default");

  // Since status breakdown comes from the server, we sort/filter client-side
  // (Date filter is a UI label — actual filtering would need server data by date)
  const sorted = [...statusBreakdown].sort((a, b) => {
    if (sort === "count-high") return b.count - a.count;
    if (sort === "count-low") return a.count - b.count;
    if (sort === "a-z") return a.label.localeCompare(b.label);
    return 0; // default order
  });

  const maxCount = sorted[0]?.count ?? 1;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center">
          <TrendingUp className="w-4 h-4 text-[#4f46e5] mr-2" />
          <div>
            <div className="text-[13px] font-bold text-gray-800">{title}</div>
            <div className="text-[10px] text-gray-400">Total Leads: {totalLeads}</div>
          </div>
        </div>

        {/* Creation Date Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDateOpen(!dateOpen)}
            className="text-[11px] font-bold text-gray-600 flex items-center border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 hover:border-[#4f46e5] transition-colors"
          >
            <span className="mr-1">📅</span> {dateFilter} <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${dateOpen ? "rotate-180" : ""}`} />
          </button>
          {dateOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
              {DATE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => { setDateFilter(opt); setDateOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-[12px] hover:bg-purple-50 hover:text-[#4f46e5] transition-colors flex items-center justify-between ${
                    dateFilter === opt ? "text-[#4f46e5] font-bold bg-purple-50" : "text-gray-700"
                  }`}
                >
                  {opt}
                  {dateFilter === opt && <span className="text-[#4f46e5]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sort Buttons */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex space-x-1.5 text-[11px]">
        {([
          { key: "default", label: "Default order" },
          { key: "count-high", label: "High-Low" },
          { key: "count-low", label: "Low-High" },
          { key: "a-z", label: "A-Z" },
        ] as { key: SortOption; label: string }[]).map(s => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`px-2.5 py-1 rounded font-bold transition-colors ${
              sort === s.key
                ? "bg-[#4f46e5] text-white"
                : "text-gray-500 border border-gray-200 hover:bg-gray-50 hover:border-[#4f46e5]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Column Headers */}
      <div className="px-3 py-2 border-b border-gray-100 flex text-[11px] font-bold text-gray-500">
        <span className="flex-1">STATUS</span>
        <span className="w-16 text-center">COUNT</span>
        <span className="w-16 text-center">SHARE</span>
      </div>

      {/* Rows */}
      <div className="overflow-y-auto max-h-72 divide-y divide-gray-50">
        {sorted.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">No leads yet.</div>
        ) : (
          sorted.map((s, i) => (
            <div key={s.label} className="flex items-center px-3 py-2.5 hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = '/leads?status=' + encodeURIComponent(s.label)}>
              <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${STATUS_BAR_COLORS[i % STATUS_BAR_COLORS.length]}`} />
              <span className="flex-1 text-[13px] text-gray-700">{s.label}</span>
              <span className="w-16 text-center text-[13px] font-bold text-gray-800">{s.count}</span>
              <div className="w-16 flex items-center">
                <div
                  className={`h-2 rounded-full transition-all ${STATUS_BAR_COLORS[i % STATUS_BAR_COLORS.length]}`}
                  style={{ width: `${Math.round((s.count / maxCount) * 56)}px` }}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer: selected date label */}
      {dateFilter !== "All Time" && (
        <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400 flex items-center">
          <span className="mr-1">📅</span> Showing: <span className="font-bold text-gray-600 ml-1">{dateFilter}</span>
          <button onClick={() => setDateFilter("All Time")} className="ml-auto text-[#4f46e5] hover:underline">Clear</button>
        </div>
      )}
    </div>
  );
}

function UserReportModal({ userName, onClose, allLeads, teamActivity }: { userName: string, onClose: () => void, allLeads: Lead[], teamActivity: TeamMember[] }) {
  const [activeTab, setActiveTab] = useState<"overview" | "logs">("overview");
  const [logs, setLogs] = useState<any[]>([]);

  const userLeads = allLeads.filter(l => l.assignedTo?.name === userName);
  const userActivity = teamActivity.find(t => t.name === userName);
  
  const breakdown: Record<string, number> = {};
  userLeads.forEach(l => {
    const s = l.status || "NEW";
    breakdown[s] = (breakdown[s] || 0) + 1;
  });
  
  const statusBreakdown = Object.keys(breakdown).map(label => ({
    label,
    count: breakdown[label],
    percent: ((breakdown[label] / userLeads.length) * 100).toFixed(1) + "%"
  }));

  useEffect(() => {
    if (activeTab === "logs") {
      getUserActivityLogs(userName).then(setLogs);
    }
  }, [activeTab, userName]);

  const downloadCSV = () => {
    const headers = ["Status", "Count", "Percentage"];
    const rows = statusBreakdown.map(b => [b.label, b.count, b.percent]);
    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${userName.replace(/\s+/g, '_')}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E8E2F7] text-[#4f46e5] font-bold flex items-center justify-center text-sm">
                {userName.split(" ").map((p: string) => p[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">{userName}&apos;s Report</h2>
                <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                  <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold text-[10px]">
                    {userActivity?.activeMinutes ?? 0}m ACTIVE TODAY
                  </span>
                  <span>{userActivity?.calls ?? 0} calls</span>
                </p>
              </div>
            </div>
            {activeTab === "overview" && (
              <div className="flex items-center gap-2 mr-8 md:mr-10">
                <button onClick={downloadCSV} className="flex items-center gap-2 bg-[#4f46e5] text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-purple-700 transition-colors">
                  <Download className="w-4 h-4" /> Download CSV
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-4 border-b border-gray-200 px-2">
            <button 
              onClick={() => setActiveTab("overview")} 
              className={`px-3 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === "overview" ? "border-[#4f46e5] text-[#4f46e5]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Overview
            </button>
            <button 
              onClick={() => setActiveTab("logs")} 
              className={`px-3 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === "logs" ? "border-[#4f46e5] text-[#4f46e5]" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              Activity Logs
            </button>
          </div>
        </div>
        <div className="p-6 bg-gray-50 overflow-y-auto flex-1">
          {activeTab === "overview" ? (
            <AllLeadsWidget statusBreakdown={statusBreakdown} totalLeads={userLeads.length} title={`${userName}'s Leads`} />
          ) : (
            <div className="space-y-4">
              {logs.length > 0 ? (
                logs.map(log => (
                  <div key={log.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-[#4f46e5] text-sm">{log.action}</span>
                      <span className="text-xs text-gray-400 flex items-center"><Clock className="w-3 h-3 mr-1" /> {new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                    {log.details && <p className="text-sm text-gray-600">{log.details}</p>}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">No logs found.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
