"use client";

import { useState, useEffect } from "react";
import { login, restoreSession } from "@/app/actions/authActions";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSavedSession, setCheckingSavedSession] = useState(true);

  // Auto-restore session from device storage if cookie was cleared from RAM by Android
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem("stelar_active_session_email");
      if (savedEmail) {
        restoreSession(savedEmail).then((res) => {
          if (res?.success) {
            window.location.href = "/dashboard";
          } else {
            localStorage.removeItem("stelar_active_session_email");
            setCheckingSavedSession(false);
          }
        }).catch(() => {
          setCheckingSavedSession(false);
        });
      } else {
        setCheckingSavedSession(false);
      }
    } catch (e) {
      setCheckingSavedSession(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const cleanEmail = email.toLowerCase().trim();
      try {
        localStorage.setItem("stelar_active_session_email", cleanEmail);
      } catch (e) {}

      const formData = new FormData();
      formData.append("email", cleanEmail);
      formData.append("password", password);
      const res = await login(formData);
      if (res?.error) {
        try {
          localStorage.removeItem("stelar_active_session_email");
        } catch (e) {}
        setError(res.error);
        setLoading(false);
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      if (err.message === "NEXT_REDIRECT") {
        throw err;
      }
      try {
        localStorage.removeItem("stelar_active_session_email");
      } catch (e) {}
      console.error("Login exception:", err);
      setError(err.message || "An unexpected error occurred connecting to the database. Please try again.");
      setLoading(false);
    }
  };

  if (checkingSavedSession) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center animate-pulse">
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center bg-white shadow-sm border border-gray-100 p-2 mb-3">
            <img src="/logo.png" alt="Stelar Interiors" className="w-full h-full object-contain" />
          </div>
          <span className="text-xs font-semibold text-gray-500">Restoring session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center bg-white shadow-sm border border-gray-100 p-1 mb-2">
            <img src="/logo.png" alt="Stelar Interiors" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-[11px] text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full tracking-wider uppercase">
            Official CRM
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-6">Sign In to Stelar CRM</h1>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input 
              type="email" 
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="off"
              className="w-full px-4 py-2 text-gray-900 bg-white placeholder-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-4 py-2 text-gray-900 bg-white placeholder-gray-400 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 focus:border-[#4f46e5]"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-[#4f46e5] hover:bg-[#502fa1] text-white font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
