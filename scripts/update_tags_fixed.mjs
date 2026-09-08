import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.lead.updateMany({
    where: { tag: "Future potential" },
    data: { tag: "Potential lead" }
  });
  console.log(`Updated ${result.count} leads.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
