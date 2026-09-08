const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const dir = 'C:/Users/abhij/.gemini/antigravity/brain/5d682c1b-fb04-4567-9922-9e13294f15fd/scratch/LEads backup';
  
  const org = await prisma.organization.findFirst({ where: { name: 'Stelar Interiors Pvt Ltd' } });
  if (!org) {
    console.log("No organization found. Run the seed script first.");
    return;
  }
  
  const user = await prisma.user.findFirst({ where: { email: 'stelarinteriors21@gmail.com' } });
  let insertedCount = 0;

  const fullPath = path.join(dir, 'lead tracking.xlsx');
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping lead tracking.xlsx - not found`);
    return;
  }

  console.log(`Importing lead tracking.xlsx...`);
  const workbook = xlsx.readFile(fullPath);
  
  // Parse Enquiry sheet
  if (workbook.Sheets['Enquiry']) {
    const data = xlsx.utils.sheet_to_json(workbook.Sheets['Enquiry']);
    for (const row of data) {
      let name = row['Name'] || 'Unknown';
      let phone = row['Ph.No.'] ? String(row['Ph.No.']) : '';
      let city = row['Place'] || null;
      let source = row['Source'] || 'MANUAL';
      let status = row['Status'] || 'NEW';
      
      phone = phone.replace(/[^0-9]/g, ''); // strip non-numeric
      if (!phone) continue; // skip if no phone

      const exists = await prisma.lead.findFirst({ where: { phone, organizationId: org.id } });
      if (!exists) {
        await prisma.lead.create({
          data: {
            name: String(name).substring(0, 50),
            phone: phone.substring(0, 50),
            email: null,
            city: city ? String(city).substring(0, 50) : null,
            source: String(source).toUpperCase().substring(0, 50),
            status: String(status).substring(0, 50),
            budget: null,
            organizationId: org.id,
            assignedToId: user.id
          }
        });
        insertedCount++;
      }
    }
  }

  // Parse Our student Tele call sheet
  if (workbook.Sheets['Our student Tele call']) {
    const data2 = xlsx.utils.sheet_to_json(workbook.Sheets['Our student Tele call']);
    for (const row of data2) {
      let name = row['Name'] || 'Unknown';
      let phone = row['Ph.No.'] ? String(row['Ph.No.']) : '';
      let city = row['Place'] || null;
      let status = row['Status'] || 'NEW';
      
      phone = phone.replace(/[^0-9]/g, '');
      if (!phone) continue;

      const exists = await prisma.lead.findFirst({ where: { phone, organizationId: org.id } });
      if (!exists) {
        await prisma.lead.create({
          data: {
            name: String(name).substring(0, 50),
            phone: phone.substring(0, 50),
            email: null,
            city: city ? String(city).substring(0, 50) : null,
            source: 'STUDENT_CALL',
            status: String(status).substring(0, 50),
            budget: null,
            organizationId: org.id,
            assignedToId: user.id
          }
        });
        insertedCount++;
      }
    }
  }

  console.log(`Successfully imported ${insertedCount} leads from lead tracking.xlsx.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
