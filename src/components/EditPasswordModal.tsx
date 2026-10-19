"use client";

import React, { useState } from "react";
import { KeyRound, X, Eye, EyeOff, Check, AlertCircle } from "lucide-react";
import { updateEmployeePassword } from "@/app/actions/teamActions";

interface EditPasswordModalProps {
  userId: string;
  userName: string;
}

export default function EditPasswordModal({ userId, userName }: EditPasswordModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const res = await updateEmployeePassword(userId, password);

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      setPassword("");
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
      }, 1500);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          setError("");
          setSuccess(false);
          setPassword("");
        }}
        className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded hover:bg-amber-100 transition-colors flex items-center"
        title="Edit Password"
      >
        <KeyRound className="w-3 h-3 mr-1" /> Password
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-amber-50/50 shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Edit Password</h3>
                  <p className="text-xs text-gray-500">Change password for <span className="font-semibold text-gray-800">{userName}</span></p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                className="p-1 hover:bg-gray-200/60 rounded-lg text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={4}
                    placeholder="Enter new password"
                    className="w-full px-3.5 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 pr-10"
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

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-green-50 text-green-700 text-xs flex items-center font-bold">
                  <Check className="w-4 h-4 mr-2 flex-shrink-0" />
                  Password updated successfully!
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !password || success}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                >
                  {loading ? "Updating..." : "Set Password"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
