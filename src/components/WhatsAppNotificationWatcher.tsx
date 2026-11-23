"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  MessageCircle,
  X,
  Phone,
  ArrowRight,
  CheckCheck,
  Volume2,
  Bell
} from "lucide-react";
import WhatsAppSoundEngine from "@/lib/whatsAppSound";

export interface WhatsAppNotificationItem {
  id: string;
  leadId: string;
  senderName: string;
  senderPhone?: string;
  message: string;
  createdAt: string;
}

export default function WhatsAppNotificationWatcher() {
  const router = useRouter();
  const pathname = usePathname();

  const [toasts, setToasts] = useState<WhatsAppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const notifiedIdsRef = useRef<Set<string>>(new Set());
  const lastCheckedRef = useRef<string>(new Date(Date.now() - 5000).toISOString());
  const isPollingRef = useRef<boolean>(false);

  // Present notification (sound + desktop + visual toast + tab flash)
  const triggerNotification = useCallback(
    (item: WhatsAppNotificationItem) => {
      // 1. WhatsApp synthesized audio chime
      WhatsAppSoundEngine.playChime();

      // 2. Browser Desktop Push Notification
      WhatsAppSoundEngine.triggerDesktopNotification({
        senderName: item.senderName,
        senderPhone: item.senderPhone,
        message: item.message,
        leadId: item.leadId,
        onClick: () => {
          router.push(`/whatsapp?leadId=${item.leadId}`);
        }
      });

      // 3. Tab Title Flashing
      WhatsAppSoundEngine.flashTabTitle(item.senderName, item.message);

      // 4. In-App Floating Toast
      setToasts((prev) => {
        // Prevent duplicate toasts
        if (prev.some((t) => t.id === item.id)) return prev;
        return [item, ...prev].slice(0, 3); // Keep up to 3 stacked toasts
      });
    },
    [router]
  );

  // Dismiss a toast
  const dismissToast = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Mark as read and open chat
  const handleOpenChat = useCallback(
    async (item: WhatsAppNotificationItem, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      dismissToast(item.id);

      // Mark messages for this lead as read
      try {
        await fetch("/api/whatsapp/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mark_read", leadId: item.leadId })
        });
        window.dispatchEvent(
          new CustomEvent("crm_whatsapp_unread_changed", {
            detail: { count: Math.max(0, unreadCount - 1) }
          })
        );
      } catch (err) {
        console.error("Failed to mark chat read:", err);
      }

      // If already on WhatsApp page, dispatch custom switch event, else route there
      if (pathname === "/whatsapp") {
        window.dispatchEvent(
          new CustomEvent("crm_whatsapp_select_lead", {
            detail: { leadId: item.leadId }
          })
        );
      } else {
        router.push(`/whatsapp?leadId=${item.leadId}`);
      }
    },
    [dismissToast, unreadCount, pathname, router]
  );

  // Auto-dismiss individual toast after 8 seconds
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(0, prev.length - 1));
    }, 8000);

    return () => clearTimeout(timer);
  }, [toasts]);

  // Polling for incoming messages
  useEffect(() => {
    let isMounted = true;

    // Check for new inbound messages
    const checkNewMessages = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        const url = `/api/whatsapp/notifications?since=${encodeURIComponent(
          lastCheckedRef.current
        )}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || !isMounted) return;

        const data = await res.json();
        if (data.success) {
          lastCheckedRef.current = data.serverTime || new Date().toISOString();

          // Sync unread count
          if (typeof data.unreadCount === "number") {
            setUnreadCount(data.unreadCount);
            window.dispatchEvent(
              new CustomEvent("crm_whatsapp_unread_changed", {
                detail: { count: data.unreadCount }
              })
            );
          }

          // Trigger notifications for new unseen messages
          const incoming = data.messages || [];
          for (const msg of incoming) {
            if (!notifiedIdsRef.current.has(msg.id)) {
              notifiedIdsRef.current.add(msg.id);
              triggerNotification(msg);
            }
          }
        }
      } catch {
        // Ignore network glitches
      } finally {
        isPollingRef.current = false;
      }
    };

    // First check after 1.5s
    const initialTimer = setTimeout(checkNewMessages, 1500);

    // Fast 4.5s polling loop
    const interval = setInterval(checkNewMessages, 4500);

    // Check on window focus
    const handleFocus = () => {
      checkNewMessages();
    };
    window.addEventListener("focus", handleFocus);

    // Local event listener (e.g. from simulate message or test button)
    const handleLocalIncoming = (e: any) => {
      const detail = e.detail;
      if (detail && detail.id) {
        if (!notifiedIdsRef.current.has(detail.id)) {
          notifiedIdsRef.current.add(detail.id);
          triggerNotification({
            id: detail.id,
            leadId: detail.leadId,
            senderName: detail.senderName || "WhatsApp Contact",
            senderPhone: detail.senderPhone || "",
            message: detail.message || "New message received",
            createdAt: detail.createdAt || new Date().toISOString()
          });
        }
      }
    };
    window.addEventListener("crm_whatsapp_incoming", handleLocalIncoming);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("crm_whatsapp_incoming", handleLocalIncoming);
    };
  }, [triggerNotification]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[999999] flex flex-col space-y-3 max-w-sm sm:max-w-md w-full px-3 sm:px-0 pointer-events-none select-none transition-all duration-300"
      role="region"
      aria-label="WhatsApp Notifications"
    >
      {toasts.map((toast) => {
        const initials = toast.senderName
          ? toast.senderName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
          : "WA";

        const previewSnippet =
          toast.message.length > 120
            ? `${toast.message.slice(0, 117)}...`
            : toast.message;

        return (
          <div
            key={toast.id}
            onClick={(e) => handleOpenChat(toast, e)}
            className="pointer-events-auto cursor-pointer bg-white/95 backdrop-blur-md rounded-2xl border-2 border-emerald-500/40 shadow-2xl shadow-emerald-950/20 p-4 transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow-emerald-900/30 group animate-in slide-in-from-top-4 duration-300 ring-1 ring-emerald-500/10"
          >
            {/* Top Bar: Brand Badge & Close Button */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <div className="flex items-center space-x-1.5 text-emerald-700 font-bold text-xs">
                  <div className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                    <MessageCircle className="w-2.5 h-2.5" />
                  </div>
                  <span>WhatsApp Message</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-gray-400 font-medium">
                  Just now
                </span>
                <button
                  type="button"
                  onClick={(e) => dismissToast(toast.id, e)}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                  title="Dismiss notification"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sender Identity & Message Bubble */}
            <div className="flex items-start space-x-3">
              {/* Contact Avatar with Online Indicator */}
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {initials}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>

              {/* Message Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between mb-0.5">
                  <h4 className="text-sm font-bold text-gray-900 truncate">
                    {toast.senderName}
                  </h4>
                  {toast.senderPhone && (
                    <span className="text-[11px] text-gray-500 font-mono flex items-center space-x-1 shrink-0 ml-2">
                      <Phone className="w-2.5 h-2.5 text-emerald-600 inline" />
                      <span>{toast.senderPhone}</span>
                    </span>
                  )}
                </div>

                {/* WhatsApp Chat Snippet */}
                <div className="bg-emerald-50/70 border border-emerald-100/80 rounded-xl px-3 py-2 mt-1 text-xs text-gray-800 leading-relaxed font-sans shadow-2xs">
                  <p className="line-clamp-2 break-words">
                    {previewSnippet}
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center justify-between mt-2.5 pt-1">
                  <span className="text-[11px] text-emerald-700 font-medium flex items-center space-x-1 group-hover:underline">
                    <span>Click to reply in WhatsApp</span>
                    <ArrowRight className="w-3 h-3 inline transition-transform group-hover:translate-x-1" />
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handleOpenChat(toast, e)}
                    className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center space-x-1"
                  >
                    <MessageCircle className="w-3 h-3" />
                    <span>Open Chat</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
