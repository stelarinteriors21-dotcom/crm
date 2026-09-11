"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";

export async function addNote(leadId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.note.create({
    data: {
      leadId,
      content,
      userId: user.id
    }
  });

  revalidatePath(/leads/ + leadId);
}