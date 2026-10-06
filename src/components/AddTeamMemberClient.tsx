"use client"

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { createTeamMember } from "@/app/actions/team";

export default function AddTeamMemberClient() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const formData = new FormData(e.currentTarget);
    const res = await createTeamMember(formData);
    
    if (res.success) {
      setIsOpen(false);
    } else {
      setError(res.error || "Failed to add member");
    }
    setLoading(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-sm font-medium shadow-sm hover:bg-purple-700"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Add Team Member
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Add New Team Member</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">{error}</div>}
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" name="name" required className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-[#4f46e5]" placeholder="Jane Doe" />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" name="email" required className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-[#4f46e5]" placeholder="jane@company.com" />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Temporary Password</label>
                <input type="password" name="password" required className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-[#4f46e5]" placeholder="••••••••" />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
                <select name="role" required className="w-full px-3 py-2 border border-gray-300 rounded-md outline-none focus:border-[#4f46e5] bg-white">
                  <option value="TELECALLER">Telecaller (View assigned leads only)</option>
                  <option value="MANAGER">Manager (View team performance)</option>
                  <option value="ADMIN">Admin (Full Access)</option>
                </select>
              </div>
              
              <div className="pt-4 border-t border-gray-100 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 bg-[#4f46e5] text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
