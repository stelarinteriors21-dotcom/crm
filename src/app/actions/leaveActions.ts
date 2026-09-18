import prisma from '@/lib/prisma';
import { getCurrentUser } from './authActions';
import { revalidatePath } from 'next/cache';

export async function addLeave(startDate: string, endDate: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await prisma.leave.create({
    data: {
      userId: user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    }
  });
  revalidatePath('/');
}

export async function deleteLeave(leaveId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');

  await prisma.leave.delete({
    where: { id: leaveId, userId: user.id }
  });
  revalidatePath('/');
}

export async function getMyLeaves() {
  const user = await getCurrentUser();
  if (!user) return [];

  return await prisma.leave.findMany({
    where: { userId: user.id },
    orderBy: { startDate: 'desc' }
  });
}
