const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Create or get organization
  let org = await prisma.organization.findFirst({ where: { name: 'Stelar Interiors Pvt Ltd' } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: 'Stelar Interiors Pvt Ltd' } });
  }

  // 2. Create users
  const users = [
    { email: 'stelarinteriors21@gmail.com', name: 'Stelar Interiors', role: 'ADMIN' },
    { email: 'shilpastelar@gmail.com', name: 'Shilpa', role: 'CALLER' },
    { email: 'zulvathstelar@gmail.com', name: 'Zulvath', role: 'CALLER' },
  ];

  const dbUsers = {};
  for (const u of users) {
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          password: 'mock',
          organizationId: org.id
        }
      });
    }
    dbUsers[u.name] = user;
  }

  // 3. Create leads
  const leadsData = [
    { name: "Vysakh ravi", status: "Interested", source: "FACEBOOK", budget: "₹5l-₹10l", city: "Thiruvananthapuram", email: "mailvysakh@gmail.com", fbAd: "Stelar Interiors | onam c...", phone: "919895312827", assignedToId: dbUsers["Zulvath"].id },
    { name: "Rakesh Patil", status: "RNR", source: "FACEBOOK", budget: "₹1l-₹5l", city: "Dhule", fbAd: "Malayalam - Quote differ...", phone: "918482971952", assignedToId: dbUsers["Zulvath"].id },
    { name: "SREEJITH", status: "Job Enquiries", source: "MANUAL", phone: "918590184057", assignedToId: dbUsers["Shilpa"].id },
    { name: "NOUSHAD", status: "RNR", source: "MANUAL", phone: "919947035665", assignedToId: dbUsers["Shilpa"].id },
  ];

  for (const l of leadsData) {
    const exists = await prisma.lead.findFirst({ where: { phone: l.phone } });
    if (!exists) {
      await prisma.lead.create({
        data: {
          ...l,
          organizationId: org.id
        }
      });
    }
  }
  
  // 4. Create tasks
  const testLead = await prisma.lead.findFirst({ where: { phone: "919895312827" } });
  if (testLead) {
    const taskExists = await prisma.task.findFirst({ where: { leadId: testLead.id } });
    if (!taskExists) {
      await prisma.task.create({
        data: {
          title: "Follow up call",
          dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday (late)
          leadId: testLead.id,
          userId: dbUsers["Zulvath"].id
        }
      });
    }
  }

  console.log('Database seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
