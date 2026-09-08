"use server"

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createTeamMember(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!name || !email || !password || !role) {
    return { success: false, error: "All fields are required" };
  }

  // Get the default organization
  const org = await prisma.organization.findFirst();
  if (!org) {
    return { success: false, error: "Organization not found" };
  }

  try {
    // Note: In production you should hash this password using bcrypt or similar.
    // For this internal tool demo we are storing plain text until next-auth is configured.
    await prisma.user.create({
      data: {
        name,
        email,
        password,
        role,
        organizationId: org.id
      }
    });

    revalidatePath("/team");
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: "Email already exists or failed to create user." };
  }
}
