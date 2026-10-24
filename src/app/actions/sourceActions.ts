"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/authActions";
import { revalidatePath } from "next/cache";

const DEFAULT_SOURCES = [
  "Manual",
  "Google Ads",
  "Meta Ads",
  "Website",
  "Referral",
  "WhatsApp",
  "Instagram",
  "Walk-in"
];

export async function getCustomLeadSources(): Promise<string[]> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) return DEFAULT_SOURCES;

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { customFieldLabels: true }
    });

    const cfl = (org?.customFieldLabels as any) || {};
    const orgCustomSources: string[] = Array.isArray(cfl.customSources) ? cfl.customSources : [];

    // Distinct sources from existing leads in DB
    const distinctLeads = await prisma.lead.findMany({
      where: { organizationId: user.organizationId },
      distinct: ["source"],
      select: { source: true }
    });
    const dbSources = distinctLeads.map(l => l.source).filter(Boolean);

    // Merge and deduplicate
    const all = Array.from(new Set([...DEFAULT_SOURCES, ...orgCustomSources, ...dbSources]));
    return all;
  } catch (e) {
    console.error("Error fetching lead sources:", e);
    return DEFAULT_SOURCES;
  }
}

export async function addCustomLeadSource(sourceName: string): Promise<{ success: boolean; sources: string[]; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user || !user.organizationId) throw new Error("Unauthorized");
    if (user.role !== "ADMIN" && user.role !== "ROOT") {
      throw new Error("Only admins can add custom lead sources");
    }

    const trimmed = sourceName.trim();
    if (!trimmed) throw new Error("Source name cannot be empty");

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { customFieldLabels: true }
    });

    const cfl = (org?.customFieldLabels as any) || {};
    const currentSources: string[] = Array.isArray(cfl.customSources) ? cfl.customSources : [];

    if (!currentSources.includes(trimmed)) {
      currentSources.push(trimmed);
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          customFieldLabels: {
            ...cfl,
            customSources: currentSources
          }
        }
      });
    }

    const allSources = Array.from(new Set([...DEFAULT_SOURCES, ...currentSources]));
    revalidatePath("/add/single");
    return { success: true, sources: allSources };
  } catch (e: any) {
    console.error("Error adding custom lead source:", e);
    return { success: false, sources: DEFAULT_SOURCES, error: e.message || "Failed to add source" };
  }
}
