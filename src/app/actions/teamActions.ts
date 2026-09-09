"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/app/actions/authActions";

export async function addEmployee(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!name?.trim() || !email?.trim() || !password?.trim()) {
    return { error: "Name, email and password are required." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "A user with this email already exists." };

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role: role || "TELECALLER",
      organizationId: currentUser.organizationId,
    },
  });

  revalidatePath("/team");
  return { success: true };
}

export async function deleteEmployee(userId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Not authenticated" };
  
  if (userId === currentUser.id) {
    return { error: "Cannot delete yourself." };
  }

  try {
    // Find the admin to reassign leads to
    const admin = await prisma.user.findFirst({
      where: { organizationId: currentUser.organizationId, role: { in: ["ADMIN", "ROOT"] } },
      orderBy: { id: "asc" }
    });
    
    // We must handle relations before deleting the user.
    await prisma.$transaction([
      // Reassign leads to the admin
      prisma.lead.updateMany({
        where: { assignedToId: userId, organizationId: currentUser.organizationId },
        data: { assignedToId: admin ? admin.id : null, assignedStatus: admin ? "PENDING" : "UNASSIGNED" }
      }),
      // Delete tasks
      prisma.task.deleteMany({
        where: { userId: userId }
      }),
      // Delete call logs
      prisma.callLog.deleteMany({
        where: { userId: userId }
      }),
      // Finally, delete the user
      prisma.user.delete({
        where: { id: userId, organizationId: currentUser.organizationId },
      })
    ]);
    
    revalidatePath("/team");
    return { success: true };
  } catch (err: unknown) {
    console.error("Delete user error:", err);
    return { error: "Failed to delete user due to a database error." };
  }
}

export async function updateEmployeePassword(userId: string, newPassword: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Not authenticated" };

  if (!newPassword || newPassword.trim().length < 4) {
    return { error: "Password must be at least 4 characters long." };
  }

  const hashed = await bcrypt.hash(newPassword.trim(), 10);

  await prisma.user.update({
    where: { id: userId, organizationId: currentUser.organizationId },
    data: { password: hashed },
  });

  revalidatePath("/team");
  return { success: true };
}
