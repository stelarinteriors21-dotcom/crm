"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { 
  HelpCircle, BookOpen, X, ChevronRight, CheckCircle2, 
  Lightbulb, ShieldAlert, Sparkles, MapPin, Users, PhoneCall, 
  Briefcase, Settings, ExternalLink, Gamepad2
} from "lucide-react";
import { SECTION_TUTORIALS, TutorialGuide } from "@/lib/tutorialData";

export default function GlobalTutorialModal() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Determine current active section tutorial, or fallback to general tutorial
  const currentKey = Object.keys(SECTION_TUTORIALS).find(k => pathname === k || pathname.startsWith(k + "/")) || "/dashboard";
  const [activeGuideId, setActiveGuideId] = useState<string>(SECTION_TUTORIALS[currentKey]?.id || "dashboard");

  // Keep active guide synced with page route when user opens modal
  const handleOpen = () => {
    const matched = Object.keys(SECTION_TUTORIALS).find(k => pathname === k || pathname.startsWith(k + "/")) || "/dashboard";
    setActiveGuideId(SECTION_TUTORIALS[matched]?.id || "dashboard");
    setIsOpen(true);
  };

  const activeGuide: TutorialGuide = Object.values(SECTION_TUTORIALS).find(g => g.id === activeGuideId) || SECTION_TUTORIALS["/dashboard"];

  const getIcon = (id: string) => {
    switch(id) {
      case "dashboard": return <PhoneCall className="w-4 h-4" />;
      case "leads": return <Users className="w-4 h-4" />;
      case "site-visits": return <MapPin className="w-4 h-4" />;
      case "projects": return <Briefcase className="w-4 h-4" />;
      case "settings": return <Settings className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <>
      {/* Persistent Floating / Header Tutorial Button */}
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#4f46e5] bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 transition-all hover:scale-105 shadow-2xs"
        title="Open interactive step-by-step tutorial for this page"
      >
        <HelpCircle className="w-4 h-4 text-[#4f46e5]" />
        <span className="hidden sm:inline">Help & Tutorial</span>
      </button>

      {/* Tutorial Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl h-[88vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden border border-gray-200">
            
            {/* Left Sidebar: Guide Topics List */}
            <div className="w-full md:w-64 max-h-40 sm:max-h-48 md:max-h-none bg-gray-50/80 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col shrink-0">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#4f46e5] text-white flex items-center justify-center">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900">App Academy</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Interactive Guides</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {Object.values(SECTION_TUTORIALS).map((guide) => {
                  const isActive = guide.id === activeGuideId;
                  const isCurrentPage = SECTION_TUTORIALS[currentKey]?.id === guide.id;

                  return (
                    <button
                      key={guide.id}
                      onClick={() => setActiveGuideId(guide.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between text-xs font-bold ${
                        isActive 
                          ? "bg-[#4f46e5] text-white shadow-sm" 
                          : "text-gray-700 hover:bg-gray-100/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={isActive ? "text-white" : "text-gray-500"}>
                          {getIcon(guide.id)}
                        </span>
                        <div className="truncate">
                          <div className="truncate">{guide.title.split(" & ")[0]}</div>
                          {isCurrentPage && (
                            <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-extrabold ${
                              isActive ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                            }`}>
                              Current Page
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-gray-400"}`} />
                    </button>
                  );
                })}
              </div>

              <div className="p-3 bg-white border-t border-gray-200 text-[11px] text-gray-400 text-center font-medium">
                Click any section above to review its rules & workflow.
              </div>
            </div>

            {/* Right Pane: Selected Tutorial Details */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-0">
              
              {/* Header */}
              <div className="p-5 md:px-7 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-indigo-50/30 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#4f46e5] flex items-center justify-center shrink-0 border border-indigo-100">
                    {getIcon(activeGuide.id)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base md:text-lg font-black text-gray-900 truncate">
                        {activeGuide.title}
                      </h2>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 uppercase">
                        {activeGuide.roleBadge}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium line-clamp-1">
                      {activeGuide.overview}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0 ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Guide Content */}
              <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6">
                
                                {/* Interactive Game Tour Launcher */}
                {pathname === "/dashboard" && (
                  <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-xl p-4 text-slate-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md shadow-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0">
                        <Gamepad2 className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-slate-950 flex items-center gap-1.5">
                          Launch Interactive Game Tour
                        </h4>
                        <p className="text-xs text-slate-900/90 font-medium">
                          Dims the screen and shows glowing animated arrows pointing directly at what to click next!
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        const tourBtn = document.querySelector("#tour-interactive-btn") as HTMLElement;
                        if (tourBtn) tourBtn.click();
                      }}
                      className="bg-slate-950 hover:bg-slate-900 text-white font-black text-xs px-4 py-2.5 rounded-xl shrink-0 transition-transform hover:scale-105 flex items-center gap-1.5"
                    >
                      <Gamepad2 className="w-4 h-4 text-amber-400" />
                      Start Arrow Tour ➔
                    </button>
                  </div>
                )}

                {/* Overview Banner */}
                <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-100 rounded-xl p-4 text-xs text-indigo-950 font-medium leading-relaxed">
                  <span className="font-bold text-[#4f46e5]">What this section is for:</span> {activeGuide.overview}
                </div>

                {/* Steps Section */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-4 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#4f46e5]" />
                    Step-by-Step Procedure
                  </h4>

                  <div className="space-y-4">
                    {activeGuide.steps.map((step, idx) => (
                      <div key={idx} className="bg-gray-50 border border-gray-200/80 rounded-xl p-4 transition-all hover:bg-white hover:shadow-xs">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="text-sm font-bold text-gray-900">{step.title}</h5>
                            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{step.description}</p>
                            
                            {step.proTip && (
                              <div className="mt-2.5 bg-amber-50 border border-amber-200/60 rounded-lg p-2 text-[11px] text-amber-900 font-medium flex items-start gap-1.5">
                                <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <div><strong className="font-bold text-amber-800">Pro-Tip:</strong> {step.proTip}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Escalation & Policy Rules if present */}
                {activeGuide.keyRules && activeGuide.keyRules.length > 0 && (
                  <div className="bg-red-50/70 border border-red-200/80 rounded-xl p-4">
                    <h4 className="text-xs font-black uppercase tracking-wider text-red-700 mb-2.5 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                      Critical Rules & Escalations to Avoid
                    </h4>
                    <ul className="space-y-1.5">
                      {activeGuide.keyRules.map((rule, idx) => (
                        <li key={idx} className="text-xs text-red-900 font-medium flex items-start gap-2">
                          <span className="text-red-500 font-bold">•</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="p-4 px-7 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 shrink-0">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Stelar CRM Employee Standard Operating Procedures (SOP)</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-4 py-1.5 rounded-lg text-xs transition-colors"
                >
                  Got It
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
