"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Users, PhoneCall, Briefcase, MapPin } from "lucide-react";

export default function MobileBottomNav({ isAdmin, userRole }: { isAdmin: boolean; userRole?: string }) {
  const pathname = usePathname();
  const isVisitor = userRole === "SITE_VISITOR";

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: BarChart2 },
    ...(!isVisitor ? [{ label: "Leads", href: "/leads", icon: Users }] : []),
    ...(isVisitor 
      ? [{ label: "Site Visits", href: "/site-visits", icon: MapPin }]
      : (!isAdmin ? [{ label: "Calls", href: "/calls", icon: PhoneCall }] : [])
    ),
    ...(isAdmin ? [
      { label: "Team", href: "/team", icon: Briefcase },
    ] : []),
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around h-[calc(3.5rem+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] z-50 shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center p-1.5 transition-colors ${
              isActive ? "text-[#4f46e5] font-bold" : "text-gray-500 hover:text-[#4f46e5]"
            }`}
          >
            <Icon className={`w-5 h-5 mb-0.5 ${isActive ? "text-[#4f46e5]" : "text-gray-500"}`} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
