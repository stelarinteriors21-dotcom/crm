"use server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/authActions";
import { revalidatePath } from "next/cache";

export async function getOrganizationSettings() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;
  
  return prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { escalationEmails: true, customFieldLabels: true, customTags: true }
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
export async function updateCustomTags(tags: any[]) { 
  const user = await getCurrentUser(); 
  if (!user || !user.organizationId) throw new Error('Unauthorized'); 
  await prisma.organization.update({ 
    where: { id: user.organizationId }, 
    data: { customTags: tags } 
  }); 
  revalidatePath('/settings');
  revalidatePath('/leads');
  return { success: true }; 
}

export async function addCustomTag(tagName: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) throw new Error('Unauthorized');
  
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { customTags: true }
  });
  
  const currentTags: any[] = (org?.customTags as any[]) || [];
  if (currentTags.find(t => t.name.toLowerCase() === tagName.toLowerCase())) {
    return { success: false, error: "Tag already exists" };
  }
  
  // assign random pleasant color
  const colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
  const newTags = [...currentTags, { name: tagName, color: randomColor }];
  
  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { customTags: newTags }
  });
  
  revalidatePath('/settings');
  revalidatePath('/leads');
  return { success: true, color: randomColor };
}
