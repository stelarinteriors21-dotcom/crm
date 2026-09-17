const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function restore() {
  const prisma = new PrismaClient();
  const data = JSON.parse(fs.readFileSync('scratch/db_dump.json', 'utf8'));
  let successCount = 0;
  let failCount = 0;

  for (const callLog of data.callLogs) {
    try {
      // Ensure the lead and user exist
      const lead = await prisma.lead.findUnique({ where: { id: callLog.leadId } });
      const user = await prisma.user.findUnique({ where: { id: callLog.userId } });

      if (lead && user) {
        await prisma.callLog.upsert({
          where: { id: callLog.id },
          create: callLog,
          update: callLog
        });
        successCount++;
      } else {
        failCount++;
      }
    } catch (e) {
      failCount++;
      console.error(e.message);
    }
  }

  console.log(`Restored ${successCount} call logs. Failed: ${failCount}`);
}

restore().catch(console.error);
