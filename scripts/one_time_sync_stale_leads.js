const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CONVERTED_STATUSES = ["Won", "Advance recieved", "Pay Pending", "WON", "ADVANCE RECIEVED", "PAY PENDING"];
const JUNK_STATUSES = ["Junk", "Lost", "Job enquiry", "just curious", "Hold", "JUNK", "LOST", "HOLD", "JOB ENQUIRY", "JUST CURIOUS"];
const EXCLUDED_STATUSES = [
  ...CONVERTED_STATUSES,
  ...JUNK_STATUSES,
  "follow up", "followup", "FOLLOW UP",
  "Fresh", "fresh", "FRESH",
  "PENDING", "pending",
  "new", "NEW"
];

async function main() {
  console.log("Starting one-time sync of stale active leads...");
  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  const leads = await prisma.lead.findMany({
    where: {
      status: {
        notIn: EXCLUDED_STATUSES
      }
    },
    include: {
      assignedTo: true,
      organization: {
        include: {
          users: {
            where: { role: "TELECALLER" },
            take: 5
          }
        }
      },
      calls: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      notes: {
        where: {
          content: { not: { startsWith: "[SYSTEM:" } }
        },
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  console.log(`Found ${leads.length} active converting leads to evaluate.`);

  let movedCount = 0;
  let preservedSiteVisit = 0;
  let preservedFutureFollowUp = 0;
  let preservedRecentActivity = 0;

  for (const lead of leads) {
    const sLower = (lead.status || "").trim().toLowerCase();
    const cf = (lead.customFields || {});

    // Check Case 1: Site visit scheduled today or in future
    if (lead.status === "Site visit Schedules" || lead.status === "Site visit Recheduled") {
      const svDateStr = cf.siteVisit && cf.siteVisit.date;
      if (svDateStr && cf.siteVisit.type !== "Done") {
        const svDayEnd = new Date(`${svDateStr}T23:59:59.999`).getTime();
        if (now <= svDayEnd) {
          preservedSiteVisit++;
          console.log(`Preserved Site Visit: ${lead.name} (${lead.status}, Date: ${svDateStr})`);
          continue;
        }
      }
    }

    // Check Case 2: Future follow-up scheduled by caller
    if (cf.followUpDate && new Date(cf.followUpDate).getTime() > now) {
      preservedFutureFollowUp++;
      console.log(`Preserved Future Follow-up: ${lead.name} (${lead.status}, Follow-up: ${cf.followUpDate})`);
      continue;
    }

    // Determine true last human activity timestamp
    const times = [new Date(lead.createdAt).getTime()];
    if (lead.calls && lead.calls[0]) times.push(new Date(lead.calls[0].createdAt).getTime());
    if (lead.notes && lead.notes[0]) times.push(new Date(lead.notes[0].createdAt).getTime());
    if (cf.quotation && cf.quotation.timestamp) times.push(new Date(cf.quotation.timestamp).getTime());
    if (cf.siteVisit && cf.siteVisit.verifiedAt) times.push(new Date(cf.siteVisit.verifiedAt).getTime());

    const validTimes = times.filter(t => !isNaN(t) && t > 0);
    const trueLastActivity = validTimes.length > 0 ? Math.max(...validTimes) : new Date(lead.createdAt).getTime();
    const diffMs = now - trueLastActivity;
    const diffHours = (diffMs / (60 * 60 * 1000)).toFixed(1);

    if (diffMs >= TWENTY_FOUR_HOURS_MS) {
      // Inactive for > 24 hours -> Move to follow up!
      const oldStatus = lead.status;
      let targetUserId = null;
      if (lead.assignedTo && lead.assignedTo.role === "TELECALLER") {
        targetUserId = lead.assignedTo.id;
      } else {
        targetUserId = lead.organization && lead.organization.users && lead.organization.users[0] ? lead.organization.users[0].id : null;
      }

      const updatedCustomFields = {
        ...cf,
        statusChangedAt: new Date().toISOString(),
        followUpDate: new Date().toISOString(),
        stalePreviousStatus: oldStatus,
        staleConvertingAlert: true,
        staleConvertingTriggeredAt: new Date().toISOString(),
        staleFollowUpReason: `Lead remained in '${oldStatus}' for >24 hours.`
      };

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "follow up",
          customFields: updatedCustomFields
        }
      });

      if (targetUserId) {
        const existingTask = await prisma.task.findFirst({
          where: {
            leadId: lead.id,
            isCompleted: false
          }
        });

        if (!existingTask) {
          await prisma.task.create({
            data: {
              title: `Follow-up: ${lead.name} - ${oldStatus} > 24h`,
              dueDate: new Date(Date.now() + 60 * 60 * 1000),
              leadId: lead.id,
              userId: targetUserId,
              isCompleted: false
            }
          });
        }
      }

      await prisma.note.create({
        data: {
          content: `[SYSTEM: Automated 24h Follow-up Triggered]\nStatus automatically moved from "${oldStatus}" to "follow up" because the lead remained in "${oldStatus}" for >24 hours.\nFollow-up task created.`,
          leadId: lead.id,
          userId: targetUserId || lead.organizationId
        }
      });

      movedCount++;
      console.log(`Moved to Follow-up: ${lead.name} (Was: ${oldStatus}, Inactive: ${diffHours}h)`);
    } else {
      // Recent human activity within last 24h -> Preserve in current status and sync statusChangedAt
      preservedRecentActivity++;
      console.log(`Preserved (Activity < 24h): ${lead.name} (${lead.status}, Inactive: ${diffHours}h)`);
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          customFields: {
            ...cf,
            statusChangedAt: new Date(trueLastActivity).toISOString()
          }
        }
      });
    }
  }

  console.log("\nSync Summary:");
  console.log(`- Successfully moved to Follow-up: ${movedCount}`);
  console.log(`- Preserved active Site Visits: ${preservedSiteVisit}`);
  console.log(`- Preserved future Follow-ups: ${preservedFutureFollowUp}`);
  console.log(`- Preserved recent activity (<24h): ${preservedRecentActivity}`);
  console.log("One-time sync complete!");
}

main()
  .catch(err => {
    console.error("Sync error:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
