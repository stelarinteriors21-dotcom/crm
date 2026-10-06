const fs = require('fs');
let code = fs.readFileSync('src/app/actions/leadActions.ts', 'utf8');

const newAction = `
export async function getCallHistoryByPhone(phone: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const logs = await prisma.callLog.findMany({
    where: {
      lead: { phone, organizationId: user.organizationId }
    },
    include: {
      user: { select: { name: true } },
      lead: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  return logs;
}
`;

code += newAction;
fs.writeFileSync('src/app/actions/leadActions.ts', code);
