"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ExternalLink, Type, Phone, Mail, ChevronDown, UserPlus, Calendar, Tag, CheckCircle, UploadCloud, Globe, Plus } from "lucide-react";
import { createLead } from "@/app/actions/leadActions";
import { getCustomLeadSources, addCustomLeadSource } from "@/app/actions/sourceActions";

interface AddSingleLeadClientProps {
  isAdmin?: boolean;
}

export default function AddSingleLeadClient({ isAdmin = false }: AddSingleLeadClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    alternatePhone: "",
    email: "",
    city: "",
    budget: "",
    status: "Fresh",
    source: "Manual"
  });

  const [sources, setSources] = useState<string[]>([
    "Manual", "Google Ads", "Meta Ads", "Website", "Referral", "WhatsApp", "Instagram", "Walk-in"
  ]);
  const [isAddingCustomSource, setIsAddingCustomSource] = useState(false);
  const [customSourceInput, setCustomSourceInput] = useState("");
  const [savingSource, setSavingSource] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      getCustomLeadSources().then((res) => {
        if (res && res.length > 0) {
          setSources(res);
        }
      });
    }
  }, [isAdmin]);

  const handleSaveCustomSource = async () => {
    const trimmed = customSourceInput.trim();
    if (!trimmed) return;
    setSavingSource(true);
    try {
      const res = await addCustomLeadSource(trimmed);
      if (res.success) {
        setSources(res.sources);
        setFormData(prev => ({ ...prev, source: trimmed }));
        setIsAddingCustomSource(false);
        setCustomSourceInput("");
      } else {
        alert(res.error || "Failed to add custom source");
      }
    } catch (e: any) {
      alert(e.message || "Failed to add source");
    } finally {
      setSavingSource(false);
    }
  };

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.phone && !formData.name) return; // Basic validation
    
    setLoading(true);
    setErrorMsg("");
    const result = await createLead(formData);
    setLoading(false);
    
    if (result.success && result.lead) {
      // If caller is currently on an active call, attach it to this lead
      if (typeof window !== "undefined") {
        try {
          const activeCallRaw = localStorage.getItem("active_crm_call");
          if (activeCallRaw) {
            const activeCall = JSON.parse(activeCallRaw);
            const cleanActive = String(activeCall.phone || "").replace(/\D/g, "").slice(-10);
            const cleanForm = String(formData.phone || "").replace(/\D/g, "").slice(-10);
            if (!activeCall.leadId || cleanActive === cleanForm) {
              activeCall.leadId = result.lead.id;
              activeCall.leadName = result.lead.name;
              localStorage.setItem("active_crm_call", JSON.stringify(activeCall));
            }
          }
        } catch (e) {}
      }
      setSuccess(true);
      setTimeout(() => {
        router.push(`/leads/${result.lead.id}`);
      }, 1000);
    } else {
      setErrorMsg(result.error || "Failed to create lead");
    }
  };

  return (
    <div className="h-full bg-[#FDFDFD] flex flex-col -m-3 md:-m-6 relative">
      
      {/* Top Header & Tab Switcher */}
      <div className="px-4 md:px-8 py-5 border-b border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/leads" className="hover:text-indigo-600 transition-colors">Leads</Link>
            <span>/</span>
            <span className="font-semibold text-gray-800">Add Lead</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-indigo-600" /> Add Single Lead
          </h1>
        </div>

        {/* Navigation Tabs (Single vs Bulk) - Only visible to Admins */}
        {isAdmin && (
          <div className="flex items-center bg-gray-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            <div className="flex items-center px-3.5 py-1.5 text-xs font-bold text-indigo-700 bg-white rounded-lg shadow-xs">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Single Lead
            </div>
            <Link
              href="/add/bulk"
              className="flex items-center px-3.5 py-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-lg transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Bulk Upload (Excel/PDF)
            </Link>
          </div>
        )}
      </div>

      {/* Form Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 pb-24">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center mb-6">
              <CheckCircle className="w-5 h-5 mr-3 text-green-500" />
              <div>
                <div className="font-bold text-sm">Lead created successfully!</div>
                <div className="text-xs">Redirecting to leads grid...</div>
              </div>
            </div>
          )}

          {/* NAME */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Name</label>
            <div className="flex items-center border border-gray-200 rounded overflow-hidden bg-white">
              <div className="px-3 border-r border-gray-100 text-gray-400">
                <Type className="w-4 h-4" />
              </div>
              <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Text field value" className="flex-1 px-3 py-2 text-sm text-gray-700 focus:outline-none" />
            </div>
          </div>

          {/* PHONE */}
          <div>
            <div className="flex items-center mb-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Phone</label>
              <span className="ml-3 bg-purple-100 text-[#4f46e5] text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center">
                <svg className="w-2.5 h-2.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"></path></svg>
                Lead ID
              </span>
            </div>
            <div className="flex items-center border border-gray-200 rounded overflow-hidden bg-white">
              <div className="px-3 border-r border-gray-100 text-gray-400">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex items-center border-r border-gray-100 px-3 bg-gray-50 cursor-pointer hover:bg-gray-100">
                <img src="https://flagcdn.com/w20/in.png" alt="IN" className="w-4 h-3 mr-2" />
                <span className="text-xs font-medium text-gray-600">+91</span>
                <ChevronDown className="w-3 h-3 ml-2 text-gray-400" />
              </div>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="10 digit valid phone number" className="flex-1 px-3 py-2 text-sm text-gray-700 focus:outline-none" />
            </div>
          </div>

          {/* ALTERNATE PHONE */}
          <div>
            <div className="flex items-center mb-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Alternate Phone (Optional)</label>
            </div>
            <div className="flex items-center border border-gray-200 rounded overflow-hidden bg-white">
              <div className="px-3 border-r border-gray-100 text-gray-400">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex items-center border-r border-gray-100 px-3 bg-gray-50 cursor-pointer hover:bg-gray-100">
                <img src="https://flagcdn.com/w20/in.png" alt="IN" className="w-4 h-3 mr-2" />
                <span className="text-xs font-medium text-gray-600">+91</span>
                <ChevronDown className="w-3 h-3 ml-2 text-gray-400" />
              </div>
              <input type="tel" name="alternatePhone" value={formData.alternatePhone} onChange={handleChange} placeholder="Secondary 10 digit phone number" className="flex-1 px-3 py-2 text-sm text-gray-700 focus:outline-none" />
            </div>
          </div>

          {/* EMAIL */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Email</label>
            <div className="flex items-center border border-gray-200 rounded overflow-hidden bg-white">
              <div className="px-3 border-r border-gray-100 text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Email field value" className="flex-1 px-3 py-2 text-sm text-gray-700 focus:outline-none" />
            </div>
          </div>

          {/* APPROXIMATE BUDGET */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Approximate Budget</label>
            <div className="flex items-center border border-gray-200 rounded overflow-hidden bg-white">
              <div className="px-3 border-r border-gray-100 text-gray-400">
                <ChevronDown className="w-4 h-4" />
              </div>
              <select name="budget" value={formData.budget} onChange={handleChange} className="flex-1 px-3 py-2 text-sm text-gray-700 focus:outline-none bg-white appearance-none cursor-pointer">
                <option value="">Select Dropdown Value</option>
                <option value="₹1l-₹5l">₹1l-₹5l</option>
                <option value="₹5l-₹10l">₹5l-₹10l</option>
                <option value="₹10l+">₹10l+</option>
              </select>
            </div>
          </div>

          {/* CITY */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">City</label>
            <div className="flex items-center border border-gray-200 rounded overflow-hidden bg-white">
              <div className="px-3 border-r border-gray-100 text-gray-400">
                <Type className="w-4 h-4" />
              </div>
              <input type="text" name="city" value={formData.city} onChange={handleChange} placeholder="Text field value" className="flex-1 px-3 py-2 text-sm text-gray-700 focus:outline-none" />
            </div>
          </div>

          {/* LEAD SOURCE (ADMIN ONLY) */}
          {isAdmin && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  Lead Source <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded">Admin Only</span>
                </label>
                {!isAddingCustomSource && (
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomSource(true)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center cursor-pointer"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Custom Source
                  </button>
                )}
              </div>

              {isAddingCustomSource ? (
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2 animate-in fade-in duration-150">
                  <div className="text-[11px] font-semibold text-gray-700">Enter New Lead Source Name:</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSourceInput}
                      onChange={(e) => setCustomSourceInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveCustomSource(); } }}
                      placeholder="e.g. Google Ads, Exhibition, YouTube"
                      className="flex-1 px-3 py-2 text-sm border border-indigo-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveCustomSource}
                      disabled={savingSource || !customSourceInput.trim()}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {savingSource ? "Adding..." : "Add Source"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingCustomSource(false); setCustomSourceInput(""); }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center border border-gray-200 rounded overflow-hidden bg-white">
                  <div className="px-3 border-r border-gray-100 text-gray-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={(e) => {
                      if (e.target.value === "__ADD_CUSTOM__") {
                        setIsAddingCustomSource(true);
                      } else {
                        handleChange(e);
                      }
                    }}
                    className="flex-1 px-3 py-2 text-sm text-gray-700 focus:outline-none bg-white cursor-pointer"
                  >
                    {sources.map((src) => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                    <option value="__ADD_CUSTOM__">➕ Add Custom Source...</option>
                  </select>
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 px-4 md:px-6 py-3 flex items-center justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-4">
          {errorMsg && <span className="text-red-500 text-sm font-semibold">{errorMsg}</span>}
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className={`bg-[#4f46e5] hover:bg-purple-800 text-white font-bold text-sm px-10 py-2.5 rounded shadow-sm transition-colors ${loading ? "opacity-50" : ""}`}
          >
            {loading ? "SAVING..." : success ? "SAVED!" : "ADD LEAD"}
          </button>
        </div>
      </div>

    </div>
  );
}
