const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Ensure an organization exists
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Stelar Interiors' }
    });
  }

  // Upsert the admin user
  const admin = await prisma.user.upsert({
    where: { email: 'stelarinteriors21@gmail.com' },
    update: { password: 'stelar@123', role: 'ADMIN' },
    create: {
      email: 'stelarinteriors21@gmail.com',
      password: 'stelar@123',
      name: 'Stelar Admin',
      role: 'ADMIN',
      organizationId: org.id
    }
  });
  
  console.log("Admin user created/updated successfully:", admin.email);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
