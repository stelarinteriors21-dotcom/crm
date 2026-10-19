"use client";

import React, { useState } from "react";
import { SCORE_FACTORS, calculateLeadScore, getScoreColor, getScoreBarColor, LeadScoreInput, ScoreKey } from "@/lib/leadScore";
import { updateLeadScore } from "@/app/actions/scoreActions";
import { ChevronDown, Target, Save, CheckCircle } from "lucide-react";

type Props = {
  leadId: string;
  initialScores: LeadScoreInput;
  onSave?: (scores: any) => void;
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
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <Target className="w-4 h-4 text-[#4f46e5] mr-2" />
          <span className="text-[13px] sm:text-[14px] font-bold text-gray-800">Lead Score</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Compact Horizontal Score Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50/40 via-purple-50/20 to-white border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-gray-900 leading-none">{Math.round(total)}</span>
            <span className="text-xs font-bold text-gray-400">/ 100</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md border ${
              total >= 75 ? "text-blue-700 bg-blue-50 border-blue-200" :
              total >= 50 ? "text-purple-700 bg-purple-50 border-purple-200" :
              total >= 25 ? "text-amber-700 bg-amber-50 border-amber-200" :
              "text-red-700 bg-red-50 border-red-200"
            }`}>
              {grade}
            </span>
            <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
              <span className="text-emerald-500">↑</span> Real-time
            </span>
          </div>
        </div>
        {/* Slim progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(total, 100)}%` }}
          />
        </div>
      </div>

      {expanded && (
        <>
          {/* Factors by Stage */}
          <div className="divide-y divide-gray-100">
            {Object.entries(stages).map(([stage, stageFactors]) => {
              const stageDisplayName = stage.split(" — ")[1]?.toUpperCase() || stage.toUpperCase();
              return (
                <div key={stage} className="p-3.5 space-y-2.5">
                  {/* Stage Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {stageDisplayName}
                    </span>
                    <span className="text-[11px] text-gray-400 font-bold">
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
                      <div key={factor.key} className="bg-gray-50/70 p-2.5 border border-gray-200/80 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                            {factor.label}
                          </label>
                          <div className="text-[11px] font-black text-gray-800">
                            {factor.score.toFixed(2)}
                            <span className="text-[10px] font-normal text-gray-400"> / {factor.max.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Level pills */}
                        <div className="flex flex-wrap gap-1">
                          {def.levels.map((level) => {
                            const isSelected = currentSelectedArr.includes(level);
                            return (
                              <button
                                key={level}
                                type="button"
                                onClick={() => handleChange(factor.key, level)}
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-[#4f46e5] text-white border-[#4f46e5] shadow-2xs"
                                    : "bg-white text-gray-600 border-gray-200 hover:border-[#4f46e5] hover:text-[#4f46e5]"
                                }`}
                              >
                                {level}
                              </button>
                            );
                          })}
                        </div>

                        {/* Factor progress bar */}
                        <div className="h-1 w-full bg-gray-200/70 rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${STAGE_COLORS[factor.stage] || "bg-[#4f46e5]"}`}
                            style={{ width: `${(factor.score / factor.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Total Row */}
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-[11px] font-black text-gray-700">TOTAL SCORE</div>
            <div className={`text-[12px] sm:text-[13px] font-black px-2 py-0.5 rounded-md border ${scoreColor}`}>
              {total.toFixed(1)} / 100 — {grade}
            </div>
          </div>

          {/* Save Button */}
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full flex items-center justify-center py-2 rounded-lg text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer ${
                saved
                  ? "bg-green-600 text-white"
                  : "bg-[#4f46e5] text-white hover:bg-purple-800"
              } disabled:opacity-60`}
            >
              {saved ? (
                <><CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Saved!</>
              ) : saving ? (
                "Saving..."
              ) : (
                <><Save className="w-3.5 h-3.5 mr-1.5" /> Save Score</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
