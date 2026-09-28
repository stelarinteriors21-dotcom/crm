const fs = require('fs');
let code = fs.readFileSync('src/components/LeadsTableClient.tsx', 'utf-8');

// 1. Add columnOrder state
code = code.replace(
  'const [visibleCols, setVisibleCols] = useState<string[]>(',
  `const [columnOrder, setColumnOrder] = useState<string[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem('leadsColumnOrder');
    if (saved) setColumnOrder(JSON.parse(saved));
    else setColumnOrder(allColumns.map(c => c.id));
  }, [customFieldKeys]);

  const [visibleCols, setVisibleCols] = useState<string[]>(`
);

// We need a helper to move items in the array
code = code.replace(
  'const toggleCol = (id: string) => {',
  `const moveCol = (id: string, direction: -1 | 1) => {
    const idx = columnOrder.indexOf(id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= columnOrder.length) return;
    const newOrder = [...columnOrder];
    [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
    setColumnOrder(newOrder);
    localStorage.setItem('leadsColumnOrder', JSON.stringify(newOrder));
  };

  const toggleCol = (id: string) => {`
);

// In the dropdown menu, add up/down arrows next to each column toggle
code = code.replace(
  /\{allColumns\.map\(col => \([\s\S]*?<\/label>\s*\)\)\}/m,
  `{columnOrder.map(colId => {
    const col = allColumns.find(c => c.id === colId);
    if (!col) return null;
    return (
      <div key={col.id} className="flex items-center justify-between hover:bg-gray-50 rounded px-2 py-1.5">
        <label className="flex items-center flex-1 cursor-pointer">
          <input 
            type="checkbox" 
            checked={isCol(col.id)} 
            onChange={() => toggleCol(col.id)} 
            className="rounded border-gray-300 text-[#613cbc] focus:ring-[#613cbc] mr-2"
          />
          <span className="text-xs text-gray-700">{col.label}</span>
        </label>
        <div className="flex items-center space-x-1">
          <button onClick={(e) => { e.stopPropagation(); moveCol(col.id, -1); }} className="p-1 text-gray-400 hover:text-[#613cbc] hover:bg-gray-200 rounded" title="Move Left"><ChevronDown className="w-3 h-3 rotate-90" /></button>
          <button onClick={(e) => { e.stopPropagation(); moveCol(col.id, 1); }} className="p-1 text-gray-400 hover:text-[#613cbc] hover:bg-gray-200 rounded" title="Move Right"><ChevronDown className="w-3 h-3 -rotate-90" /></button>
        </div>
      </div>
    );
  })}`
);

// Extract Header mapping
const theadMatch = code.match(/<thead[^>]*>[\s\S]*?<\/thead>/);
if (theadMatch) {
  const theadCode = theadMatch[0];
  // Replace all {isCol('x') && <th...>} with a dynamic switch
  const headers = {};
  const thRegex = /\{isCol\('([^']+)'\)\s*&&\s*(<th[\s\S]*?<\/th>)\}/g;
  let match;
  while ((match = thRegex.exec(theadCode)) !== null) {
    headers[match[1]] = match[2];
  }
  
  // also grab dynamic columns
  // {dynamicColumns.map(col => isCol(col.id) && ( <th key={col.id}...>{col.label}</th> ))}
  
  const newThead = `
            <thead className="bg-gray-100/80 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input type="checkbox" checked={filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length} onChange={toggleSelectAll} className="rounded border-gray-300 text-[#613cbc] focus:ring-[#613cbc]" />
                </th>
                {columnOrder.filter(id => isCol(id)).map(colId => {
                  switch(colId) {
                    ${Object.entries(headers).map(([id, jsx]) => `case '${id}': return <React.Fragment key="${id}">${jsx.replace(/key=\{[^}]*\}/, '')}</React.Fragment>;`).join('\n                    ')}
                    default: 
                      if (colId.startsWith('custom_')) {
                        const col = allColumns.find(c => c.id === colId);
                        return <th key={colId} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 border-r border-white/50">{col?.label}</th>;
                      }
                      return null;
                  }
                })}
              </tr>
            </thead>`;
  
  code = code.replace(theadMatch[0], newThead);
}

// Extract Row mapping
const tbodyMatch = code.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
if (tbodyMatch) {
  const tbodyCode = tbodyMatch[1];
  const trMatch = tbodyCode.match(/<tr[^>]*>([\s\S]*?)<\/tr>/);
  if (trMatch) {
    const trCode = trMatch[1];
    
    // Replace all {isCol('x') && (<td...>...</td>)}
    const cells = {};
    const tdRegex = /\{isCol\('([^']+)'\)\s*&&\s*\(\s*(<td[\s\S]*?<\/td>)\s*\)\}/g;
    let match;
    while ((match = tdRegex.exec(trCode)) !== null) {
      cells[match[1]] = match[2];
    }
    // Also handle one-liners {isCol('x') && <td...>} if any
    const tdRegex2 = /\{isCol\('([^']+)'\)\s*&&\s*(<td[^>]*>[\s\S]*?<\/td>)\s*\}(?!\))/g;
    while ((match = tdRegex2.exec(trCode)) !== null) {
      cells[match[1]] = match[2];
    }
    
    // There are dynamic columns rendering:
    // {dynamicColumns.map(col => { if (isCol(col.id)) { ... return <td...>...</td> } })}
    
    const newTrCode = `
                  <td className="px-4 py-2.5">
                    <input 
                      type="checkbox" 
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => toggleSelectLead(lead.id)}
                      className="rounded border-gray-300 text-[#613cbc] focus:ring-[#613cbc]" 
                    />
                  </td>
                  {columnOrder.filter(id => isCol(id)).map(colId => {
                    switch(colId) {
                      ${Object.entries(cells).map(([id, jsx]) => `case '${id}': return <React.Fragment key="${id}">${jsx}</React.Fragment>;`).join('\n                      ')}
                      default:
                        if (colId.startsWith('custom_')) {
                          const rawKey = colId.replace('custom_', '');
                          return (
                            <td key={colId} className="px-4 py-2.5 whitespace-nowrap border-r border-gray-100 text-gray-700">
                              {lead.customFields?.[rawKey] || "-"}
                            </td>
                          );
                        }
                        return null;
                    }
                  })}
    `;
    
    const newTbody = tbodyCode.replace(trMatch[1], newTrCode);
    code = code.replace(tbodyMatch[1], newTbody);
  }
}

fs.writeFileSync('src/components/LeadsTableClient.tsx', code);
console.log('Refactoring complete.');
