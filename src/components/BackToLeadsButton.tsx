"use client";

import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function BackToLeadsButton({ label = "Back to Leads" }: { label?: string }) {
  const router = useRouter();
  const [targetHref, setTargetHref] = useState("/leads");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("crm_leads_filter_url");
      if (saved && saved.startsWith("/leads")) {
        setTargetHref(saved);
      }
    } catch (e) {
      // Ignore sessionStorage errors
    }
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      // If the user came from a /leads page in this browser session, router.back()
      // restores the exact filtered page, active search, and table scroll position.
      if (
        typeof window !== "undefined" &&
        window.history.length > 1 &&
        document.referrer &&
        document.referrer.includes("/leads")
      ) {
        router.back();
        return;
      }

      // If page was reloaded or referrer is missing, use the saved filter URL from sessionStorage
      const saved = sessionStorage.getItem("crm_leads_filter_url");
      if (saved && saved.startsWith("/leads")) {
        router.push(saved);
        return;
      }
    } catch (e) {
      // Ignore navigation errors
    }

    router.push(targetHref || "/leads");
  };

  return (
    <a
      href={targetHref}
      onClick={handleClick}
      className="flex items-center text-[13px] font-medium text-gray-500 hover:text-[#4f46e5] mr-2 sm:mr-3 shrink-0 transition-colors cursor-pointer group select-none"
      title="Back to filtered leads list"
    >
      <ArrowLeft className="w-4 h-4 mr-1 sm:mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
      <span>{label === "Back to Leads" ? <><span className="hidden sm:inline">Back to </span>Leads</> : label}</span>
    </a>
  );
}
