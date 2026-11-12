"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar, ChevronDown, Check } from "lucide-react";

export type AnalyticsPeriod = "today" | "week" | "month" | "last_month" | "all" | "custom";

const PERIOD_OPTIONS: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

export default function AnalyticsDateFilter({
  currentPeriod,
  customStart = "",
  customEnd = "",
  rangeLabel,
}: {
  currentPeriod: AnalyticsPeriod;
  customStart?: string;
  customEnd?: string;
  rangeLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(customStart);
  const [end, setEnd] = useState(customEnd);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStart(customStart);
    setEnd(customEnd);
  }, [customStart, customEnd]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const currentLabel =
    currentPeriod === "custom" && customStart && customEnd
      ? `${customStart} to ${customEnd}`
      : PERIOD_OPTIONS.find((p) => p.value === currentPeriod)?.label || "This Month";

  const selectPeriod = (val: AnalyticsPeriod) => {
    if (val === "custom") return;
    setOpen(false);
    router.push(`/analytics?period=${val}`);
  };

  const applyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!start || !end) return;
    setOpen(false);
    router.push(`/analytics?period=custom&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center px-3.5 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 shadow-2xs transition-colors cursor-pointer"
        title={rangeLabel}
      >
        <Calendar className="w-4 h-4 mr-2 text-[#4f46e5]" />
        <span>{currentLabel}</span>
        <ChevronDown className="w-4 h-4 ml-2 text-gray-400" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="py-1 divide-y divide-gray-100">
            <div className="py-1">
              {PERIOD_OPTIONS.filter((o) => o.value !== "custom").map((opt) => {
                const active = currentPeriod === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => selectPeriod(opt.value)}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors cursor-pointer ${
                      active
                        ? "bg-indigo-50 text-[#4f46e5] font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {active && <Check className="w-4 h-4 text-[#4f46e5]" />}
                  </button>
                );
              })}
            </div>

            <form onSubmit={applyCustom} className="p-3 bg-gray-50/70 space-y-2">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                Custom Date Range
              </div>
              <div className="space-y-1.5">
                <input
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:border-[#4f46e5]"
                  required
                />
                <input
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:border-[#4f46e5]"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={!start || !end}
                className="w-full py-1.5 px-3 text-xs font-bold text-white bg-[#4f46e5] hover:bg-purple-800 rounded-md disabled:opacity-50 cursor-pointer"
              >
                Apply Range
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
