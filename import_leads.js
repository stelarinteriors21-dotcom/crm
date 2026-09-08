const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const org = await prisma.organization.findFirst() || await prisma.organization.create({ data: { name: "Imported Org" } });
  
  const files = [
    'd:\\cattle\\telecrm-clone\\LEads backup\\old\\Lead Listing 31-08-2026 dzylo.xlsx',
    'd:\\cattle\\telecrm-clone\\LEads backup\\old\\Leads_2026_08_31 zoho.xlsx',
    'd:\\cattle\\telecrm-clone\\LEads backup\\old\\soniyaleads1-31-Aug-2026_22_49_48.xlsx',
    'd:\\cattle\\telecrm-clone\\LEads backup\\lead tracking.xlsx'
  ];

  let totalImported = 0;

  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.log('Skipping missing file:', file);
      continue;
    }
    
    console.log(`Processing ${path.basename(file)}...`);
    const workbook = xlsx.readFile(file);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    const leadsToInsert = [];

    for (const row of data) {
      // Try to find name and phone in common variations
      const rowStr = JSON.stringify(row).toLowerCase();
      
      let name = row['Name'] || row['name'] || row['Full Name'] || row['Lead Name'] || row['Contact Name'] || 'Unknown';
      let phone = row['Phone'] || row['phone'] || row['Mobile'] || row['Contact Number'] || row['Phone Number'] || '';
      let source = row['Source'] || row['source'] || row['Lead Source'] || path.basename(file, '.xlsx');

      if (!phone) {
        // Fallback: Just grab any value that looks like a 10+ digit number
        for (const val of Object.values(row)) {
          const str = String(val).replace(/[^0-9]/g, '');
          if (str.length >= 10) {
            phone = str;
            break;
          }
        }
      }

      if (phone) {
        // basic cleanup
        phone = String(phone).replace(/[^0-9+]/g, '');
        leadsToInsert.push({
          name: String(name).trim().substring(0, 255),
          phone: phone.substring(0, 20),
          source: String(source).trim().substring(0, 100),
          status: 'NEW',
          organizationId: org.id
        });
      }
    }

    if (leadsToInsert.length > 0) {
      // Insert individually to handle SQLite unique constraints
      for (const lead of leadsToInsert) {
        try {
          await prisma.lead.create({ data: lead });
        } catch (e) {
          // Ignore duplicate phone errors
        }
      }
      totalImported += leadsToInsert.length;
      console.log(`-> Processed ${leadsToInsert.length} leads.`);
    }
  }

  console.log(`\nImport complete! Total leads inserted: ${totalImported}`);
  await prisma.$disconnect();
}

run().catch(console.error);
