const fs = require('fs');
let code = fs.readFileSync('src/app/actions/leadActions.ts', 'utf8');

const newAction = `
export async function completeSiteVisit(taskId: string, leadId: string, noteContent: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  
  await prisma.note.create({
    data: {
      content: "[Site Visit Completed]: " + noteContent,
      leadId,
      userId: user.id
    }
  });
  
  await prisma.task.update({
    where: { id: taskId },
    data: { isCompleted: true }
  });
  
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  revalidatePath('/leads/' + leadId);
}
`;

code += newAction;
fs.writeFileSync('src/app/actions/leadActions.ts', code);
