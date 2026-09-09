import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function reassignLeads() {
  console.log("Starting reassignment...");

  // Get all telecallers
  const callers = await prisma.user.findMany({
    where: { role: "TELECALLER" },
    orderBy: { id: "asc" }
  });

  if (callers.length === 0) {
    console.error("No telecallers found!");
    process.exit(1);
  }

  console.log(`Found ${callers.length} telecallers:`, callers.map(c => c.name).join(", "));

  // Get all pending leads
  const pendingLeads = await prisma.lead.findMany({
    where: { assignedStatus: "PENDING", source: "META ADS" },
    orderBy: { createdAt: "desc" }
  });

  console.log(`Found ${pendingLeads.length} pending Meta leads to distribute.`);

  let updates = 0;
  for (let i = 0; i < pendingLeads.length; i++) {
    const lead = pendingLeads[i];
    const assignee = callers[i % callers.length]; // Round-robin

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        assignedToId: assignee.id,
        assignedStatus: "ACCEPTED", // Bypass the accept queue
        assignedAt: new Date()
      }
    });
    updates++;
  }

  console.log(`Successfully distributed and force-accepted ${updates} leads among the sales team!`);
}

reassignLeads()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

