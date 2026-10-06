"use client";

import React, { useState } from "react";
import { SCORE_FACTORS, calculateLeadScore, getScoreColor, getScoreBarColor, LeadScoreInput, ScoreKey } from "@/lib/leadScore";
import { updateLeadScore } from "@/app/actions/scoreActions";
import { ChevronDown, Target, Save, CheckCircle } from "lucide-react";

type Props = {
  leadId: string;
  initialScores: LeadScoreInput;
};

const STAGE_COLORS: Record<string, string> = {
  "01 — Interest":      "bg-blue-500",
  "02 — Qualification": "bg-purple-500",
  "03 — Project":       "bg-indigo-500",
  "04 — Sales":         "bg-green-500",
};

const STAGE_LABEL_COLORS: Record<string, string> = {
  "01 — Interest":      "text-blue-700 bg-blue-50 border-blue-200",
  "02 — Qualification": "text-purple-700 bg-purple-50 border-purple-200",
  "03 — Project":       "text-indigo-700 bg-indigo-50 border-indigo-200",
  "04 — Sales":         "text-green-700 bg-green-50 border-green-200",
};

export default function LeadScoreWidget({ leadId, initialScores, onSave }: Props) {
  const [scores, setScores] = useState<LeadScoreInput>(initialScores);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const { total, factors, grade, stageBreakdown } = calculateLeadScore(scores);
  const scoreColor = getScoreColor(total);
  const barColor = getScoreBarColor(total);

  const handleChange = (key: ScoreKey, value: string) => {
    const def = SCORE_FACTORS[key];
    setScores(prev => {
      if ("type" in def && def.type === "multi") {
        if (value === "None") return { ...prev, [key]: "None" };
        
        let current = (prev[key] || "None").split(",").map(s => s.trim()).filter(Boolean);
        if (current.includes("None")) current = [];
        
        if (current.includes(value)) {
          current = current.filter(v => v !== value);
        } else {
          current.push(value);
        }
        
        if (current.length === 0) current = ["None"];
        return { ...prev, [key]: current.join(",") };
      }
      return { ...prev, [key]: value };
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await updateLeadScore(leadId, scores);
    if (onSave) onSave(scores);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // Group by stage
  const stages: Record<string, typeof factors> = {};
  for (const f of factors) {
    if (!stages[f.stage]) stages[f.stage] = [];
    stages[f.stage].push(f);
  }


  // Arc gauge helpers
  const RADIUS = 54;
  const CIRCUMFERENCE = Math.PI * RADIUS; // half circle
  const scorePercent = Math.min(total / 100, 1);
  const arcFill = scorePercent * CIRCUMFERENCE;

  const arcColor = total >= 75 ? "#2563eb" : total >= 50 ? "#7c3aed" : total >= 25 ? "#f59e0b" : "#ef4444";
  const gradeColorClass = total >= 75 ? "text-blue-600" : total >= 50 ? "text-purple-600" : total >= 25 ? "text-amber-500" : "text-red-500";

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <Target className="w-4 h-4 text-[#4f46e5] mr-2" />
          <span className="text-[14px] font-bold text-gray-800">Lead Score</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Arc Gauge */}
      <div className="flex flex-col items-center pb-4 pt-2 bg-gradient-to-b from-blue-50/50 to-white">
        <div className="relative w-36 h-20 flex items-end justify-center">
          <svg
            width="144" height="80"
            viewBox="0 0 144 80"
            className="absolute top-0 left-0"
          >
            {/* Background arc */}
            <path
              d="M 12 72 A 60 60 0 0 1 132 72"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Foreground arc */}
            <path
              d="M 12 72 A 60 60 0 0 1 132 72"
              fill="none"
              stroke="url(#arcGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${arcFill * (188.4 / CIRCUMFERENCE)} 188.4`}
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
            <defs>
              <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor={arcColor} />
              </linearGradient>
            </defs>
          </svg>
          {/* Score number */}
          <div className="flex flex-col items-center mb-1 z-10">
            <span className="text-4xl font-black text-gray-900 leading-none">{Math.round(total)}</span>
          </div>
        </div>
        {/* Grade */}
        <span className={`text-sm font-bold mt-1 ${gradeColorClass}`}>{grade}</span>
        {/* Real-time badge */}
        <div className="flex items-center gap-1 mt-1.5">
          <span className="text-green-500 text-xs">↑</span>
          <span className="text-xs text-gray-500 font-medium">Real-time</span>
        </div>
        {/* Mini stage breakdown bars */}
        <div className="flex gap-1 mt-3 w-full px-5">
          {Object.entries(stageBreakdown).map(([stage, pts]) => (
            <div key={stage} className="flex-1 text-center">
              <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden mb-0.5">
                <div
                  className={`h-full rounded-full ${STAGE_COLORS[stage] ?? "bg-gray-400"}`}
                  style={{ width: `${Math.min((pts / 33.33) * 100, 100)}%` }}
                />
              </div>
              <span className="text-[9px] text-gray-400">{stage.split(" — ")[1]}</span>
            </div>
          ))}
        </div>
      </div>

      {expanded && (
        <>
          {/* Factors by Stage */}
          <div className="border-t border-gray-100">
            {Object.entries(stages).map(([stage, stageFactors]) => (
              <div key={stage} className="border-b border-gray-100 last:border-0">
                {/* Stage Header */}
                <div className="flex items-center justify-between mt-6 mb-3 px-4">
                  <span className="text-[10px] font-black tracking-wider uppercase px-2 py-1 rounded bg-gray-100 text-gray-500">
                    {stage}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {stageFactors.reduce((s, f) => s + f.score, 0).toFixed(2)} / {stageFactors.reduce((s, f) => s + f.max, 0).toFixed(2)}
                  </span>
                </div>

                {/* Factors */}
                {stageFactors.map(factor => {
                  const def = SCORE_FACTORS[factor.key];
                  const currentSelectedStr = scores[factor.key] || "None";
                  const isMulti = "type" in def && def.type === "multi";
                  const currentSelectedArr = isMulti ? currentSelectedStr.split(",").map(s => s.trim()) : [currentSelectedStr];
                  
                  return (
                    <div key={factor.key} className="flex items-center justify-between bg-white px-4 py-3 border border-gray-100 rounded-lg hover:border-gray-300 transition-colors group mb-2 mx-4">
                      <div className="flex-1 min-w-0 pr-4">
                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">{factor.label}</label>
                        {/* Level pills */}
                        <div className="flex flex-wrap gap-1.5">
                          {def.levels.map((level) => {
                            const isSelected = currentSelectedArr.includes(level);
                            return (
                              <button
                                key={level}
                                onClick={() => handleChange(factor.key, level)}
                                className={`px-2 py-1 rounded text-[11px] font-semibold border transition-all ${
                                  isSelected
                                    ? "bg-[#4f46e5] text-white border-[#4f46e5] shadow-sm"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-[#4f46e5] hover:text-[#4f46e5]"
                                }`}
                              >
                                {level}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0 w-24">
                        <div className="text-[13px] font-black text-gray-800">
                          {factor.score.toFixed(2)}
                          <span className="text-[10px] font-medium text-gray-400"> / {factor.max.toFixed(2)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${STAGE_COLORS[factor.stage] || "bg-gray-400"}`}
                            style={{ width: `${(factor.score / factor.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Total Row */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-[13px] font-black text-gray-800">TOTAL SCORE</div>
            <div className={`text-[18px] font-black px-3 py-1 rounded-lg border ${scoreColor}`}>
              {total.toFixed(1)} / 100 — {grade}
            </div>
          </div>

          {/* Save Button */}
          <div className="px-5 py-3 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full flex items-center justify-center py-2.5 rounded-lg text-[13px] font-bold transition-all ${
                saved
                  ? "bg-green-600 text-white"
                  : "bg-[#4f46e5] text-white hover:bg-purple-800"
              } disabled:opacity-60`}
            >
              {saved ? (
                <><CheckCircle className="w-4 h-4 mr-2" /> Saved!</>
              ) : saving ? (
                "Saving..."
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save Score</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
