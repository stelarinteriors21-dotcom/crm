"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";
import { checkAndProcessStaleConvertingLeads } from "./alertActions";

export async function getTasks() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  // Ensure any stale converting leads have follow-up tasks created
  await checkAndProcessStaleConvertingLeads(user.organizationId);

  const isAdmin = user.role === "ADMIN" || user.role === "ROOT";

  const tasks = await prisma.task.findMany({
    where: { 
      ...(isAdmin 
          ? (user.role === 'ROOT' ? {} : { lead: { organizationId: user.organizationId } }) 
          : { OR: [{ userId: user.id }, { lead: { assignedToId: user.id } }] }),
      isCompleted: false 
    },
    include: {
      lead: true
    },
    orderBy: { dueDate: 'asc' }
  });

  return tasks;
}
