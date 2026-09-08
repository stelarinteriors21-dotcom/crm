"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";

export async function addFileAttachment(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const leadId = formData.get("leadId") as string;
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;

  if (!leadId || !name || !url) return { error: "Missing fields" };

  await prisma.fileAttachment.create({
    data: {
      leadId,
      userId: user.id,
      name,
      url,
      type: "LINK"
    }
  });

  revalidatePath(`/leads/${leadId}`);
  return { success: true };
}
