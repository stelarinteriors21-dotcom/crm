"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";

export async function logEmail(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const leadId = formData.get("leadId") as string;
  const subject = formData.get("subject") as string;
  const body = formData.get("body") as string;
  // const email = formData.get("email") as string; 

  if (!leadId || !subject || !body) return { error: "Missing fields" };

  await prisma.emailLog.create({
    data: {
      leadId,
      userId: user.id,
      subject,
      body,
      direction: "OUTBOUND",
      status: "SENT"
    }
  });

  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}
