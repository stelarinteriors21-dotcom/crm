import { RefreshCw, Upload, Search, Download, ChevronDown, User, Flag, Maximize2, Phone, X } from "lucide-react";
import { getTasks } from "@/app/actions/taskActions";
import { formatDistanceToNow } from "date-fns";

export default async function TasksPage() {
  const dbTasks = await getTasks();

  return (
    <div className="h-full bg-white flex flex-col -m-3 md:-m-6 relative overflow-hidden">
      
      {/* Header */}
      <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h1 className="text-[17px] font-bold text-gray-800 flex items-center">
            Tasks <RefreshCw className="w-4 h-4 ml-2 text-[#613cbc] cursor-pointer" />
          </h1>
          <div className="text-[11px] text-gray-400 mt-0.5">
            Never miss a followup by creating task <span className="text-[#613cbc] underline cursor-pointer">Learn More</span>
          </div>
        </div>
        <button className="flex items-center text-[#613cbc] border border-purple-200 bg-purple-50 px-4 py-2 rounded text-[13px] font-bold hover:bg-purple-100 transition-colors">
          <Upload className="w-4 h-4 mr-2" /> Upload tasks
        </button>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-6 pt-2 border-b border-gray-100 flex items-center space-x-6 shrink-0 bg-white">
        <button className="text-[#613cbc] text-[13px] font-bold border-b-[3px] border-[#613cbc] pb-3 -mb-[2px]">
          Call Followups <SettingsIcon className="w-3.5 h-3.5 ml-1 inline text-gray-400" />
        </button>
        <button className="text-gray-500 text-[13px] font-bold hover:text-gray-700 pb-3 -mb-[2px]">
          Todo
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 py-3 border-b border-gray-100 flex items-center space-x-3 shrink-0 bg-[#FDFDFD]">
        
        <div className="relative flex-1 max-w-[280px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search on description" 
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-[#613cbc] bg-white"
          />
        </div>

        <div className="flex border border-gray-200 rounded overflow-hidden">
          <button className="bg-purple-50 text-[#613cbc] border-r border-purple-200 px-3 py-1.5 text-[11px] font-bold flex items-center">
            <User className="w-3.5 h-3.5 mr-1.5" /> Me
          </button>
          <button className="bg-white text-gray-500 px-3 py-1.5 text-[11px] font-bold flex items-center hover:bg-gray-50">
            Te... <ChevronDown className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        <FilterDropdown label="Due" value="All" icon={<CalendarIcon />} />
        <FilterDropdown label="Status" value="Pending, Late" />
        <FilterDropdown label="Priority" value="" />
        <FilterDropdown label="Creator" value="All" icon={<User className="w-3 h-3" />} />
        <FilterDropdown label="Created On" value="All" icon={<CalendarIcon />} />

      </div>

      {/* Table Toolbar */}
      <div className="px-4 md:px-6 py-2 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
        <div className="text-[11px] font-bold text-gray-800">{dbTasks.length} matching tasks</div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center text-gray-500 hover:text-gray-700 text-[11px] font-bold">
            <Download className="w-3.5 h-3.5 mr-1" /> Download
          </button>
          <div className="text-[11px] text-gray-500 flex items-center">
            Sorted by Due date <MenuIcon className="w-3.5 h-3.5 ml-1" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white p-6">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-[#F4F5F7] border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left w-10"><input type="checkbox" className="rounded border-gray-300" /></th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Task Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Assignee</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-center">Due Date <span className="ml-1 text-[8px]">▼</span></th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dbTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500 text-sm">No tasks found. Add a follow-up to a lead!</td>
                </tr>
              ) : dbTasks.map(task => {
                const isLate = new Date(task.dueDate) < new Date();
                
                return (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 py-3"><input type="checkbox" className="rounded border-gray-300" /></td>
                    <td className="px-4 py-3 text-[13px] font-bold text-[#613cbc] hover:underline cursor-pointer flex items-center">
                      {task.lead?.name || "Unknown Lead"} <ExternalLinkIcon className="w-3 h-3 ml-1 text-gray-400" />
                    </td>
                    <td className="px-4 py-3 text-[13px] text-gray-400 italic">{task.title || "No description"}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="w-6 h-6 rounded-full bg-[#E8E2F7] text-[#613cbc] flex items-center justify-center text-[9px] font-bold mx-auto border border-white shadow-sm">SI</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[11px] font-bold tracking-wider ${isLate ? "text-red-600" : "text-green-600"}`}>{isLate ? "LATE" : "PENDING"}</span>
                    </td>
                    <td className={`px-4 py-3 text-center text-[13px] flex items-center justify-center ${isLate ? "text-red-500" : "text-gray-600"}`}>
                      {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })} <ChevronDown className="w-3 h-3 ml-1" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Flag className="w-4 h-4 text-gray-400 mx-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center space-x-2">
                        <button className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-500 shadow-sm"><Maximize2 className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 bg-white border border-gray-200 rounded hover:bg-purple-50 text-[#613cbc] shadow-sm"><Phone className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 bg-white border border-gray-200 rounded hover:bg-red-50 text-red-500 shadow-sm"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer */}
      <div className="h-12 border-t border-gray-100 flex items-center justify-end px-4 md:px-6 bg-white shrink-0 absolute bottom-0 w-full space-x-2">
        <div className="text-[11px] text-gray-500 mr-2">1-1 of 1</div>
        <button className="w-6 h-6 rounded border border-gray-200 bg-white text-gray-400 flex items-center justify-center hover:bg-gray-50">&lt;</button>
        <button className="w-6 h-6 rounded border border-gray-200 bg-white text-gray-400 flex items-center justify-center hover:bg-gray-50">&gt;</button>
      </div>

    </div>
  );
}

function FilterDropdown({ label, value, icon }: any) {
  return (
    <div className="relative flex-1 max-w-[140px]">
      <button className="w-full flex items-center justify-between border border-gray-200 bg-white rounded px-2.5 py-1.5 text-[11px] hover:border-gray-300">
        <div className="flex items-center text-gray-400">
          {icon && <span className="mr-1.5">{icon}</span>}
          {label}
        </div>
        <div className="flex items-center text-gray-700 font-bold ml-2">
          <span className="truncate max-w-[60px] text-right">{value}</span>
          <ChevronDown className="w-3 h-3 ml-1 text-gray-400" />
        </div>
      </button>
    </div>
  );
}

function SettingsIcon(props: any) { return <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><circle cx="12" cy="12" r="3"></circle></svg>; }
function CalendarIcon() { return <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>; }
function MenuIcon(props: any) { return <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>; }
function ExternalLinkIcon(props: any) { return <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>; }
