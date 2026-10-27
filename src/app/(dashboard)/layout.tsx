import Link from "next/link";
import nextDynamic from "next/dynamic";
import OrganizationDropdown from "@/components/OrganizationDropdown";
import { 
  BarChart2, Search, UserPlus, PhoneCall, MapPin, AtSign, Filter, 
  Tag, TrendingUp, Bot, Link as LinkIcon, LayoutGrid, Users, Briefcase, BarChart3,
  Settings, Clock, Bell, ChevronDown, Headset, Plus, Sparkles, Code2, Calendar, Cloud, Download
, Activity, Radio} from "lucide-react";

import { getCurrentUser } from "@/app/actions/authActions";
import UserDropdown from "@/components/UserDropdown";
import NotificationBell from "@/components/NotificationBell";
import AdminSoundToggle from "@/components/AdminSoundToggle";
import GlobalSoundWatcher from "@/components/GlobalSoundWatcher";
import Sidebar from "@/components/Sidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import AddLeadButton from "@/components/AddLeadButton";
import prisma from "@/lib/prisma";

import { redirect } from "next/navigation";

// Client-only components that use browser APIs, sound, timers, or Capacitor native plugins
const PushNotificationInitializer = nextDynamic(() => import("@/components/PushNotificationInitializer"), { ssr: false });
const PendingLeadWatcher = nextDynamic(() => import("@/components/PendingLeadWatcher"), { ssr: false });
const FollowUpWatcher = nextDynamic(() => import("@/components/FollowUpWatcher"), { ssr: false });
const ActionRequiredWatcher = nextDynamic(() => import("@/components/ActionRequiredWatcher"), { ssr: false });
const DailySiteVisitsModal = nextDynamic(() => import("@/components/DailySiteVisitsModal"), { ssr: false });
const SmartCallManager = nextDynamic(() => import("@/components/SmartCallManager"), { ssr: false });
const AutoCallLogWatcher = nextDynamic(() => import("@/components/AutoCallLogWatcher"), { ssr: false });
const GlobalCommandPalette = nextDynamic(() => import("@/components/GlobalCommandPalette"), { ssr: false });

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  
  const isAdmin = user.role === "ADMIN" || user.role === "ROOT";
  
  // Fetch pending tasks for the user
  let upcomingTasks: any[] = [];
  let globalSoundMuted = false;
  if (user) {
    try {
      const org = user?.organizationId ? await prisma.organization.findUnique({
        where: { id: user.organizationId },
        select: { customFieldLabels: true }
      }) : null;
      globalSoundMuted = Boolean((org?.customFieldLabels as any)?.globalSoundMuted);
    } catch (e) {
      // default false
    }

    try {
      upcomingTasks = await prisma.task.findMany({
        where: { 
          ...(isAdmin ? (user.role === 'ROOT' ? {} : { lead: { organizationId: user.organizationId } }) : { OR: [{ userId: user.id }, { lead: { assignedToId: user.id } }] }),
          isCompleted: false,
          lead: {
            status: { notIn: ["Site visit done", "Junk", "Lost", "Won"] },
            scoreSiteVisit: { not: "Done" }
          }
        },
        include: { 
          lead: { 
            select: { 
              name: true, 
              status: true, 
              scoreSiteVisit: true 
            } 
          } 
        },
        orderBy: { id: "desc" },
        take: 50
      });
    } catch (e) {
      console.warn("Failed to fetch upcoming tasks:", e);
    }
  }

  return (
    <>
      <PushNotificationInitializer userId={user?.id} />
      {user?.role === 'TELECALLER' && <PendingLeadWatcher userId={user?.id} />}
      {user?.role === 'TELECALLER' && <FollowUpWatcher />}
      {user?.role === 'TELECALLER' && <ActionRequiredWatcher />}
      <DailySiteVisitsModal tasks={upcomingTasks} />
      <SmartCallManager currentUserId={user?.id} />
      <AutoCallLogWatcher userId={user?.id} />
      <GlobalCommandPalette isAdmin={isAdmin} userRole={user?.role} />
      <GlobalSoundWatcher initialMuted={globalSoundMuted} />
      <div className="flex h-screen bg-[#f8fafc] text-[#333333] font-sans flex-col md:flex-row overflow-hidden">

      {/* Modern Collapsible Desktop Sidebar */}
      <Sidebar isAdmin={isAdmin} userRole={user?.role} orgName={user?.organization?.name || "Stelar CRM"} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 z-[100] relative shadow-xs shrink-0 pt-[env(safe-area-inset-top,0px)]">
          <div className="h-14 sm:h-16 flex items-center justify-between px-3 md:px-6">
            <div className="flex items-center space-x-2 sm:space-x-2.5 overflow-hidden min-w-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-white border border-gray-100 shadow-2xs">
                <img src="/logo.png" alt="Stelar Interiors" width={32} height={32} style={{ width: 32, height: 32 }} className="w-full h-full object-contain p-0.5" />
              </div>
              <span className="font-semibold text-sm md:text-[15px] truncate max-w-[120px] xs:max-w-[150px] sm:max-w-xs md:max-w-none text-gray-900 tracking-tight">
                {user?.organization?.name || "Stelar CRM"}
              </span>
            </div>
            
            <div className="flex items-center space-x-1.5 sm:space-x-3 md:space-x-4 shrink-0">
              <AdminSoundToggle isAdmin={isAdmin} initialMuted={globalSoundMuted} />
              <NotificationBell tasks={upcomingTasks} />
              <AddLeadButton isAdmin={isAdmin} />
              <UserDropdown 
                initials={user?.name?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "SI"}  
                name={user?.name || "Unknown"} 
                email={user?.email || ""} 
                isAdmin={isAdmin}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[#f8fafc] p-3 md:p-6 mb-14 md:mb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav isAdmin={isAdmin} userRole={user?.role} />
    </div>
    </>
  );
}

export const dynamic = 'force-dynamic';

