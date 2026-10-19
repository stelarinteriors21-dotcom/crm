"use client";

import React, { useState, useRef } from "react";
import { Plus, X, Eye, EyeOff, User, Mail, Lock, Shield, ChevronDown } from "lucide-react";
import { addEmployee } from "@/app/actions/teamActions";

const ROLES = [
  { value: "ADMIN", label: "Admin / Root", desc: "Full access to everything" },
  { value: "MANAGER", label: "Manager", desc: "Manage team and leads" },
  { value: "TELECALLER", label: "Caller", desc: "Make calls and manage assigned leads" },
  { value: "AGENT", label: "Agent", desc: "View and update leads only" },{ value: "SITE_VISITOR", label: "Site Visitor", desc: "Access to field visit dashboard only" },
];

export default function AddEmployeeButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState("TELECALLER");
  const [roleOpen, setRoleOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const selectedRoleObj = ROLES.find(r => r.value === selectedRole)!;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("role", selectedRole);

    const result = await addEmployee(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      formRef.current?.reset();
      setSelectedRole("TELECALLER");
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 1500);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => { setOpen(true); setError(""); setSuccess(false); }}
        className="flex items-center px-4 py-1.5 bg-[#4f46e5] text-white rounded-lg text-sm font-bold hover:bg-purple-800 transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4 mr-1.5" /> Add Employee
      </button>

      {/* Modal Backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden overflow-y-auto max-h-[90vh] animate-in fade-in slide-in-from-bottom-4 duration-200">
            
            {/* Modal Header */}
            <div className="px-4 md:px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#4f46e5]/5 to-transparent">
              <div>
                <h2 className="text-[16px] font-black text-gray-900">Add New Employee</h2>
                <p className="text-[12px] text-gray-400 mt-0.5">Create a login for a new team member</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Form */}
            <form ref={formRef} onSubmit={handleSubmit} className="px-4 md:px-6 py-5 space-y-4">
              
              {/* Name */}
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="name"
                    type="text"
                    required
                    placeholder="e.g. Shilpa Rajan"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/20 transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="e.g. shilpa@stelarinteriors.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/20 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Min. 6 characters"
                    className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5]/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role Dropdown */}
              <div>
                <label className="block text-[12px] font-bold text-gray-700 mb-1.5">Role <span className="text-red-500">*</span></label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setRoleOpen(!roleOpen)}
                    className="w-full flex items-center justify-between px-3 py-2.5 border border-gray-200 rounded-lg text-[13px] hover:border-[#4f46e5] transition focus:outline-none focus:border-[#4f46e5]"
                  >
                    <div className="flex items-center">
                      <Shield className="w-4 h-4 text-[#4f46e5] mr-2.5" />
                      <div className="text-left">
                        <div className="font-semibold text-gray-800">{selectedRoleObj.label}</div>
                        <div className="text-[10px] text-gray-400">{selectedRoleObj.desc}</div>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${roleOpen ? "rotate-180" : ""}`} />
                  </button>
                  {roleOpen && (
                    <div className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      {ROLES.map(r => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => { setSelectedRole(r.value); setRoleOpen(false); }}
                          className={`w-full flex items-start px-4 py-3 hover:bg-purple-50 text-left transition-colors ${selectedRole === r.value ? "bg-purple-50" : ""}`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 mt-0.5 mr-3 flex-shrink-0 flex items-center justify-center ${selectedRole === r.value ? "border-[#4f46e5] bg-[#4f46e5]" : "border-gray-300"}`}>
                            {selectedRole === r.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                          <div>
                            <div className="text-[13px] font-bold text-gray-800">{r.label}</div>
                            <div className="text-[11px] text-gray-400">{r.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-[12px] font-medium px-4 py-2.5 rounded-lg flex items-center">
                  <X className="w-4 h-4 mr-2 flex-shrink-0" /> {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-[12px] font-medium px-4 py-2.5 rounded-lg">
                  ✓ Employee added successfully!
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-[13px] font-bold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || success}
                  className="flex-1 py-2.5 bg-[#4f46e5] text-white text-[13px] font-bold rounded-lg hover:bg-purple-800 disabled:opacity-60 transition-colors"
                >
                  {loading ? "Creating..." : success ? "✓ Created!" : "Create Employee"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </>
  );
}
