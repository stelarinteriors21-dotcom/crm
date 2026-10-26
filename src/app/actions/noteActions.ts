"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";

export async function addNote(leadId: string, content: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const newNote = await prisma.note.create({
    data: {
      leadId,
      content,
      userId: user.id
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    }
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/site-visits');
  return newNote;
}

export async function getLeadNotes(leadId: string) {
  const user = await getCurrentUser();
  if (!user) return [];
  return prisma.note.findMany({
    where: { leadId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}