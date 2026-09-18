"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

import { logActivity } from "./activityActions";

export async function updateLeadScore(leadId: string, scores: {
  scoreLocation: string;
  scoreBudget: string;
  scoreTimeline: string;
  scoreSiteVisit: string;
  scoreQuotation: string;
}) {
  await prisma.lead.update({
    where: { id: leadId },
    data: scores,
  });
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  
  await logActivity("SCORE_UPDATED", `Updated lead score`);
}
import { getCurrentUser } from "./authActions";

export async function checkPendingScoreLead() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Find a lead assigned to this user that has exactly 1 call (created recently) and no score
  const leads = await prisma.lead.findMany({
    where: {
      assignedToId: user.id,
      OR: [
        { scoreLocation: "None" },
        { scoreBudget: "None" },
        { scoreTimeline: "None" }
      ]
    },
    include: {
      calls: {
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  // Filter in memory: exactly 1 call, and that call was within the last 15 minutes
  const now = Date.now();
  for (const lead of leads) {
    if (lead.calls.length === 1) {
      const callTime = lead.calls[0].createdAt.getTime();
      if (now - callTime < 15 * 60 * 1000) {
        return {
          id: lead.id,
          name: lead.name,
          scores: {
            scoreLocation: lead.scoreLocation,
            scoreBudget: lead.scoreBudget,
            scoreTimeline: lead.scoreTimeline,
            scoreSiteVisit: lead.scoreSiteVisit,
            scoreQuotation: lead.scoreQuotation,
          }
        };
      }
    }
  }
  return null;
}
