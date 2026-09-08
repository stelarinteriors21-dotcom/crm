
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  const userMap = {};
  users.forEach(u => { userMap[u.email] = u.id; });
  const adminOrgId = users[0].organizationId;

  const csv = fs.readFileSync('leads.csv', 'utf8').trim().split('\n');
  
  let inserted = 0;
  for (let i = 1; i < csv.length; i++) {
    const row = csv[i].split(',');
    if (row.length < 20) continue;
    
    let rawStatus = row[0];
    if (rawStatus === 'Interested') rawStatus = 'NEW';
    else if (rawStatus === 'Site Visit Scheduled') rawStatus = 'CONTACTED';
    
    const assigneeEmail = row[4];
    const name = row[5];
    const phone = row[6] !== '_' ? row[6] : '0000000000';
    const email = row[7] !== '_' ? row[7] : null;
    const source = row[9] !== '_' ? row[9].toUpperCase() : 'MANUAL';
    const city = row[10] !== '_' ? row[10] : null;
    
    let budget = row[13] !== '_' ? row[13] : null;

    const assignedToId = userMap[assigneeEmail] || null;

    await prisma.lead.create({
      data: {
        organizationId: adminOrgId,
        assignedToId,
        name,
        phone,
        email,
        source: source,
        status: rawStatus,
        city,
        budget,
        assignedStatus: assignedToId ? 'ACCEPTED' : 'UNASSIGNED',
      }
    });
    inserted++;
  }
  
  console.log('Inserted ' + inserted + ' leads.');
}

main().catch(console.error).finally(() => process.exit());

