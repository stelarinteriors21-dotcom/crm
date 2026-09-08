import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.callLog.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.whatsAppLog.deleteMany({});
  await prisma.fileAttachment.deleteMany({});
  await prisma.emailLog.deleteMany({});
  const result = await prisma.lead.deleteMany({});
  console.log(`Deleted ${result.count} leads.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
