const fs = require('fs');
let code = fs.readFileSync('src/components/LeadsTableClient.tsx', 'utf8');

// Remove from BASE_COLUMNS
code = code.replace(/\{ id: "propertyStatus"[^}]+\},\n?/g, '');
code = code.replace(/\{ id: "captureFrequency"[^}]+\},\n?/g, '');
code = code.replace(/\{ id: "rating"[^}]+\},\n?/g, '');

// Remove from switch cases
code = code.replace(/case 'propertyStatus':[^;]+;\n?/g, '');

fs.writeFileSync('src/components/LeadsTableClient.tsx', code);
