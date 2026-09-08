// Stelar Lead Scoring — Stagewise
// Each factor has a max of 11.11 points (9 factors × 11.11 = ~100)

export const SCORE_MAX = 11.11;

export const SCORE_FACTORS = {
  // Stage 01 — Interest
  scoreEngagement: {
    stage: "01 — Interest",
    label: "Engagement / Intent",
    levels: ["None", "Cold", "Warm", "Hot"],
    scores:  [0,       2.78,   5.56,   11.11],
  },

  // Stage 02 — Qualification
  scoreLocation: {
    stage: "02 — Qualification",
    label: "Location",
    levels: ["Outside", "Kerala", "Near TVM", "TVM"],
    scores:  [0,          2.78,    5.56,        11.11],
  },
  scoreBudget: {
    stage: "02 — Qualification",
    label: "Budget",
    levels: ["Unknown", "Poor", "Possible", "Good", "Strong"],
    scores:  [0,          2.78,  5.56,       8.33,  11.11],
  },
  scoreTimeline: {
    stage: "02 — Qualification",
    label: "Buying Timeline",
    levels: ["None", "6M+", "3-6M", "1-3M", "<30D"],
    scores:  [0,       2.78,  5.56,   8.33,  11.11],
  },

  // Stage 03 — Project
  scoreFullHome: {
    stage: "03 — Project",
    label: "Full Home",
    levels: ["Room", "Limited", "Multiple", "Major", "Full Home"],
    scores:  [0,       2.78,     5.56,       8.33,   11.11],
  },
  scoreFloorPlan: {
    stage: "03 — Project",
    label: "Floor Plan",
    levels: ["None", "Pending", "Partial", "Received"],
    scores:  [0,       2.78,     5.56,      11.11],
  },
  scoreMoodBoard: {
    stage: "03 — Project",
    label: "Mood Board",
    levels: ["None", "Style", "References", "Direction", "Received"],
    scores:  [0,       2.78,  5.56,          8.33,       11.11],
  },

  // Stage 04 — Sales
  scoreSiteVisit: {
    stage: "04 — Sales",
    label: "Site Visit",
    levels: ["None", "Discussed", "Scheduled", "Done"],
    scores:  [0,       2.78,       8.33,        11.11],
  },
  scoreQuotation: {
    stage: "04 — Sales",
    label: "Quotation",
    levels: ["None", "Discussed", "Requested", "Shared", "Review"],
    scores:  [0,       2.78,       5.56,        8.33,    11.11],
  },
} as const;

export type ScoreKey = keyof typeof SCORE_FACTORS;

export type LeadScoreInput = {
  scoreEngagement: string;
  scoreLocation: string;
  scoreBudget: string;
  scoreTimeline: string;
  scoreFullHome: string;
  scoreFloorPlan: string;
  scoreMoodBoard: string;
  scoreSiteVisit: string;
  scoreQuotation: string;
};

export type FactorResult = {
  key: ScoreKey;
  stage: string;
  label: string;
  level: string;
  score: number;
  max: number;
  pct: number;
};

export function calculateLeadScore(input: LeadScoreInput): {
  total: number;
  factors: FactorResult[];
  grade: string;
  stageBreakdown: Record<string, number>;
} {
  const factors: FactorResult[] = [];

  for (const [key, def] of Object.entries(SCORE_FACTORS) as [ScoreKey, (typeof SCORE_FACTORS)[ScoreKey]][]) {
    const level = input[key] ?? def.levels[0];
    const idx = def.levels.indexOf(level as never);
    const score = idx >= 0 ? def.scores[idx] : 0;
    const pct = (score / SCORE_MAX) * 100;
    factors.push({
      key,
      stage: def.stage,
      label: def.label,
      level,
      score: Math.round(score * 100) / 100,
      max: SCORE_MAX,
      pct: Math.round(pct),
    });
  }

  const total = Math.round(factors.reduce((s, f) => s + f.score, 0) * 10) / 10;

  // Grade
  let grade = "Cold";
  if (total >= 80) grade = "Hot 🔥";
  else if (total >= 60) grade = "Warm";
  else if (total >= 40) grade = "Interested";
  else if (total >= 20) grade = "Prospect";

  // Stage breakdown
  const stageBreakdown: Record<string, number> = {};
  for (const f of factors) {
    stageBreakdown[f.stage] = (stageBreakdown[f.stage] ?? 0) + f.score;
  }

  return { total, factors, grade, stageBreakdown };
}

export function getScoreColor(total: number): string {
  if (total >= 80) return "text-red-600 bg-red-50 border-red-200";
  if (total >= 60) return "text-orange-600 bg-orange-50 border-orange-200";
  if (total >= 40) return "text-yellow-700 bg-yellow-50 border-yellow-200";
  if (total >= 20) return "text-blue-600 bg-blue-50 border-blue-200";
  return "text-gray-500 bg-gray-50 border-gray-200";
}

export function getScoreBarColor(total: number): string {
  if (total >= 80) return "bg-red-500";
  if (total >= 60) return "bg-orange-500";
  if (total >= 40) return "bg-yellow-500";
  if (total >= 20) return "bg-blue-500";
  return "bg-gray-300";
}
