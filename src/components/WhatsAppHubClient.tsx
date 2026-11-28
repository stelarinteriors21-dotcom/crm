"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Search,
  Send,
  Paperclip,
  CheckCheck,
  Phone,
  ExternalLink,
  Settings,
  Plus,
  FileText,
  Image as ImageIcon,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  Download,
  Calendar,
  Eye,
  KeyRound,
  Filter,
  CheckCircle2,
  Share2,
  Clock,
  ChevronDown,
  Bell,
  Volume2
} from "lucide-react";
import WhatsAppSoundEngine from "@/lib/whatsAppSound";
import {
  WhatsAppApiConfig,
  saveWhatsAppApiConfig,
  testWhatsAppApiConnection,
  sendWhatsAppMessageAction,
  uploadWhatsAppMediaAction,
  simulateIncomingWhatsAppAction,
  getWhatsAppConversationsAction
} from "@/app/actions/whatsAppActions";
import { compressImage, formatBytes } from "@/lib/imageCompressor";
import { formatDeterministicDateTime } from "@/lib/dateUtils";

interface WhatsAppMessage {
  id: string;
  leadId: string;
  direction: string; // "INBOUND" or "OUTBOUND"
  message: string;
  status: string;
  createdAt: Date | string;
}

interface ConversationItem {
  leadId: string;
  name: string;
  phone: string | null;
  status?: string;
  scoreSiteVisit?: string;
  siteVisitOtp?: string | null;
  siteVisitDate?: string | null;
  lastMessage: string;
  lastMessageTime: Date | string;
  lastMessageDirection?: string | null;
  unreadCount: number;
  messageCount: number;
  messages: WhatsAppMessage[];
}

function sortConversations(items: ConversationItem[]): ConversationItem[] {
  return [...items].sort((a, b) => {
    const aHas = (a.messageCount || a.messages?.length || 0) > 0;
    const bHas = (b.messageCount || b.messages?.length || 0) > 0;

    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;

    const timeA = new Date(a.lastMessageTime || 0).getTime();
    const timeB = new Date(b.lastMessageTime || 0).getTime();
    return timeB - timeA;
  });
}

function formatWhatsAppChatTimestamp(dateStr?: string | Date | null, hasMessages?: boolean): string {
  if (!dateStr || !hasMessages) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) {
    return "Yesterday";
  }

  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7 && diffDays > 0) {
    return d.toLocaleDateString([], { weekday: "short" });
  }

  return d.toLocaleDateString([], { day: "numeric", month: "short" });
}

interface WhatsAppHubClientProps {
  initialConversations: ConversationItem[];
  initialConfig: WhatsAppApiConfig;
  initialLeadId?: string;
  isAdmin?: boolean;
}

export default function WhatsAppHubClient({
  initialConversations = [],
  initialConfig,
  initialLeadId,
  isAdmin = false
}: WhatsAppHubClientProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>(() =>
    sortConversations(initialConversations)
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string>(() => {
    if (initialLeadId) return initialLeadId;
    const sorted = sortConversations(initialConversations);
    return sorted[0]?.leadId || "";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "UNREAD" | "SITE_VISITS" | "QUOTATIONS">("ALL");

  // Message composer state
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [templatesMenuOpen, setTemplatesMenuOpen] = useState(false);

  // Settings & Test Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState<WhatsAppApiConfig>(initialConfig);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // Simulate Inbound Modal
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simText, setSimText] = useState("Hi, I checked the quotation and site measurements. Can we finalize the modular kitchen?");
  const [simType, setSimType] = useState<"text" | "document" | "photo">("text");

  // New Chat Modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");

  // Photo Lightbox modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize composer textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [draft]);

  // Find active conversation
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.leadId === selectedLeadId) || conversations[0] || null;
  }, [conversations, selectedLeadId]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    const list = conversations.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        c.lastMessage.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (activeFilter === "UNREAD") return c.unreadCount > 0;
      if (activeFilter === "SITE_VISITS") {
        return (
          (c.status || "").toLowerCase().includes("visit") ||
          (c.scoreSiteVisit || "").toLowerCase() === "done" ||
          Boolean(c.siteVisitOtp)
        );
      }
      if (activeFilter === "QUOTATIONS") {
        return (c.status || "").toLowerCase().includes("quotation");
      }

      return true;
    });

    return sortConversations(list);
  }, [conversations, searchQuery, activeFilter]);

  // Scroll to bottom when active conversation or messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  // Refresh conversations periodically
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      try {
        const updated = await getWhatsAppConversationsAction();
        if (updated && updated.length > 0) {
          setConversations(updated);
        }
      } catch (e) {
        console.error("Auto-sync error:", e);
      }
    }, 6000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Auto-scroll selected lead in the left sidebar
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedLeadId]);

  // Listen to select lead events & check URL params
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlLeadId = params.get("leadId") || initialLeadId;
      if (urlLeadId) {
        setSelectedLeadId(urlLeadId);
      }

      const handleSelectLead = (e: any) => {
        if (e.detail?.leadId) {
          setSelectedLeadId(e.detail.leadId);
        }
      };
      window.addEventListener("crm_whatsapp_select_lead", handleSelectLead);
      return () => window.removeEventListener("crm_whatsapp_select_lead", handleSelectLead);
    }
  }, [initialLeadId]);

  // When active conversation changes, mark as read
  useEffect(() => {
    if (!selectedLeadId) return;

    fetch("/api/whatsapp/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", leadId: selectedLeadId })
    }).catch(() => {});

    setConversations((prev) =>
      prev.map((c) => (c.leadId === selectedLeadId ? { ...c, unreadCount: 0 } : c))
    );
  }, [selectedLeadId]);

  // Handle sending text or draft
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || draft).trim();
    if (!text || !activeConversation) return;

    setSending(true);
    const tempId = "temp-" + Date.now();
    const optimisticMsg: WhatsAppMessage = {
      id: tempId,
      leadId: activeConversation.leadId,
      direction: "OUTBOUND",
      message: text,
      status: "SENT",
      createdAt: new Date().toISOString()
    };

    // Optimistically update conversation
    setConversations((prev) => {
      const updated = prev.map((c) => {
        if (c.leadId === activeConversation.leadId) {
          return {
            ...c,
            lastMessage: text,
            lastMessageTime: new Date().toISOString(),
            lastMessageDirection: "OUTBOUND",
            messageCount: (c.messageCount || 0) + 1,
            messages: [...c.messages, optimisticMsg]
          };
        }
        return c;
      });
      return sortConversations(updated);
    });

    setDraft("");
    setTemplatesMenuOpen(false);

    try {
      const res = await sendWhatsAppMessageAction({
        leadId: activeConversation.leadId,
        phone: activeConversation.phone || "",
        message: text
      });

      if (res.success && res.log) {
        setConversations((prev) =>
          prev.map((c) => {
            if (c.leadId === activeConversation.leadId) {
              return {
                ...c,
                messages: c.messages.map((m) => (m.id === tempId ? res.log : m))
              };
            }
            return c;
          })
        );
      }
    } catch (e) {
      console.error("Error sending message:", e);
    } finally {
      setSending(false);
    }
  };

  // Handle document file upload & send
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    setSending(true);
    setAttachmentMenuOpen(false);

    try {
      const filename = file.name;
      const sizeStr = formatBytes(file.size);

      // 1. Upload directly to Meta WhatsApp Cloud API
      const formData = new FormData();
      formData.append("file", file, filename);

      const uploadRes = await uploadWhatsAppMediaAction(formData);
      if (!uploadRes.success || !uploadRes.mediaId) {
        alert(uploadRes.error || "Failed to upload document to WhatsApp.");
        return;
      }

      // 2. Dispatch document message via Cloud API using media ID
      const res = await sendWhatsAppMessageAction({
        leadId: activeConversation.leadId,
        phone: activeConversation.phone || "",
        message: `Attached: ${filename} (${sizeStr})`,
        mediaId: uploadRes.mediaId,
        mediaUrl: uploadRes.url,
        mediaType: "document",
        filename
      });

      if (res.success && res.log) {
        setConversations((prev) => {
          const updated = prev.map((c) => {
            if (c.leadId === activeConversation.leadId) {
              return {
                ...c,
                lastMessage: `📄 Document: ${filename}`,
                lastMessageTime: new Date().toISOString(),
                lastMessageDirection: "OUTBOUND",
                messageCount: (c.messageCount || 0) + 1,
                messages: [...c.messages, res.log]
              };
            }
            return c;
          });
          return sortConversations(updated);
        });
      }
    } catch (err: any) {
      console.error("Failed to upload document:", err);
      alert("Failed to send document: " + (err.message || "Unknown error"));
    } finally {
      setSending(false);
      e.target.value = "";
    }
  };

  // Handle photo upload with auto-compressor
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    setCompressing(true);
    setAttachmentMenuOpen(false);

    try {
      const filename = file.name;

      // 1. Upload photo directly to Meta WhatsApp Cloud API
      const formData = new FormData();
      formData.append("file", file, filename);

      const uploadRes = await uploadWhatsAppMediaAction(formData);
      if (!uploadRes.success || !uploadRes.mediaId) {
        alert(uploadRes.error || "Failed to upload photo to WhatsApp.");
        return;
      }

      // 2. Dispatch photo message via Cloud API using media ID
      const res = await sendWhatsAppMessageAction({
        leadId: activeConversation.leadId,
        phone: activeConversation.phone || "",
        message: `Photo: ${filename}`,
        mediaId: uploadRes.mediaId,
        mediaUrl: uploadRes.url,
        mediaType: "image",
        filename
      });

      if (res.success && res.log) {
        setConversations((prev) => {
          const updated = prev.map((c) => {
            if (c.leadId === activeConversation.leadId) {
              return {
                ...c,
                lastMessage: `📷 Photo: ${filename}`,
                lastMessageTime: new Date().toISOString(),
                lastMessageDirection: "OUTBOUND",
                messageCount: (c.messageCount || 0) + 1,
                messages: [...c.messages, res.log]
              };
            }
            return c;
          });
          return sortConversations(updated);
        });
      }
    } catch (err: any) {
      console.error("Failed to upload photo:", err);
      alert("Failed to send photo: " + (err.message || "Unknown error"));
    } finally {
      setCompressing(false);
      e.target.value = "";
    }
  };

  // Quick templates
  const applyTemplate = (type: string) => {
    if (!activeConversation) return;
    const name = activeConversation.name;
    const otp = activeConversation.siteVisitOtp;

    if (type === "welcome") {
      setDraft(`Hello ${name},\n\nThank you for choosing Stelar Interiors! We are excited to collaborate with you to create your dream space.\n\nCould you let us know what time works best for an introductory consultation?`);
    } else if (type === "otp") {
      if (otp) {
        setDraft(`Hi ${name},\n\nYour 6-digit site visit verification OTP for Stelar Interiors is: *${otp}*.\n\nPlease share this with our executive upon arrival at your site.`);
      } else {
        setDraft(`Hi ${name},\n\nOur field executive is preparing for your upcoming site visit. Please share any specific measurements, floor plans, or references in advance.`);
      }
    } else if (type === "quote") {
      setDraft(`Dear ${name},\n\nYour customized interior design proposal and estimate is ready for review! 📄\n\nPlease let us know when we can present the 3D layout and material specifications.`);
    } else if (type === "followup") {
      setDraft(`Hello ${name},\n\nJust checking in regarding your interior project inquiry. If you have any questions about the plan or quotation, we would be delighted to assist.`);
    }
    setTemplatesMenuOpen(false);
  };

  // Test WhatsApp API Credentials
  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await testWhatsAppApiConnection(config.phoneNumberId, config.accessToken);
      setTestResult(res);
      if (res.success) {
        setConfig((prev) => ({
          ...prev,
          isConnected: true,
          businessPhoneNumber: res.verifiedName || prev.businessPhoneNumber
        }));
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || "Failed to test connection" });
    } finally {
      setTestingConnection(false);
    }
  };

  // Save WhatsApp API Configuration
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await saveWhatsAppApiConfig(config);
      if (res.success) {
        alert("WhatsApp API Configuration saved successfully!");
        setShowConfigModal(false);
      } else {
        alert(res.error || "Failed to save configuration.");
      }
    } catch (e: any) {
      alert("Error saving config: " + e.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // Simulate Inbound Message
  const handleSimulateInbound = async () => {
    if (!activeConversation) return;
    setSending(true);

    try {
      let mediaUrl: string | undefined = undefined;
      let filename: string | undefined = undefined;

      if (simType === "document") {
        mediaUrl = "/uploads/sample-floor-plan.pdf";
        filename = "Client_Approved_FloorPlan.pdf";
      } else if (simType === "photo") {
        mediaUrl = "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80";
        filename = "Living_Room_Inspiration.jpg";
      }

      const res = await simulateIncomingWhatsAppAction({
        leadId: activeConversation.leadId,
        message: simText,
        mediaUrl,
        mediaType: simType !== "text" ? (simType as any) : undefined,
        filename
      });

      if (res.success && res.log) {
        setConversations((prev) => {
          const updated = prev.map((c) => {
            if (c.leadId === activeConversation.leadId) {
              return {
                ...c,
                lastMessage: res.log.message,
                lastMessageTime: new Date().toISOString(),
                lastMessageDirection: "INBOUND",
                messageCount: (c.messageCount || 0) + 1,
                messages: [...c.messages, res.log]
              };
            }
            return c;
          });
          return sortConversations(updated);
        });

        // Instantly trigger the WhatsApp notification chime and toast
        window.dispatchEvent(
          new CustomEvent("crm_whatsapp_incoming", {
            detail: {
              id: res.log.id,
              leadId: activeConversation.leadId,
              senderName: activeConversation.name,
              senderPhone: activeConversation.phone,
              message: res.log.message,
              createdAt: res.log.createdAt
            }
          })
        );

        setShowSimulateModal(false);
      }
    } catch (e: any) {
      alert("Simulation failed: " + e.message);
    } finally {
      setSending(false);
    }
  };

  // Instant Sound & Notification Test Trigger
  const handleTestNotification = () => {
    WhatsAppSoundEngine.requestPermission();
    WhatsAppSoundEngine.playChime();

    const targetContact = activeConversation || conversations[0] || {
      leadId: "lead-test",
      name: "Rahul Sharma (VIP Client)",
      phone: "+91 98765 43210"
    };

    window.dispatchEvent(
      new CustomEvent("crm_whatsapp_incoming", {
        detail: {
          id: "test-alert-" + Date.now(),
          leadId: targetContact.leadId,
          senderName: targetContact.name,
          senderPhone: targetContact.phone,
          message: "Hi! I just reviewed the interior estimate. Can you confirm the site visit time for tomorrow?",
          createdAt: new Date().toISOString()
        }
      })
    );
  };

  // Launch WhatsApp Web companion window
  const handleLaunchWebCompanion = () => {
    const phoneDigits = (activeConversation?.phone || "").replace(/[^0-9]/g, "");
    const formatted = phoneDigits.length === 10 ? `91${phoneDigits}` : phoneDigits;
    const url = formatted
      ? `https://web.whatsapp.com/send?phone=${formatted}`
      : "https://web.whatsapp.com";

    window.open(url, "WhatsAppCompanion", "width=1150,height=820,menubar=no,status=no,toolbar=no");
  };

  return (
    <div className="w-full h-[calc(100vh-4.25rem)] flex flex-col bg-gray-100 -m-3 md:-m-6 overflow-hidden select-none">
      
      {/* 1. Top Global Navigation Header */}
      <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-tight flex items-center gap-2">
              <span>WhatsApp Business Hub</span>
              {config.isConnected ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Meta Cloud API Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Web / Local Companion Active
                </span>
              )}
            </h1>
            <p className="text-[11px] text-gray-500 hidden sm:block">
              Send quotations, site visit photos, and chat directly with clients
            </p>
          </div>
        </div>

        {/* Action Toolbar (Admin Only) */}
        {isAdmin && (
          <div className="flex items-center space-x-2">
            {/* Test Sound & Inbound Alert */}
            <button
              type="button"
              onClick={handleTestNotification}
              className="flex items-center px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              title="Test WhatsApp audio chime, desktop push, and floating notification"
            >
              <Bell className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              <span>Test Alert</span>
            </button>

            {/* Simulate Client Response (Testing tool) */}
            {activeConversation && (
              <button
                type="button"
                onClick={() => setShowSimulateModal(true)}
                className="hidden lg:flex items-center px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
                title="Simulate incoming client reply or document"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
                Simulate Inbound
              </button>
            )}

            {/* Launch Web Companion */}
            <button
              type="button"
              onClick={handleLaunchWebCompanion}
              className="flex items-center px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              title="Open WhatsApp Web desktop popup"
            >
              <Smartphone className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              <span className="hidden sm:inline">WhatsApp Web</span>
            </button>

            {/* Connect API Settings Button */}
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="flex items-center px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <Settings className="w-3.5 h-3.5 mr-1" />
              <span>Connect API</span>
            </button>
          </div>
        )}
      </header>

      {/* 2. Main Two-Column WhatsApp Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ================= LEFT COLUMN: CONVERSATION LIST ================= */}
        <div className="w-80 md:w-96 bg-white border-r border-gray-200 flex flex-col shrink-0">
          
          {/* Search & New Chat Header */}
          <div className="p-3 border-b border-gray-100 space-y-2.5 bg-gray-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search chats, names, or messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]">
              {(["ALL", "UNREAD", "SITE_VISITS", "QUOTATIONS"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-colors cursor-pointer ${
                    activeFilter === filter
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {filter === "ALL"
                    ? `All (${conversations.length})`
                    : filter === "UNREAD"
                    ? "Unread"
                    : filter === "SITE_VISITS"
                    ? "Site Visits"
                    : "Quotations"}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <div className="text-xs font-bold text-gray-700">No conversations found</div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {searchQuery ? "Try searching another keyword" : "All your CRM leads will show here"}
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.leadId === selectedLeadId;
                const initials = c.name
                  ? c.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                  : "WA";

                return (
                  <div
                    key={c.leadId}
                    ref={isSelected ? selectedItemRef : null}
                    onClick={() => setSelectedLeadId(c.leadId)}
                    className={`p-3 flex items-start space-x-3 transition-colors cursor-pointer relative ${
                      isSelected
                        ? "bg-emerald-50/70 border-l-4 border-emerald-600"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Contact Avatar with Status */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {initials}
                      </div>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0" />
                    </div>

                    {/* Chat Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-xs text-gray-900 truncate">
                          {c.name}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-1" suppressHydrationWarning>
                          {formatWhatsAppChatTimestamp(c.lastMessageTime, (c.messageCount || c.messages?.length || 0) > 0)}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-500 truncate flex items-center gap-1">
                        {c.lastMessageDirection === "OUTBOUND" && (
                          <CheckCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        )}
                        <span className="truncate">
                          {c.lastMessage.startsWith("📷 Photo")
                            ? "📷 Photo"
                            : c.lastMessage.startsWith("📄 Document")
                            ? `📄 ${c.lastMessage.replace("📄 Document:", "").split("|")[0].trim() || "Document"}`
                            : c.lastMessage.startsWith("🎙️ Voice Note")
                            ? "🎙️ Voice Note"
                            : c.lastMessage.split("|")[0].trim()}
                        </span>
                      </div>

                      {/* Lead Status Badge */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {c.status && (
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            c.status.toLowerCase().includes("done")
                              ? "bg-emerald-100 text-emerald-800"
                              : c.status.toLowerCase().includes("quotation")
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-700"
                          }`}>
                            {c.status}
                          </span>
                        )}

                        {c.siteVisitOtp && (
                          <span className="text-[9px] text-indigo-700 font-bold bg-indigo-50 px-1 py-0.2 rounded flex items-center">
                            <KeyRound className="w-2.5 h-2.5 mr-0.5" /> OTP: {c.siteVisitOtp}
                          </span>
                        )}

                        {c.unreadCount > 0 && (
                          <span className="ml-auto w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ================= RIGHT COLUMN: CHAT WINDOW ================= */}
        {activeConversation ? (
          <div className="flex-1 flex flex-col bg-[#efeae2]/40 relative min-w-0">
            
            {/* Active Contact Header */}
            <div className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between shrink-0 shadow-xs z-10">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {activeConversation.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-xs sm:text-sm text-gray-900 truncate">
                      {activeConversation.name}
                    </h2>
                    {activeConversation.status && (
                      <span className="hidden sm:inline-block px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {activeConversation.status}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-2">
                    <span>{activeConversation.phone || "No phone"}</span>
                    {activeConversation.siteVisitOtp && (
                      <span className="text-indigo-600 font-semibold flex items-center">
                        • OTP: {activeConversation.siteVisitOtp}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat Header Actions */}
              <div className="flex items-center space-x-2 shrink-0">
                {activeConversation.phone && (
                  <a
                    href={`tel:${activeConversation.phone}`}
                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    title="Direct Phone Call"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}

                <Link
                  href={`/leads/${activeConversation.leadId}`}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold text-xs flex items-center gap-1 transition-colors"
                  title="Open Lead Profile in CRM"
                >
                  <span className="hidden sm:inline">Lead Profile</span>
                  <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                </Link>
              </div>
            </div>

            {/* Chat Canvas (Messages Scroll) */}
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3"
              style={{
                backgroundImage: "radial-gradient(#0000000a 1px, transparent 1px)",
                backgroundSize: "16px 16px"
              }}
            >
              {/* Date Header Divider */}
              <div className="flex justify-center my-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/80 shadow-2xs text-gray-500 border border-gray-200/50">
                  Conversation History
                </span>
              </div>

              {activeConversation.messages.length === 0 ? (
                <div className="text-center py-12 px-4 max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-xs text-gray-800">No Messages Yet</h3>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Send a quotation, site visit confirmation, or greeting to start chatting.
                  </p>
                </div>
              ) : (
                activeConversation.messages.map((msg) => {
                  const isInbound = msg.direction === "INBOUND";
                  const isDocument = msg.message.startsWith("📄 Document:");
                  const isPhoto = msg.message.startsWith("📷 Photo");

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs relative break-words [overflow-wrap:anywhere] ${
                          isInbound
                            ? "bg-white text-gray-900 border border-gray-200/80 rounded-tl-xs"
                            : "bg-[#d9fdd3] text-gray-900 border border-emerald-200/80 rounded-tr-xs"
                        }`}
                      >
                        {/* Sender Label */}
                        <div className="text-[10px] font-bold mb-1 opacity-60">
                          {isInbound ? `${activeConversation.name} (Client)` : "Stelar Team"}
                        </div>

                        {/* Document Bubble */}
                        {isDocument ? (
                          <div className="p-2.5 bg-white border border-slate-200 rounded-xl my-1 flex items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[9px] uppercase font-bold text-red-600 block">
                                  PDF Document
                                </span>
                                <span className="font-semibold text-xs text-gray-800 truncate block">
                                  {msg.message.replace("📄 Document:", "").split("|")[0].trim()}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const metaIdMatch = msg.message.match(/(?:\[Meta Media ID:\s*|\/api\/whatsapp\/media\/)([0-9]+)/i);
                                let url = "#";
                                if (metaIdMatch) {
                                  url = `/api/whatsapp/media/${metaIdMatch[1]}`;
                                } else {
                                  const parts = msg.message.split("|");
                                  url = parts[1]?.trim() || "#";
                                }
                                window.open(url, "_blank");
                              }}
                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors shrink-0 cursor-pointer"
                              title="Download / View Document"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : isPhoto ? (() => {
                          const metaIdMatch = msg.message.match(/(?:\[Meta Media ID:\s*|\/api\/whatsapp\/media\/)([0-9]+)/i);
                          const base64Match = msg.message.match(/data:image\/[a-zA-Z0-9+]+;base64,[^|\s]+/);
                          const urlMatch = msg.message.match(/(https?:\/\/[^\s|]+|\/api\/[^\s|]+)/);
                          const resolvedPhotoSrc = base64Match
                            ? base64Match[0]
                            : metaIdMatch
                            ? `/api/whatsapp/media/${metaIdMatch[1]}`
                            : urlMatch
                            ? urlMatch[1]
                            : "";

                          return (
                            // Photo Bubble
                            <div className="rounded-xl overflow-hidden border border-gray-200 bg-white my-1 shadow-2xs max-w-xs">
                              <div
                                onClick={() => {
                                  if (resolvedPhotoSrc) setPreviewPhotoUrl(resolvedPhotoSrc);
                                }}
                                className="relative aspect-4/3 bg-gray-900/5 group cursor-pointer flex items-center justify-center overflow-hidden"
                              >
                                {resolvedPhotoSrc ? (
                                  <img
                                    src={resolvedPhotoSrc}
                                    alt="WhatsApp Photo"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="text-center p-3 text-indigo-600">
                                    <ImageIcon className="w-8 h-8 mx-auto mb-1" />
                                    <span className="text-[10px] font-bold">Photo Attachment</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5 text-white">
                                  <span className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors" title="View Photo">
                                    <Eye className="w-4 h-4" />
                                  </span>
                                  {resolvedPhotoSrc && (
                                    <a
                                      href={resolvedPhotoSrc}
                                      download="WhatsApp_Photo.jpg"
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                                      title="Download Photo"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div className="p-2 text-[11px] text-gray-700 font-medium flex items-center justify-between gap-2">
                                <span className="truncate">{msg.message.replace(/^📷 Photo:?\s*/, "").split("|")[0].trim() || "Photo Attachment"}</span>
                                {resolvedPhotoSrc && (
                                  <a
                                    href={resolvedPhotoSrc}
                                    download="WhatsApp_Photo.jpg"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-gray-400 hover:text-gray-700 transition-colors shrink-0 p-1"
                                    title="Download image"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })() : (
                          // Normal Text
                          <p className="whitespace-pre-wrap leading-relaxed font-normal select-text break-words [overflow-wrap:anywhere]">
                            {msg.message}
                          </p>
                        )}

                        {/* Timestamp & Status Checkmarks */}
                        <div className="flex items-center justify-end gap-1 text-[9px] text-gray-400 mt-1 select-none">
                          <span>{formatDeterministicDateTime(msg.createdAt)}</span>
                          {!isInbound && (
                            (() => {
                              const s = (msg.status || "").toUpperCase();
                              if (s === "READ") {
                                return (
                                  <span title="Read by recipient" className="inline-flex items-center">
                                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />
                                  </span>
                                );
                              }
                              if (s === "DELIVERED") {
                                return (
                                  <span title="Delivered to phone" className="inline-flex items-center">
                                    <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                                  </span>
                                );
                              }
                              if (s === "FAILED") {
                                return (
                                  <span title="Delivery failed" className="inline-flex items-center text-red-500">
                                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                  </span>
                                );
                              }
                              return (
                                <span title="Sent" className="inline-flex items-center">
                                  <Check className="w-3.5 h-3.5 text-gray-400" />
                                </span>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer Footer */}
            <div className="p-2 sm:p-3 bg-white border-t border-gray-200 relative">
              
              {/* Attachment Dropdown Menu */}
              {attachmentMenuOpen && (
                <div className="absolute bottom-16 left-2 sm:left-3 bg-white rounded-2xl shadow-xl border border-gray-200 p-2 space-y-1 w-52 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center space-x-2.5 p-2 rounded-xl hover:bg-red-50 text-gray-700 hover:text-red-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span>Send Document (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full flex items-center space-x-2.5 p-2 rounded-xl hover:bg-blue-50 text-gray-700 hover:text-blue-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span>Send Photo (Auto-compress)</span>
                  </button>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={handleDocumentUpload}
                className="hidden"
              />
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />

              {/* Responsive Composer Input Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-end gap-1.5 sm:gap-2 w-full min-w-0"
              >
                {/* Paperclip Button */}
                <button
                  type="button"
                  onClick={() => setAttachmentMenuOpen(!attachmentMenuOpen)}
                  className={`p-2 sm:p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                    attachmentMenuOpen
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  }`}
                  title="Attach document or photo"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Auto-responsive Draft Textarea */}
                <div className="flex-1 min-w-0 relative">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Message ${activeConversation.name}...`}
                    className="w-full min-w-0 min-h-[38px] max-h-36 py-2 px-3 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none overflow-y-auto leading-relaxed"
                  />
                  {compressing && (
                    <span className="absolute right-3 top-2 text-[10px] text-indigo-600 font-semibold flex items-center bg-white/90 px-1 rounded">
                      <Sparkles className="w-3 h-3 animate-spin mr-1" /> Compressing...
                    </span>
                  )}
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={sending || (!draft.trim() && !compressing)}
                  className="p-2 sm:p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all disabled:opacity-40 active:scale-95 shadow-xs cursor-pointer shrink-0 flex items-center justify-center"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          // Empty State
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center mb-3">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Select a Conversation</h2>
            <p className="text-xs text-gray-500 max-w-sm mt-1">
              Choose a client from the left pane to view message history, send quotations, or receive site measurements.
            </p>
          </div>
        )}
      </div>

      {/* ================= CONNECT WHATSAPP API MODAL ================= */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">Connect Meta WhatsApp API</h2>
                  <p className="text-[11px] text-gray-300">Official Cloud API for sending & receiving messages</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              
              {/* Test Result Banner */}
              {testResult && (
                <div className={`p-3 rounded-xl border flex items-start space-x-2 ${
                  testResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium text-[11px]">{testResult.message}</span>
                </div>
              )}

              {/* Step 1: Phone Number ID */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Phone Number ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 105938472910482"
                  value={config.phoneNumberId}
                  onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Found in Meta Developer Dashboard &gt; WhatsApp &gt; API Setup
                </span>
              </div>

              {/* Step 2: WABA ID */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 102948572910485"
                  value={config.wabaId}
                  onChange={(e) => setConfig({ ...config, wabaId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Step 3: Meta System User Access Token */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Permanent Meta Access Token <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="EAABwz..."
                  value={config.accessToken}
                  onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:border-emerald-500 outline-none font-mono"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Generated under Meta Business Manager &gt; System Users &gt; Tokens
                </span>
              </div>

              {/* Step 4: Webhook Callback Details */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                <div className="font-bold text-gray-700 flex items-center">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Webhook Receiver for Incoming Messages
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Callback URL to paste in Meta:</span>
                  <code className="text-[11px] text-indigo-700 bg-white px-2 py-1 rounded border border-gray-200 block truncate">
                    {typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/whatsapp` : "/api/webhooks/whatsapp"}
                  </code>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Verify Token:</span>
                  <code className="text-[11px] text-gray-800 bg-white px-2 py-1 rounded border border-gray-200 block">
                    {config.verifyToken || "stelar_whatsapp_secure_2026"}
                  </code>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || !config.phoneNumberId || !config.accessToken}
                className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${testingConnection ? "animate-spin" : ""}`} />
                {testingConnection ? "Testing..." : "Test Connection"}
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                >
                  {savingConfig ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= SIMULATE INBOUND MESSAGE MODAL ================= */}
      {showSimulateModal && activeConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 bg-purple-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <h3 className="font-bold text-sm">Simulate Client Reply</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-gray-500 text-[11px]">
                Simulates an incoming message or document sent by <strong>{activeConversation.name}</strong> to test live reception in local mode.
              </p>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Message Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["text", "document", "photo"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSimType(t)}
                      className={`py-1.5 px-2 rounded-lg font-bold text-[11px] border capitalize ${
                        simType === t
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Message Text / Caption</label>
                <textarea
                  rows={3}
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 rounded-xl focus:border-purple-500 outline-none text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowSimulateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSimulateInbound}
                disabled={sending}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {sending ? "Receiving..." : "Simulate Incoming Reply"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PHOTO LIGHTBOX MODAL ================= */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-9999 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md cursor-pointer animate-in fade-in duration-150"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2.5 z-50">
            <a
              href={previewPhotoUrl}
              download="WhatsApp_Photo.jpg"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg backdrop-blur-xs"
              title="Download photo"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
            <button
              type="button"
              onClick={() => setPreviewPhotoUrl(null)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <img
            src={previewPhotoUrl}
            alt="Full Photo"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
