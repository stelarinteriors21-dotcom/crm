"use server";

import prisma from "@/lib/prisma";

import { cookies } from "next/headers";

export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const userEmail = cookieStore.get("mock_user_email")?.value;
    
    if (!userEmail) return null;

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        organization: true,
      },
    });

    if (!user) {
      // If the user doesn't exist yet, we should create the initial org and user.
      // This helps with cold starts.
      const org = await prisma.organization.create({
        data: { name: "Stelar Interiors Pvt Ltd" }
      });
      
      const newUser = await prisma.user.create({
        data: {
          email: "stelarinteriors21@gmail.com",
          name: "Stelar Interiors",
          password: "mockpassword",
          organizationId: org.id
        },
        include: { organization: true }
      });
      return newUser;
    }
    
    return user;
  } catch (error) {
    console.error("Auth Error:", error);
    return null;
  }
}

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
      isValid = password === user.password;
    }
  }

  if (!isValid) {
    return { error: "Incorrect password. Please try again." };
  }
  
  cookies().set("mock_user_email", user.email, { 
    path: "/", 
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });
  return { success: true };
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

