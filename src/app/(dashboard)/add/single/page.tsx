"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ExternalLink, Type, Phone, Mail, ChevronDown, UserPlus, Calendar, Tag, CheckCircle } from "lucide-react";
import { createLead } from "@/app/actions/leadActions";

export default function AddSingleLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    budget: "",
    status: "Fresh",
    source: "MANUAL"
  });

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.phone && !formData.name) return; // Basic validation
    
    setLoading(true);
    setErrorMsg("");
    const result = await createLead(formData);
    setLoading(false);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push("/leads");
      }, 1000);
    } else {
      setErrorMsg(result.error || "Failed to create lead");
    }
  };

  return (
    <div className="h-full bg-[#FDFDFD] flex flex-col -m-6 relative">
      
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search for lead fields" 
            className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border-none rounded text-xs focus:outline-none"
          />
        </div>
        <button className="flex items-center text-[#613cbc] border border-purple-200 bg-purple-50 px-4 py-1.5 rounded-full text-[11px] font-bold hover:bg-purple-100 transition-colors">
          <ExternalLink className="w-3.5 h-3.5 mr-2" /> Previously uploaded leads
        </button>
      </div>

      {/* Form Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 pb-24">
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
              <span className="ml-3 bg-purple-100 text-[#613cbc] text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center">
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

          {/* CAPTURE FREQUENCY */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 block">Capture Frequency</label>
            <div className="flex items-center border border-gray-200 rounded overflow-hidden bg-gray-50">
              <div className="px-3 border-r border-gray-100 text-gray-400">
                <span className="text-xs font-bold font-mono">#</span>
              </div>
              <input type="text" placeholder="Number field value" disabled className="flex-1 px-3 py-2 text-sm text-gray-400 bg-gray-50 focus:outline-none cursor-not-allowed" />
            </div>
          </div>
          
        </div>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 px-6 py-3 flex items-center justify-between shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center">
          <input type="checkbox" className="w-4 h-4 rounded border-gray-300 mr-3" />
          <span className="text-[13px] font-bold text-gray-700">Auto Assign rules</span>
        </div>
        <div className="flex items-center gap-4">
          {errorMsg && <span className="text-red-500 text-sm font-semibold">{errorMsg}</span>}
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className={`bg-[#613cbc] hover:bg-purple-800 text-white font-bold text-sm px-10 py-2.5 rounded shadow-sm transition-colors ${loading ? "opacity-50" : ""}`}
          >
            {loading ? "SAVING..." : success ? "SAVED!" : "ADD LEAD"}
          </button>
        </div>
      </div>

    </div>
  );
}
