"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Users, LayoutDashboard, PhoneCall, MapPin, 
  Briefcase, BarChart3, Settings, 
  Menu, X, BarChart2, Download, Calendar, 
  LogOut, Shield, ChevronRight, RefreshCw
} from "lucide-react";
import { logout } from "@/app/actions/authActions";
import ManageLeavesModal from "./ManageLeavesModal";

interface MobileBottomNavProps {
  isAdmin: boolean;
  userRole?: string;
  orgName?: string;
  userName?: string;
  userEmail?: string;
}

export default function MobileBottomNav({ 
  isAdmin, 
  userRole = "", 
  orgName = "Stelar CRM",
  userName = "Admin",
  userEmail = ""
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showLeavesModal, setShowLeavesModal] = useState(false);
  const isVisitor = userRole === "SITE_VISITOR";

  // Listen to open events from the top header hamburger button
  useEffect(() => {
    const handleOpen = () => setDrawerOpen(true);
    window.addEventListener("crm_open_mobile_menu", handleOpen);
    return () => window.removeEventListener("crm_open_mobile_menu", handleOpen);
  }, []);

  // Close drawer whenever pathname changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      localStorage.removeItem("stelar_active_session_email");
    } catch (e) {}
    await logout();
    window.location.href = "/login";
  };

  // Bottom bar destinations
  const bottomItems = isAdmin
    ? [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Leads", href: "/leads", icon: Users },
        { label: "Site Visits", href: "/site-visits", icon: MapPin },
        { label: "Team", href: "/team", icon: Briefcase },
      ]
    : isVisitor
    ? [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Site Visits", href: "/site-visits", icon: MapPin },
      ]
    : [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Leads", href: "/leads", icon: Users },
        { label: "Calls", href: "/calls", icon: PhoneCall },
      ];

  const initials = userName
    ? userName.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()
    : "SI";

  return (
    <>
      {/* 1. Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] z-40 shadow-lg select-none">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center p-1.5 transition-colors ${
                isActive ? "text-[#4f46e5] font-bold" : "text-gray-500 hover:text-[#4f46e5]"
              }`}
            >
              <Icon 
                className={`w-5 h-5 mb-0.5 ${isActive ? "text-[#4f46e5]" : "text-gray-500"}`} 
                strokeWidth={isActive ? 2.5 : 1.8} 
              />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* Menu / More Trigger */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center p-1.5 transition-colors cursor-pointer ${
            drawerOpen ? "text-[#4f46e5] font-bold" : "text-gray-500 hover:text-[#4f46e5]"
          }`}
          aria-label="More navigation options"
        >
          <Menu className={`w-5 h-5 mb-0.5 ${drawerOpen ? "text-[#4f46e5]" : "text-gray-500"}`} strokeWidth={drawerOpen ? 2.5 : 1.8} />
          <span className="text-[10px] tracking-tight">Menu</span>
        </button>
      </nav>

      {/* 2. Slide-out Mobile Navigation Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-[250] flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-white border border-gray-200 shadow-2xs">
                  <img src="/logo.png" alt="Logo" width={32} height={32} className="w-full h-full object-contain p-0.5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-gray-900 truncate leading-tight">{orgName}</div>
                  <div className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">Navigation Menu</div>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Pill */}
            <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-purple-100 text-[#4f46e5] flex items-center justify-center font-bold text-xs shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-gray-900 truncate">{userName}</div>
                <div className="text-[11px] text-gray-500 truncate">{userEmail}</div>
              </div>
              {isAdmin && (
                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 shrink-0">
                  Admin
                </span>
              )}
            </div>

            {/* Navigation Sections */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Workspace */}
              <div>
                <div className="px-2.5 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  Workspace
                </div>
                <div className="space-y-0.5">
                  <Link
                    href="/dashboard"
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      pathname === "/dashboard" ? "bg-indigo-50 text-[#4f46e5] font-bold" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex items-center space-x-2.5">
                      <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                      <span>Daily Workdesk</span>
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                  </Link>

                  {!isVisitor && (
                    <Link
                      href="/leads"
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        pathname.startsWith("/leads") ? "bg-indigo-50 text-[#4f46e5] font-bold" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center space-x-2.5">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span>Leads Pipeline</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </Link>
                  )}

                  {(isAdmin || isVisitor) && (
                    <Link
                      href="/site-visits"
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        pathname.startsWith("/site-visits") ? "bg-indigo-50 text-[#4f46e5] font-bold" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center space-x-2.5">
                        <MapPin className="w-4 h-4 text-orange-500" />
                        <span>Site Visits</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </Link>
                  )}

                  {!isAdmin && !isVisitor && (
                    <Link
                      href="/calls"
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        pathname.startsWith("/calls") ? "bg-indigo-50 text-[#4f46e5] font-bold" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center space-x-2.5">
                        <PhoneCall className="w-4 h-4 text-emerald-500" />
                        <span>Calls Log</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </Link>
                  )}
                </div>

                {/* 1-Tap Phone Call Log & Recording Sync */}
                <div className="pt-2 px-1">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false);
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent("crm_manual_sync_calls"));
                      }
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-200/70 text-indigo-950 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
                  >
                    <span className="flex items-center space-x-2 text-xs font-bold">
                      <RefreshCw className="w-4 h-4 text-indigo-600" />
                      <span>Sync Calls & Audio from Phone</span>
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                      48h Backfill
                    </span>
                  </button>
                </div>
              </div>

              {/* Operations (Admin Only) */}
              {isAdmin && (
                <div>
                  <div className="px-2.5 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    Operations
                  </div>
                  <div className="space-y-0.5">
                    <Link
                      href="/team"
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        pathname.startsWith("/team") ? "bg-indigo-50 text-[#4f46e5] font-bold" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center space-x-2.5">
                        <Briefcase className="w-4 h-4 text-purple-500" />
                        <span>Team Management</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </Link>

                    <Link
                      href="/analytics"
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        pathname.startsWith("/analytics") ? "bg-indigo-50 text-[#4f46e5] font-bold" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center space-x-2.5">
                        <BarChart3 className="w-4 h-4 text-emerald-600" />
                        <span>Analytics & Performance</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </Link>

                    <Link
                      href="/audit"
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        pathname.startsWith("/audit") ? "bg-indigo-50 text-[#4f46e5] font-bold" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center space-x-2.5">
                        <BarChart2 className="w-4 h-4 text-indigo-600" />
                        <span>Executive Audit & Reports</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </Link>

                    <Link
                      href="/reports/download"
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        pathname.startsWith("/reports/download") ? "bg-indigo-50 text-[#4f46e5] font-bold" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center space-x-2.5">
                        <Download className="w-4 h-4 text-teal-600" />
                        <span>Download Export Reports</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Configuration (Admin Only) */}
              {isAdmin && (
                <div>
                  <div className="px-2.5 pb-1 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    Configuration
                  </div>
                  <div className="space-y-0.5">
                    <Link
                      href="/settings"
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                        pathname.startsWith("/settings") ? "bg-indigo-50 text-[#4f46e5] font-bold" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center space-x-2.5">
                        <Settings className="w-4 h-4 text-gray-600" />
                        <span>Organization Settings</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => { setDrawerOpen(false); setShowLeavesModal(true); }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                    >
                      <span className="flex items-center space-x-2.5">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <span>Manage Team Leaves</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeavesModal && <ManageLeavesModal onClose={() => setShowLeavesModal(false)} />}
    </>
  );
}
