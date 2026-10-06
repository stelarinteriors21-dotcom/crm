const fs = require('fs');
let code = fs.readFileSync('src/components/LeadsTableClient.tsx', 'utf-8');

const regex = /case 'phone': return <React\.Fragment key="phone"><td className="([^"]+)">([\s\S]*?)<\/td><\/React\.Fragment>;/;
code = code.replace(regex, (match, className, inner) => {
  // Remove flex related classes from td
  const newClass = className.replace('flex items-center justify-between', '').trim();
  return `case 'phone': return <React.Fragment key="phone"><td className="${newClass}">
<div className="flex items-center justify-between">
${inner}
</div>
</td></React.Fragment>;`;
});

fs.writeFileSync('src/components/LeadsTableClient.tsx', code);
