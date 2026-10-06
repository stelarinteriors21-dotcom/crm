const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  const allLogs = await prisma.callLog.findMany({
    orderBy: { createdAt: 'asc' }
  });
  
  let deleted = 0;
  for (let i = 0; i < allLogs.length; i++) {
    for (let j = i + 1; j < allLogs.length; j++) {
      const a = allLogs[i];
      const b = allLogs[j];
      
      if (
        a.leadId === b.leadId && 
        a.duration === b.duration && 
        a.notes === b.notes &&
        Math.abs(new Date(b.createdAt) - new Date(a.createdAt)) < 10 * 60 * 1000
      ) {
        console.log('Found duplicate:', b.id, 'for lead', b.leadId);
        try {
          await prisma.callLog.delete({ where: { id: b.id } });
          deleted++;
        } catch (e) { }
      }
    }
  }
  console.log('Cleaned up', deleted, 'duplicates.');
}
clean().then(() => process.exit(0));
