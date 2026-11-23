export const LEAD_STATUS_COLORS: Record<string, string> = {
  "Fresh": "bg-teal-500 text-white",
  "RNR": "bg-gray-400 text-white",
  "Contacted": "bg-indigo-500 text-white",
  "follow up": "bg-blue-500 text-white",
  "Junk": "bg-gray-600 text-white",
  "Site visit Schedules": "bg-teal-600 text-white",
  "Site visit Recheduled": "bg-teal-700 text-white",
  "Site visit done": "bg-teal-800 text-white",
  "Estimate without site visit": "bg-amber-600 text-white",
  "Quotation Requested": "bg-amber-500 text-white",
  "Quotation without site visit": "bg-amber-600 text-white",
  "Quotation shared": "bg-yellow-500 text-white",
  "Estimated Quotation": "bg-yellow-600 text-white",
  "Revised Quotation": "bg-yellow-700 text-white",
  "final Quotation": "bg-yellow-800 text-white",
  "Advance recieved": "bg-blue-800 text-white",
  "Pay Pending": "bg-orange-600 text-white",
  "Won": "bg-green-600 text-white"
};

export const LEAD_STATUS_OPTIONS = Object.keys(LEAD_STATUS_COLORS);

// Whitelist for previous / past status milestone stages (excludes preliminary/trivial states like Fresh, RNR, Contacted, follow up, Junk)
export const PAST_MILESTONE_STATUS_OPTIONS: string[] = [
  "Site visit Schedules",
  "Site visit Recheduled",
  "Site visit done",
  "Estimate without site visit",
  "Quotation Requested",
  "Quotation without site visit",
  "Quotation shared",
  "Estimated Quotation",
  "Revised Quotation",
  "final Quotation",
  "Advance recieved",
  "Pay Pending",
  "Won",
];

export const PAST_MILESTONE_GROUPS = [
  {
    category: "Site Visit Milestones",
    description: "Scheduled, completed, or rescheduled on-site assessments",
    statuses: [
      "Site visit Schedules",
      "Site visit Recheduled",
      "Site visit done"
    ]
  },
  {
    category: "Quotation & Estimate Milestones",
    description: "Estimates and quotations requested or delivered",
    statuses: [
      "Estimate without site visit",
      "Quotation without site visit",
      "Quotation Requested",
      "Quotation shared",
      "Estimated Quotation",
      "Revised Quotation",
      "final Quotation"
    ]
  },
  {
    category: "Conversion & Deal Milestones",
    description: "Deals won, advance received, or payments pending",
    statuses: [
      "Advance recieved",
      "Pay Pending",
      "Won"
    ]
  }
];

export const NON_MILESTONE_STATUSES = new Set([
  "Fresh",
  "RNR",
  "Contacted",
  "follow up",
  "Junk",
  "Lost",
  "Job enquiry",
  "just curious",
  "Hold"
]);

export function isPastMilestoneStatus(status?: string | null): boolean {
  if (!status) return false;
  return PAST_MILESTONE_STATUS_OPTIONS.includes(status);
}

/**
 * Returns the most recent qualifying milestone status from customFields history.
 * Explicitly ignores non-milestone statuses (Fresh, RNR, Contacted, follow up, Junk).
 */
export function getLeadPastMilestone(customFields: any, currentStatus?: string | null): string | null {
  if (!customFields) return null;

  // 1. Traverse statusHistory backwards to find the latest previous status that is a milestone
  if (Array.isArray(customFields.statusHistory) && customFields.statusHistory.length > 0) {
    for (let i = customFields.statusHistory.length - 1; i >= 0; i--) {
      const entry = customFields.statusHistory[i];
      const fromStatus = entry?.from;
      if (fromStatus && isPastMilestoneStatus(fromStatus) && fromStatus !== currentStatus) {
        return fromStatus;
      }
    }
  }

  // 2. Fall back to customFields.pastStatus if it qualifies as a milestone and isn't current status
  if (customFields.pastStatus && isPastMilestoneStatus(customFields.pastStatus) && customFields.pastStatus !== currentStatus) {
    return customFields.pastStatus;
  }

  return null;
}

/**
 * Computes both the latest past milestone and the complete set of historical milestones
 * reached by a lead (excluding preliminary non-milestones like Fresh, RNR, Contacted, follow up, Junk).
 */
export function computeLeadMilestones(statusHistory: any[], pastStatus?: string | null, currentStatus?: string | null) {
  const milestoneSet = new Set<string>();
  let latestMilestone: string | null = null;

  if (Array.isArray(statusHistory)) {
    for (const item of statusHistory) {
      if (item?.from && isPastMilestoneStatus(item.from) && item.from !== currentStatus) {
        milestoneSet.add(item.from);
      }
    }
    for (let i = statusHistory.length - 1; i >= 0; i--) {
      const from = statusHistory[i]?.from;
      if (from && isPastMilestoneStatus(from) && from !== currentStatus) {
        latestMilestone = from;
        break;
      }
    }
  }

  if (!latestMilestone && pastStatus && isPastMilestoneStatus(pastStatus) && pastStatus !== currentStatus) {
    latestMilestone = pastStatus;
    milestoneSet.add(pastStatus);
  }

  return {
    pastStatus: latestMilestone,
    pastMilestones: Array.from(milestoneSet)
  };
}

