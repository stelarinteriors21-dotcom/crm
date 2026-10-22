"use server";

import prisma from "@/lib/prisma";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const cookieStore = cookies();
      const userEmail = cookieStore.get("mock_user_email")?.value;
      
      if (!userEmail) return null;

      const normalizedEmail = userEmail.toLowerCase().trim();

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          organization: true,
        },
      });

      if (!user) {
        // Check if the primary admin user exists instead of blindly recreating it
        const fallbackUser = await prisma.user.findUnique({
          where: { email: "stelarinteriors21@gmail.com" },
          include: { organization: true }
        });
        if (fallbackUser) return fallbackUser;
        return null;
      }
      
      return user;
    } catch (error) {
      console.warn(`Auth Error (attempt ${attempt + 1}/2):`, error);
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 350));
        continue;
      }
      return null;
    }
  }
  return null;
}

import { logActivity } from "./activityActions";
import bcrypt from "bcryptjs";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  if (!email || !password) return { error: "Email and password required" };
  
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  
  if (!user) return { error: "User not found with this email" };

  // Validate password against hashed or plain-text password
  let isValid = false;
  if (user.password) {
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$") || user.password.startsWith("$2y$")) {
      isValid = await bcrypt.compare(password, user.password);
    } else {
      isValid = password.trim() === user.password;
    }
  }

  if (!isValid) {
    return { error: "Incorrect password. Please try again." };
  }
  
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  cookies().set({
    name: "mock_user_email",
    value: user.email,
    path: "/",
    expires: expiresAt,
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  
  // NOTE: logActivity requires the cookie to be set first to identify the user
  await logActivity("LOGIN", "User logged in to CRM");
  
  redirect("/dashboard");
}

export async function restoreSession(email: string) {
  try {
    if (!email) return { success: false, reason: "No email provided" };
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user || user.status === "INACTIVE") {
      return { success: false, reason: "User not found or inactive" };
    }

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    cookies().set({
      name: "mock_user_email",
      value: user.email,
      path: "/",
      expires: expiresAt,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    return { success: true };
  } catch (error) {
    console.error("restoreSession error:", error);
    return { success: false, reason: "Internal error" };
  }
}

export async function logout() {
  cookies().delete("mock_user_email");
}

export async function saveFcmToken(token: string) {
  const user = await getCurrentUser();
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { fcmToken: token }
    });
    return { success: true };
  }
  return { success: false };
}

