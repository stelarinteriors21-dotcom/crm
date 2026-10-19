"use client";

import { useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";

export default function LeadsFilterTracker() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && pathname.startsWith("/leads")) {
        const qs = searchParams.toString();
        const fullUrl = qs ? `${pathname}?${qs}` : pathname;
        sessionStorage.setItem("crm_leads_filter_url", fullUrl);
      }
    } catch (e) {
      // Ignore sessionStorage errors
    }
  }, [searchParams, pathname]);

  return null;
}
