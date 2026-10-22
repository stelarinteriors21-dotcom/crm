"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Calendar as CalendarIcon, 
  Trash2, 
  Loader2, 
  Plus, 
  User, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  Filter
} from "lucide-react";
import { addLeaveForUser, deleteLeave, getTeamLeavesData } from "@/app/actions/leaveActions";

export default function ManageLeavesModal({ onClose }: { onClose: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [selectedUserId, setSelectedUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Filter State
  const [userFilter, setUserFilter] = useState<string>("ALL");

  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await getTeamLeavesData();
      setUsers(data.users || []);
      setLeaves(data.leaves || []);
      if (!selectedUserId && data.users && data.users.length > 0) {
        setSelectedUserId(data.users[0].id);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || "Failed to load team leave data.");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !startDate || !endDate) return;

    setSubmitting(true);
    setErrorMessage(null);
    try {
      await addLeaveForUser(selectedUserId, startDate, endDate);
      await loadData();
      setStartDate("");
      setEndDate("");
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e?.message || "Failed to mark leave.");
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove the leave for ${memberName}?`)) return;
    try {
      await deleteLeave(id);
      await loadData();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to delete leave.");
    }
  };

  const getLeaveStatus = (startStr: string, endStr: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(startStr);
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const end = new Date(endStr);
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);

    if (now >= startDateOnly && now <= endDateOnly) {
      return { label: "On Leave Today", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
    }
    if (startDateOnly > today) {
      return { label: "Upcoming", color: "bg-indigo-100 text-indigo-800 border-indigo-200" };
    }
    return { label: "Past", color: "bg-gray-100 text-gray-600 border-gray-200" };
  };

  const filteredLeaves = userFilter === "ALL" 
    ? leaves 
    : leaves.filter(l => l.userId === userFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-gray-100">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-gray-100 bg-gray-50/70 shrink-0">
          <div className="flex items-center min-w-0 pr-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center mr-3 shrink-0 text-purple-600">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                  Team Leave Management
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center">
                  <ShieldCheck className="w-3 h-3 mr-0.5" /> Admin Only
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Mark leaves for team members so new leads are not assigned to them while away
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form: Mark New Leave */}
          <form onSubmit={handleAdd} className="space-y-4 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-gray-800 flex items-center">
                <Plus className="w-4 h-4 mr-1 text-purple-600" /> Mark Leave for a Team Member
              </h3>
            </div>

            <div className="space-y-3">
              {/* Member Selector */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                  Select Team Member
                </label>
                <select
                  required
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full text-sm font-medium border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                >
                  {users.length === 0 ? (
                    <option value="">Loading users...</option>
                  ) : (
                    users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role}) — {u.email}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Date pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    Start Date
                  </label>
                  <input 
                    type="date" 
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full text-sm font-medium border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
                    End Date
                  </label>
                  <input 
                    type="date" 
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full text-sm font-medium border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submitting || loading || users.length === 0}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Leave...
                </>
              ) : (
                <>
                  <CalendarIcon className="w-4 h-4 mr-1.5" /> Mark Leave
                </>
              )}
            </button>
          </form>

          {/* List of Marked Leaves */}
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center">
                <Clock className="w-4 h-4 mr-1.5 text-gray-500" />
                Team Leaves Record ({filteredLeaves.length})
              </h3>

              {/* Filter by Member */}
              {users.length > 0 && (
                <div className="flex items-center space-x-1.5 text-xs">
                  <Filter className="w-3.5 h-3.5 text-gray-400" />
                  <select
                    value={userFilter}
                    onChange={e => setUserFilter(e.target.value)}
                    className="text-xs font-semibold border border-gray-200 rounded-md py-1 px-2 bg-white text-gray-700 focus:outline-none"
                  >
                    <option value="ALL">All Team Members</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-medium">Loading leave records...</p>
              </div>
            ) : filteredLeaves.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
                <p className="text-sm font-medium text-gray-500">No leaves marked for the selected member(s).</p>
                <p className="text-xs text-gray-400 mt-1">Mark a leave above when a team member is unavailable.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
                {filteredLeaves.map(leave => {
                  const status = getLeaveStatus(leave.startDate, leave.endDate);
                  const memberName = leave.user?.name || "Unknown Member";
                  const memberRole = leave.user?.role || "Staff";

                  return (
                    <div 
                      key={leave.id} 
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl shadow-xs hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs mr-3 shrink-0">
                          {memberName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-gray-900 truncate">
                              {memberName}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded">
                              {memberRole}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 font-medium mt-0.5">
                            {new Date(leave.startDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} — {new Date(leave.endDate).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${status.color}`}>
                          {status.label}
                        </span>
                        <button 
                          type="button"
                          onClick={() => handleDelete(leave.id, memberName)}
                          className="text-gray-400 hover:text-red-600 p-1.5 transition-colors rounded-lg hover:bg-red-50"
                          title="Remove Leave"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
