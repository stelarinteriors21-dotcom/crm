"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateLeadScore(leadId: string, scores: {
  scoreEngagement: string;
  scoreLocation: string;
  scoreBudget: string;
  scoreTimeline: string;
  scoreFullHome: string;
  scoreFloorPlan: string;
  scoreMoodBoard: string;
  scoreSiteVisit: string;
  scoreQuotation: string;
}) {
  await prisma.lead.update({
    where: { id: leadId },
    data: scores,
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
}
