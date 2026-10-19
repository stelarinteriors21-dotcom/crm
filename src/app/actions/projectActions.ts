"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateLeadStage(leadId: string, stage: string) {
  const existing = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!existing) throw new Error("Lead not found");

  const cf = (existing.customFields as any) || {};
  cf.projectStage = stage;

  await prisma.lead.update({
    where: { id: leadId },
    data: { customFields: cf }
  });

  revalidatePath('/projects');
}
