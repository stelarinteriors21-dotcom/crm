import * as XLSX from "xlsx";
import { getDetailedReportData } from "@/app/actions/reportActions";

export async function downloadDetailedExcelReport(timeframe: "weekly" | "monthly" | "daily" | "all") {
  const data = await getDetailedReportData(timeframe);
  const wb = XLSX.utils.book_new();

  // Sheet 1: Detailed Calls & Logs
  const callsHeader = [
    "Sl No",
    "Call Date & Time",
    "Caller Name",
    "Caller Role",
    "Lead Name",
    "Phone Number",
    "Email",
    "Lead Status",
    "Lead Source",
    "City / Location",
    "Approximate Budget",
    "Type of Space",
    "Property Status",
    "Call Status",
    "Duration (Seconds)",
    "Duration (Formatted)",
    "Follow-up Reason",
    "Follow-up Date",
    "Scheduled Site Visit",
    "Call Notes & Verification",
    "Recording Link"
  ];

  const callsRows = data.calls.map(c => [
    c.slNo,
    c.callDateTimeFormatted,
    c.callerName,
    c.callerRole,
    c.leadName,
    c.leadPhone,
    c.leadEmail,
    c.leadStatus,
    c.leadSource,
    c.city,
    c.approximateBudget,
    c.typeOfSpace,
    c.propertyStatus,
    c.callStatus,
    c.durationSeconds,
    c.durationFormatted,
    c.followUpReason,
    c.followUpDate,
    c.siteVisit,
    c.notes,
    c.recordingUrl
  ]);

  const wsCalls = XLSX.utils.aoa_to_sheet([callsHeader, ...callsRows]);
  // Set nice column widths for calls
  wsCalls["!cols"] = [
    { wch: 6 },  // Sl No
    { wch: 22 }, // Date
    { wch: 18 }, // Caller
    { wch: 14 }, // Role
    { wch: 22 }, // Lead Name
    { wch: 16 }, // Phone
    { wch: 22 }, // Email
    { wch: 16 }, // Status
    { wch: 14 }, // Source
    { wch: 18 }, // City
    { wch: 18 }, // Budget
    { wch: 18 }, // Space
    { wch: 18 }, // Property
    { wch: 16 }, // Call Status
    { wch: 12 }, // Duration Sec
    { wch: 16 }, // Duration Formatted
    { wch: 28 }, // Follow-up Reason
    { wch: 22 }, // Follow-up Date
    { wch: 28 }, // Site Visit
    { wch: 35 }, // Notes
    { wch: 35 }  // Recording
  ];
  XLSX.utils.book_append_sheet(wb, wsCalls, "Detailed Calls & Logs");

  // Sheet 2: Agent Performance Summary
  const summaryHeader = [
    "Caller Name",
    "Role",
    "Email",
    "Total Calls",
    "Connected Calls",
    "Missed Calls",
    "Total Talk Time",
    "Avg Call Duration",
    "Assigned Leads Count",
    "Site Visits Scheduled",
    "Site Visits Completed",
    "Quotations Sent",
    "Leads Won"
  ];

  const summaryRows = data.teamSummary.map(s => [
    s.callerName,
    s.role,
    s.email,
    s.totalCalls,
    s.connectedCalls,
    s.missedCalls,
    s.totalTalkTimeFormatted,
    s.avgCallDuration,
    s.assignedLeadsCount,
    s.siteVisitsScheduled,
    s.siteVisitsCompleted,
    s.quotationsSent,
    s.leadsWon
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet([summaryHeader, ...summaryRows]);
  wsSummary["!cols"] = [
    { wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 12 },
    { wch: 15 }, { wch: 14 }, { wch: 18 }, { wch: 16 },
    { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Team Performance");

  // Sheet 3: Active Pipeline & Follow-ups
  const tasksHeader = [
    "Lead Name",
    "Phone Number",
    "Assigned Caller",
    "Current Status",
    "Task Title",
    "Due Date",
    "City",
    "Budget",
    "Follow-up Reason"
  ];

  const tasksRows = data.pendingTasks.map(t => [
    t.leadName,
    t.leadPhone,
    t.callerName,
    t.leadStatus,
    t.taskTitle,
    t.dueDate,
    t.city,
    t.budget,
    t.followUpReason
  ]);

  const wsTasks = XLSX.utils.aoa_to_sheet([tasksHeader, ...tasksRows]);
  wsTasks["!cols"] = [
    { wch: 22 }, { wch: 16 }, { wch: 18 }, { wch: 16 },
    { wch: 25 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 28 }
  ];
  XLSX.utils.book_append_sheet(wb, wsTasks, "Active Pipeline & Tasks");

  const cleanStart = data.startDateFormatted.replace(/[\s,]+/g, "_");
  const cleanEnd = data.endDateFormatted.replace(/[\s,]+/g, "_");
  const fileName = `Detailed_${timeframe.toUpperCase()}_Report_${cleanStart}_to_${cleanEnd}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export async function downloadDetailedCsvReport(timeframe: "weekly" | "monthly" | "daily" | "all") {
  const data = await getDetailedReportData(timeframe);
  const headers = [
    "Sl No",
    "Call Date & Time",
    "Caller Name",
    "Caller Role",
    "Lead Name",
    "Phone Number",
    "Email",
    "Lead Status",
    "Lead Source",
    "City / Location",
    "Approximate Budget",
    "Type of Space",
    "Property Status",
    "Call Status",
    "Duration (Seconds)",
    "Duration (Formatted)",
    "Follow-up Reason",
    "Follow-up Date",
    "Scheduled Site Visit",
    "Call Notes & Verification",
    "Recording Link"
  ];

  const rows = data.calls.map(c => [
    c.slNo,
    `"${c.callDateTimeFormatted}"`,
    `"${c.callerName}"`,
    `"${c.callerRole}"`,
    `"${c.leadName}"`,
    `"${c.leadPhone}"`,
    `"${c.leadEmail}"`,
    `"${c.leadStatus}"`,
    `"${c.leadSource}"`,
    `"${c.city}"`,
    `"${c.approximateBudget}"`,
    `"${c.typeOfSpace}"`,
    `"${c.propertyStatus}"`,
    `"${c.callStatus}"`,
    c.durationSeconds,
    `"${c.durationFormatted}"`,
    `"${(c.followUpReason || "").replace(/"/g, '""')}"`,
    `"${c.followUpDate}"`,
    `"${c.siteVisit}"`,
    `"${(c.notes || "").replace(/"/g, '""')}"`,
    `"${c.recordingUrl}"`
  ]);

  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const cleanStart = data.startDateFormatted.replace(/[\s,]+/g, "_");
  const cleanEnd = data.endDateFormatted.replace(/[\s,]+/g, "_");
  a.download = `Detailed_${timeframe.toUpperCase()}_Report_${cleanStart}_to_${cleanEnd}.csv`;
  a.click();
}
