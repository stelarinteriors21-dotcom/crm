"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronRight, ChevronLeft, X, Sparkles, CheckCircle2, 
  Lightbulb, MousePointerClick, Gamepad2, ArrowDown, ArrowUp, 
  ArrowLeft, ArrowRight, CornerDownRight, Zap
} from "lucide-react";

export interface WalkthroughStep {
  targetSelector: string;
  title: string;
  description: string;
  badge?: string;
  arrowDirection?: "down" | "up" | "left" | "right";
  proTip?: string;
}

const DASHBOARD_STEPS: WalkthroughStep[] = [
  {
    targetSelector: "#tour-today-stat",
    title: "1. Tasks Due Today",
    description: "All client calls scheduled for today—including any carried-over tasks from previous days—are automatically lined up here for you.",
    badge: "Daily Workdesk",
    arrowDirection: "up",
    proTip: "Past-due calls are prioritized right at the top of your queue so you never lose track of a client."
  },
  {
    targetSelector: "#tour-today-tab",
    title: "2. Today's Scheduled Calls",
    description: "This tab lists all client follow-ups due today. Work down this list from top to bottom throughout your shift.",
    badge: "Calling Queue",
    arrowDirection: "down"
  },
  {
    targetSelector: "#tour-first-call-btn",
    title: "3. Dial & Log Every Conversation",
    description: "Click 'Call & Update' to open the client profile. Dial the client, update their stage (e.g. Schedule Site Visit, Share Quotation), and schedule their next follow-up date.",
    badge: "Action Step",
    arrowDirection: "right",
    proTip: "Never leave a client without setting a next Follow-Up Date & Time!"
  },
  {
    targetSelector: "#tour-calls-stat",
    title: "4. Daily Call Target Counter",
    description: "Watch your live call count increase as you log calls. Aim to hit your daily target before your shift ends!",
    badge: "KPI Tracker",
    arrowDirection: "up"
  }
];

export default function InteractiveGameTour({
  isActive,
  onClose,
}: {
  isActive: boolean;
  onClose: () => void;
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = DASHBOARD_STEPS[currentStepIndex];

  // Update target positioning whenever step changes or window resizes
  useEffect(() => {
    if (!isActive) return;

    const updatePosition = () => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        // Scroll element into view smoothly if offscreen
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        setTimeout(() => {
          const rect = el.getBoundingClientRect();
          setTargetRect(rect);
        }, 300);
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [isActive, currentStepIndex, step.targetSelector]);

  if (!isActive) return null;

  const handleNext = () => {
    if (currentStepIndex < DASHBOARD_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Calculate Tooltip & Arrow Position based on target bounding box
  const getPopoverStyle = () => {
    if (!targetRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const margin = 20;
    const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
    const windowHeight = typeof window !== "undefined" ? window.innerHeight : 800;

    // Default: place below if space, otherwise above
    let top = targetRect.bottom + margin;
    let left = Math.max(20, Math.min(targetRect.left, windowWidth - 380));

    // If overflowing bottom
    if (top + 260 > windowHeight) {
      top = Math.max(20, targetRect.top - 260 - margin);
    }

    return {
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
    };
  };

  return (
    <div className="fixed inset-0 z-[300] pointer-events-auto">
      {/* Dark overlay backdrop with transparent hole cutout */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] transition-all duration-300" />

      {/* Target Spotlight Highlight Ring */}
      {targetRect && (
        <div
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
          className="absolute z-[305] rounded-2xl border-4 border-amber-400 bg-amber-400/10 shadow-[0_0_35px_rgba(251,191,36,0.85)] animate-pulse pointer-events-none transition-all duration-300"
        >
          {/* Animated Gamer Arrow pointing straight at element */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
            <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider shadow-md">
              CLICK HERE
            </span>
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-400 mt-0.5" />
          </div>
        </div>
      )}

      {/* Interactive Tooltip Card */}
      <div
        style={getPopoverStyle()}
        className="fixed z-[310] w-[340px] md:w-[380px] bg-white rounded-2xl shadow-2xl border-2 border-indigo-500 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 px-5 py-3.5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-xs tracking-tight">Interactive Game Tour</span>
              <div className="text-[10px] text-indigo-200">
                Step {currentStepIndex + 1} of {DASHBOARD_STEPS.length}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-gray-900">{step.title}</h3>
            {step.badge && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                {step.badge}
              </span>
            )}
          </div>

          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            {step.description}
          </p>

          {step.proTip && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-2.5 flex items-start gap-2 text-[11px] text-purple-950">
              <Lightbulb className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-purple-700">Pro-Tip: </strong>
                {step.proTip}
              </div>
            </div>
          )}

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {DASHBOARD_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStepIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === currentStepIndex 
                    ? "w-6 bg-indigo-600" 
                    : "w-2 bg-gray-200 hover:bg-gray-300"
                }`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              onClick={handlePrev}
              disabled={currentStepIndex === 0}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                currentStepIndex === 0 
                  ? "text-gray-300 cursor-not-allowed" 
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            <button
              onClick={handleNext}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-100 transition-all hover:scale-105"
            >
              {currentStepIndex === DASHBOARD_STEPS.length - 1 ? (
                <>Finish Tour <CheckCircle2 className="w-4 h-4" /></>
              ) : (
                <>Next Step <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
