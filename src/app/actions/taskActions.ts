"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";

export async function getTasks() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const tasks = await prisma.task.findMany({
    where: { 
      userId: user.id,
      isCompleted: false 
    },
    include: {
      lead: true
    },
    orderBy: { dueDate: 'asc' }
  });

  return tasks;
}
