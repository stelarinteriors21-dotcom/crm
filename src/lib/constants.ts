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
