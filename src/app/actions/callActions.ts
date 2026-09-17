"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";

export async function updateCallNote(callId: string, notes: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  try {
    await prisma.callLog.update({
      where: { id: callId },
      data: { notes }
    });
    revalidatePath("/calls");
    revalidatePath("/leads");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update call note:", error);
    return { success: false, error: error.message };
  }
}

export async function logManualCall(leadId: string, durationMin: number, notes: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };
  try {
    await prisma.callLog.create({
      data: { leadId, userId: user.id, duration: durationMin * 60, notes, recordingUrl: null }
    });
    revalidatePath('/leads');
    revalidatePath('/dashboard');
    return { success: true };
  } catch(e: any) {
    return { error: e.message };
  }
}
