const fs = require('fs');
let code = fs.readFileSync('src/components/LeadsTableClient.tsx', 'utf8');

// 1. Add imports
code = code.replace(
  /import \{ ChevronDown, ChevronRight, Edit3, GripVertical \} from "lucide-react";/,
  'import { ChevronDown, ChevronRight, Edit3, GripVertical, History } from "lucide-react";\nimport { getCallHistoryByPhone } from "@/app/actions/leadActions";'
);

// 2. Add CallHistoryModal at the top (before default export)
const modalCode = `
const CallHistoryModal = ({ phone, onClose }: { phone: string, onClose: () => void }) => {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getCallHistoryByPhone(phone).then(res => {
      setLogs(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [phone]);

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center">
            <History className="w-4 h-4 mr-2 text-[#613cbc]" />
            Call History: {phone}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? <p className="text-gray-500 text-sm text-center py-4">Loading calls...</p> : 
           logs.length === 0 ? <p className="text-gray-500 text-sm text-center py-4">No calls logged yet.</p> :
           <div className="space-y-3">
             {logs.map(log => (
               <div key={log.id} className="border border-gray-100 p-3 rounded-lg bg-white shadow-sm text-sm">
                 <div className="flex justify-between text-[11px] text-gray-500 mb-2 pb-2 border-b border-gray-50">
                   <span className="font-bold text-[#613cbc]">{log.user?.name || "User"}</span>
                   <span>{new Date(log.createdAt).toLocaleString('en-IN', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                 </div>
                 <div className="font-medium text-gray-800 flex justify-between items-center">
                    <span>Lead: {log.lead?.name || "Unknown"}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                      Duration: {Math.floor(log.duration/60)}m {log.duration%60}s
                    </span>
                 </div>
                 {log.notes && <p className="mt-2 text-gray-600 text-xs italic bg-gray-50 p-2 rounded">"{log.notes}"</p>}
               </div>
             ))}
           </div>
          }
        </div>
      </div>
    </div>
  )
}
`;

code = code.replace('export default function LeadsTableClient', modalCode + '\nexport default function LeadsTableClient');

// 3. Add state inside LeadsTableClient
code = code.replace(
  /const \[visibleCols, setVisibleCols\] = useState<string\[\]>\(\[\]\);/,
  'const [visibleCols, setVisibleCols] = useState<string[]>([]);\n  const [historyPhone, setHistoryPhone] = useState<string | null>(null);'
);

// 4. Update case 'phone': to include the button
const phoneRegex = /case 'phone': return <React\.Fragment key="phone"><td className="px-4 py-2\.5 whitespace-nowrap text-gray-900 font-medium">\n\s*<div className="flex items-center justify-between">\n\s*<span>\{lead\.phone\}<\/span>\n\s*<div className="flex space-x-2 ml-4">/;

code = code.replace(phoneRegex, `case 'phone': return <React.Fragment key="phone"><td className="px-4 py-2.5 whitespace-nowrap text-gray-900 font-medium">
  <div className="flex items-center justify-between">
  <span>{lead.phone}</span>
  <div className="flex space-x-2 ml-4">
    <button onClick={() => setHistoryPhone(lead.phone)} title="Call History" className="p-1 bg-purple-50 text-[#613cbc] rounded hover:bg-purple-100 flex items-center justify-center">
      <History className="w-3.5 h-3.5" />
    </button>`);

// 5. Add modal to return ()
code = code.replace(
  /<\/div>\n\s*<\/div>\n\s*<\/>\n\s*\);\n\}/,
  '  {historyPhone && <CallHistoryModal phone={historyPhone} onClose={() => setHistoryPhone(null)} />}\n      </div>\n    </div>\n    </>\n  );\n}'
);

fs.writeFileSync('src/components/LeadsTableClient.tsx', code);
