const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
async function seed() {
  const prisma = new PrismaClient();
  const data = JSON.parse(fs.readFileSync('scratch/db_dump.json', 'utf8'));
  
  // Need to clear db first or just insert if empty. It should be empty.
  console.log('Seeding organizations...');
  for (const org of data.organizations) {
    await prisma.organization.create({ data: org });
  }
  
  console.log('Seeding users...');
  for (const user of data.users) {
    await prisma.user.create({ data: user });
  }
  
  console.log('Seeding leads...');
  for (const lead of data.leads) {
    await prisma.lead.create({ data: lead });
  }

  console.log('Seeding callLogs...');
  for (const callLog of data.callLogs) {
    await prisma.callLog.create({ data: callLog });
  }

  console.log('Seeding tasks...');
  for (const task of data.tasks) {
    await prisma.task.create({ data: task });
  }
  
  console.log('Done!');
}
seed().catch(console.error);
