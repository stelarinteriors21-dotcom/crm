"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { revalidatePath } from "next/cache";

export async function addLeaveForUser(targetUserId: string, startDate: string, endDate: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ROOT")) {
    throw new Error("Admin privileges required to mark leaves.");
  }

  // Ensure target user belongs to same organization
  const targetUser = await prisma.user.findFirst({
    where: { 
      id: targetUserId, 
      organizationId: currentUser.organizationId 
    }
  });

  if (!targetUser) {
    throw new Error("User not found in your organization.");
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  if (start > end) {
    throw new Error("Start date cannot be after end date.");
  }

  await prisma.leave.create({
    data: {
      userId: targetUserId,
      startDate: start,
      endDate: end,
    }
  });

  revalidatePath("/");
  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteLeave(leaveId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ROOT")) {
    throw new Error("Admin privileges required to remove leaves.");
  }

  const leave = await prisma.leave.findUnique({
    where: { id: leaveId },
    include: { user: true }
  });

  if (!leave || leave.user.organizationId !== currentUser.organizationId) {
    throw new Error("Leave record not found.");
  }

  await prisma.leave.delete({
    where: { id: leaveId }
  });

  revalidatePath("/");
  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getTeamLeavesData() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "ROOT")) {
    throw new Error("Admin privileges required.");
  }

  const orgId = currentUser.organizationId;

  // 1. Get all users in the organization
  const users = await prisma.user.findMany({
    where: { organizationId: orgId },
    select: { 
      id: true, 
      name: true, 
      role: true, 
      email: true 
    },
    orderBy: { name: "asc" }
  });

  const userIds = users.map(u => u.id);

  // 2. Get all leave records for these users
  const leaves = await prisma.leave.findMany({
    where: { userId: { in: userIds } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          email: true
        }
      }
    },
    orderBy: { startDate: "desc" }
  });

  return { users, leaves };
}

// Backward compatibility (read-only for current user if ever queried)
export async function getMyLeaves() {
  const user = await getCurrentUser();
  if (!user) return [];

  return await prisma.leave.findMany({
    where: { userId: user.id },
    orderBy: { startDate: "desc" }
  });
}

export async function addLeave(userIdOrStart: string, startOrEnd: string, maybeEnd?: string) {
  if (maybeEnd) {
    return addLeaveForUser(userIdOrStart, startOrEnd, maybeEnd);
  }
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return addLeaveForUser(user.id, userIdOrStart, startOrEnd);
}
