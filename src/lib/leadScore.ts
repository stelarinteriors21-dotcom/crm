export const SCORE_MAX = 25.00;

export const SCORE_FACTORS = {
  // Stage 02 - Qualification
  scoreLocation: {
    stage: "Qualification",
    label: "Location",
    levels: ["None", "Outside", "Kerala", "Near TVM", "TVM"],
    scores:  [0,      6.25,      12.50,    18.75,       25.00],
  },
  scoreBudget: {
    stage: "Qualification",
    label: "Budget",
    levels: ["None", "1L - 5L", "5L - 10L", "10L - 20L", "20L+"],
    scores:  [0,       6.25,      12.50,      18.75,       25.00],
  },
  scoreTimeline: {
    stage: "Qualification",
    label: "Buying Timeline",
    levels: ["None", "6M+", "3-6M", "1-3M", "1M"],
    scores:  [0,       6.25,  12.50,  18.75,  25.00],
  },

  // Stage 04 - Sales
  scoreQuotation: {
    stage: "Sales",
    label: "Quotation",
    levels: ["None", "Estimate", "Revised", "Final"],
    scores:  [0,       8.33,       16.66,     25.00],
  },
} as const;

export type ScoreKey = keyof typeof SCORE_FACTORS;

export type LeadScoreInput = {
  scoreLocation: string;
  scoreBudget: string;
  scoreTimeline: string;
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
    const levelStr = input[key] ?? def.levels[0];
    
    let score = 0;
    const idx = def.levels.indexOf(levelStr as never);
    score = idx >= 0 ? def.scores[idx] : 0;

    const pct = (score / SCORE_MAX) * 100;
    factors.push({
      key,
      stage: def.stage,
      label: def.label,
      level: levelStr,
      score: Math.round(score * 100) / 100,
      max: SCORE_MAX,
      pct: Math.round(pct),
    });
  }

  const total = Math.round(factors.reduce((s, f) => s + f.score, 0) * 10) / 10;

  let grade = "Cold";
  if (total >= 80) grade = "Hot 🔥";
  else if (total >= 60) grade = "Warm";
  else if (total >= 40) grade = "Interested";
  else if (total >= 20) grade = "Prospect";

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
