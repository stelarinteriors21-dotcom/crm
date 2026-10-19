export interface TutorialGuide {
  id: string;
  title: string;
  roleBadge: string;
  iconName: string;
  overview: string;
  steps: {
    title: string;
    description: string;
    proTip?: string;
  }[];
  keyRules?: string[];
}

export const SECTION_TUTORIALS: Record<string, TutorialGuide> = {
  // Caller Dashboard / Workdesk
  "/dashboard": {
    id: "dashboard",
    title: "Caller Daily Workdesk & Tasks",
    roleBadge: "Caller / Closer",
    iconName: "PhoneCall",
    overview: "Your central command center for daily calling and tracking pending tasks.",
    steps: [
      {
        title: "1. Today's Tasks & Carried-Over Calls",
        description: "All scheduled client follow-ups appear directly in your Today's Tasks queue. Any tasks not finished previously roll over automatically to today at the top of your list so no client is left behind.",
        proTip: "Past-due calls are placed right at the top of the queue so you can dial them first."
      },
      {
        title: "2. Work Through 'Today's Tasks'",
        description: "Click 'Call & Update' next to any client in your Today queue. Dial the client, discuss their requirements, and immediately log your call duration and notes.",
        proTip: "Use the Direct Call button on your phone or computer to dial with zero copy-pasting."
      },
      {
        title: "3. Schedule Next Follow-Up",
        description: "Never leave a lead without a next step. Pick 'Follow Up' status and select the exact date & time. The system will set a loud alarm reminder when it's time to call.",
      }
    ],
    keyRules: [
      "Always log calls within 2 hours of accepting a lead to avoid the Ghosted Lead alarm.",
      "Never push a lead to 'Follow Up' more than 5 times without moving them to Site Visit or Quotation.",
      "All unfinished tasks carry over automatically into your Today's Tasks queue."
    ]
  },

  // Leads Pipeline
  "/leads": {
    id: "leads",
    title: "Leads Pipeline & Contact Management",
    roleBadge: "All Roles",
    iconName: "Users",
    overview: "Search, filter, categorize, and prioritize all customer prospects across every stage of the sales journey.",
    steps: [
      {
        title: "1. Quick Search & Filter",
        description: "Use the search bar to find any client instantly by name, phone number, city, or lead tag (e.g., 'Potential lead').",
        proTip: "Click column headers to sort by lead score, creation date, or stage."
      },
      {
        title: "2. Hot Leads & AI Lead Scoring",
        description: "Every lead has a live AI Score calculated from Location (TVM proximity), Budget (1L - 20L+), Buying Timeline, and Quotation status. Prioritize leads rated 60+ (Warm & Hot).",
        proTip: "Leads with higher budgets and 1-month timelines automatically receive top priority."
      },
      {
        title: "3. Managing Lead Stages",
        description: "Move leads progressively from Fresh ➔ Contacted ➔ Site Visit Scheduled ➔ Quotation Shared ➔ Negotiation ➔ Won.",
        proTip: "To mark a lead Won or Advance Received, attach at least one document in the Documents tab."
      }
    ],
    keyRules: [
      "Keep phone numbers in clean format with country code (+91).",
      "Do not mark viable leads as Junk without reviewing with your manager."
    ]
  },

  // Site Visits Dashboard
  "/site-visits": {
    id: "site-visits",
    title: "Site Visits & GPS Field Executive Workflow",
    roleBadge: "Field Team / Site Visitors",
    iconName: "MapPin",
    overview: "For field executives visiting client properties to take room measurements, verify physical OTPs, and submit site notes.",
    steps: [
      {
        title: "1. Review Scheduled Appointments",
        description: "Check your assigned visits list for the day. Review the property address, scheduled time, and client phone number.",
        proTip: "Click 'Open in Google Maps' on your mobile to navigate directly to the client's property."
      },
      {
        title: "2. Meet Client & Request OTP",
        description: "When you arrive at the property and meet the client, ask them for the 4-digit verification OTP they received via WhatsApp.",
        proTip: "If the client lost the OTP, the caller or admin can hit 'Regenerate OTP' from the lead profile."
      },
      {
        title: "3. GPS Verification",
        description: "If GPS verification is enabled by the admin, ensure Location Services is turned ON on your phone browser. Enter the OTP and click 'Verify'.",
        proTip: "The system logs your exact GPS coordinate stamp and timestamp to certify that you were on-site."
      },
      {
        title: "4. Submit Measurements & Photos",
        description: "Take photos of floor plans and room dimensions, and upload them to the client's Document Attachments section for the design team.",
      }
    ],
    keyRules: [
      "Visits must be verified within 4 hours of the scheduled time or an escalation alert emails the manager.",
      "Never share your login or attempt OTP entry without being physically present at the property."
    ]
  },

  // Operations & Projects Board
  "/projects": {
    id: "projects",
    title: "Post-Sale Project Operations Board",
    roleBadge: "Designers & Production Team",
    iconName: "Briefcase",
    overview: "Where deals won in sales transition into design execution, factory manufacturing, and site handover.",
    steps: [
      {
        title: "1. Automatic Won Lead Intake",
        description: "The moment a caller or admin marks a deal 'Won', the project automatically lands in the '2D Design Finalized' column.",
      },
      {
        title: "2. Progress Through Delivery Stages",
        description: "Drag or select the phase dropdown on any card as your project hits milestones: 2D Design Finalized ➔ 3D Renders Approved ➔ Factory Production ➔ Site Installation ➔ Final Handover.",
        proTip: "Final Handover cards display a green completed checkmark once certified."
      },
      {
        title: "3. Uploading Design Renders & Estimates",
        description: "Attach approved 2D drawings, 3D photorealistic renders, and final itemized factory BOM sheets inside the lead's Documents section.",
      }
    ],
    keyRules: [
      "Do not move a project to 'Factory Production' without signed client 3D render approval.",
      "Final handover requires complete site installation sign-off."
    ]
  },

  // Organization Settings
  "/settings": {
    id: "settings",
    title: "Organization & Escalation Settings",
    roleBadge: "Root Admin Only",
    iconName: "Settings",
    overview: "Configure company-wide policies, escalation notification emails, custom tags, and field team security.",
    steps: [
      {
        title: "1. Escalation Email Alerts",
        description: "Configure comma-separated manager/director emails to receive urgent Level 2 alerts (e.g. leads ignored for >10 mins, follow-ups missed >8 hours, unverified site visits).",
      },
      {
        title: "2. Require GPS for Site Visits",
        description: "Toggle ON the 'Require GPS for Site Visits' switch. When enabled, field executives must grant GPS browser access before verifying OTPs.",
      },
      {
        title: "3. Custom Field Labels & Tags",
        description: "Customize lead pipeline tags and colors (e.g., 'Potential lead', 'VIP Client', 'Commercial').",
      }
    ]
  }
};
