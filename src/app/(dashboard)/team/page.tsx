import prisma from "@/lib/prisma";
import { Download, Search, User, Shield, CheckCircle2, ShoppingCart } from "lucide-react";
import AddEmployeeButton from "@/components/AddEmployeeButton";
import Link from "next/link";
import DeleteEmployeeButton from "@/components/DeleteEmployeeButton";
import EditPasswordModal from "@/components/EditPasswordModal";

export default async function UserManagementPage() {
  const users = await prisma.user.findMany({
    include: { permissionTemplate: true },
    orderBy: { name: "asc" }
  });

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Root",
    MANAGER: "Manager",
    TELECALLER: "Caller",
    AGENT: "Agent",
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-y-auto p-6">
      <div className="w-full max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {users.length} team member{users.length !== 1 ? "s" : ""} in your organization
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="flex items-center px-4 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
              <Download className="w-4 h-4 mr-2" /> Export
            </button>
            {/* Live Add Employee Button */}
            <AddEmployeeButton />
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center justify-between border-y border-gray-200 py-3 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Name or Email"
              className="w-full pl-9 pr-4 py-1.5 border-none text-sm focus:outline-none"
            />
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{users.length} users total</span>
          </div>
        </div>

        {/* Count Row */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-400 font-medium">1–{users.length} of {users.length}</span>
        </div>

        {/* Table */}
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <table className="min-w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-4 md:px-6 py-3.5 w-12 text-left">
                  <input type="checkbox" className="rounded border-gray-300 w-4 h-4" />
                </th>
                <th className="px-4 md:px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Name</th>
                <th className="px-4 md:px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Role</th>
                <th className="px-4 md:px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Permission Template</th>
                <th className="px-4 md:px-6 py-3.5 text-center text-xs font-bold text-gray-600 uppercase tracking-wide">2FA</th>
                <th className="px-4 md:px-6 py-3.5 text-left text-xs font-bold text-gray-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => {
                const initials = user.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
                const roleLabel = ROLE_LABELS[user.role] ?? user.role;
                const roleColor =
                  user.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                  user.role === "MANAGER" ? "bg-blue-100 text-blue-700" :
                  user.role === "TELECALLER" ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-600";
                return (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 md:px-6 py-4">
                      <input type="checkbox" className="rounded border-gray-300 w-4 h-4" />
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-[#E8E2F7] flex items-center justify-center text-[#613cbc] font-black text-xs mr-3 flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-gray-900">{user.name}</div>
                          <div className="text-[11px] text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${roleColor}`}>
                        {roleLabel}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-[12px] text-gray-500">
                      {user.permissionTemplate?.name ?? `Default ${roleLabel} Permissions`}
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-center">
                      <Shield className="w-4 h-4 mx-auto text-gray-300" />
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/team/permissions/${user.id}`}
                          className="text-[11px] font-bold text-[#613cbc] border border-[#613cbc] px-2 py-1 rounded hover:bg-purple-50 transition-colors"
                        >
                          Permissions
                        </Link>
                        <EditPasswordModal userId={user.id} userName={user.name} />
                        <DeleteEmployeeButton userId={user.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-6 h-6 text-[#613cbc]" />
              </div>
              <div className="text-[14px] font-bold text-gray-600">No team members yet</div>
              <div className="text-[12px] text-gray-400 mt-1">Click "Add Employee" to get started</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
