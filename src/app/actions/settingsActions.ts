"use server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/authActions";
import { revalidatePath } from "next/cache";

export async function getOrganizationSettings() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;
  
  return prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { escalationEmails: true, customFieldLabels: true }
  });
}

export async function updateEscalationEmails(emails: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) throw new Error("Unauthorized");
  
  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { escalationEmails: emails }
  });
  
  revalidatePath('/settings');
  return { success: true };
}

export async function updateCustomFieldLabels(labels: Record<string, string>) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) throw new Error("Unauthorized");
  
  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { customFieldLabels: labels }
  });
  
  revalidatePath('/settings');
  return { success: true };
}
