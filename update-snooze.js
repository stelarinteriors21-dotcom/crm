const fs = require('fs');
let code = fs.readFileSync('src/app/actions/leadActions.ts', 'utf8');

const getPendingLeadForUser = \export async function getPendingLeadForUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  
  const snoozedLead = await prisma.lead.findFirst({
    where: {
      organizationId: user.organizationId,
      assignedStatus: 'SNOOZED',
      assignedToId: user.id,
      snoozedUntil: { lte: new Date() }
    },
    orderBy: { snoozedUntil: 'asc' }
  });

  if (snoozedLead) {
    const updated = await prisma.lead.update({
      where: { id: snoozedLead.id },
      data: { assignedStatus: 'PENDING', assignedAt: new Date(), snoozedUntil: null }
    });
    if (user.fcmToken) {
      await sendPushNotification(user.fcmToken, 'Snooze Over! ?', \Time to call \\);
    }
    return updated;
  }

  const lead = await prisma.lead.findFirst({
    where: { 
      organizationId: user.organizationId,
      assignedStatus: 'PENDING',
      assignedToId: user.id
    },
    orderBy: { assignedAt: 'desc' }
  });
  
  return lead;
}\;

code = code.replace(/export async function getPendingLeadForUser\(\) \{[\s\S]*?return lead;\n  \}/, getPendingLeadForUser);

const acceptAndScheduleCall = \export async function acceptAndScheduleCall(leadId: string, minutes: number = 15) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  const snoozedUntil = new Date(Date.now() + minutes * 60000);

  await prisma.lead.update({
    where: { id: leadId },
    data: { 
      assignedStatus: 'SNOOZED', 
      assignedToId: user.id,
      snoozedUntil: snoozedUntil
    }
  });

  await prisma.task.create({
    data: {
      title: \Call scheduled in \ mins\,
      dueDate: snoozedUntil,
      status: 'PENDING',
      type: 'CALL',
      leadId: leadId,
      assignedToId: user.id,
      organizationId: user.organizationId
    }
  });
}\;

code = code.replace(/export async function acceptAndScheduleCall\\(leadId: string, minutes: number = 15\\) \\{[\\s\\S]*?organizationId: user.organizationId\\n      \\}\\n    \\}\\);\\n  \\}/, acceptAndScheduleCall);

fs.writeFileSync('src/app/actions/leadActions.ts', code);
console.log('updated leadActions');

