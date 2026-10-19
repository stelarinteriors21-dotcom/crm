"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./authActions";
import { sendPushNotification } from "@/lib/firebaseAdmin";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";

const CONVERTED_STATUSES = ["Won", "Advance recieved", "Pay Pending", "WON", "ADVANCE RECIEVED", "PAY PENDING"];
const JUNK_STATUSES = ["Junk", "Lost", "Job enquiry", "just curious", "Hold", "JUNK", "LOST", "HOLD", "JOB ENQUIRY", "JUST CURIOUS"];

/**
 * Automates 24-hour timeout for Converting Stage:
 * For every lead whose status has not moved to the Converted stage from the Converting stage
 * for more than 24 hours (and its status remained the same), its status is moved to "follow up",
 * an upcoming follow-up task is created, and alerts are dispatched.
 */
export async function checkAndProcessStaleConvertingLeads(organizationId?: string) {
  try {
    const activeLeads = await prisma.lead.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: {
          notIn: [...CONVERTED_STATUSES, ...JUNK_STATUSES, "follow up", "FOLLOW UP"]
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
        notes: {
          orderBy: { createdAt: "desc" },
          take: 1
        },
        calls: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    const now = Date.now();
    const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
    const processedLeads = [];

    for (const lead of activeLeads) {
      const sLower = (lead.status || "").trim().toLowerCase();
      if (["won", "advance recieved", "pay pending", "junk", "lost", "job enquiry", "just curious", "hold", "follow up"].includes(sLower)) {
        continue;
      }

      const cf = (lead.customFields as any) || {};

      // Determine when the current status became active
      let statusTimestamp: number;
      if (cf.statusChangedAt) {
        statusTimestamp = new Date(cf.statusChangedAt).getTime();
      } else {
        const possibleTimestamps: number[] = [new Date(lead.createdAt).getTime()];
        if (cf.quotation?.timestamp) possibleTimestamps.push(new Date(cf.quotation.timestamp).getTime());
        if (cf.siteVisit?.timestamp) possibleTimestamps.push(new Date(cf.siteVisit.timestamp).getTime());
        if (cf.siteVisit?.verifiedAt) possibleTimestamps.push(new Date(cf.siteVisit.verifiedAt).getTime());
        if (lead.notes?.[0]?.createdAt) possibleTimestamps.push(new Date(lead.notes[0].createdAt).getTime());
        if (lead.calls?.[0]?.createdAt) possibleTimestamps.push(new Date(lead.calls[0].createdAt).getTime());
        statusTimestamp = Math.max(...possibleTimestamps);
      }

      const diffMs = now - statusTimestamp;

      // Has remained in converting stage without moving to converted for >= 5 hours
      if (diffMs >= FIVE_HOURS_MS) {
        const oldStatus = lead.status;
        
        // Policy: Never assign tasks or calls to system admin! Strictly target a caller (TELECALLER).
        let targetUserId: string | null = null;
        if (lead.assignedTo && lead.assignedTo.role === "TELECALLER") {
          targetUserId = lead.assignedTo.id;
        } else {
          targetUserId = lead.organization?.users?.[0]?.id || null;
        }

        // 1. Move status to "follow up"
        const updatedCustomFields = {
          ...cf,
          statusChangedAt: new Date().toISOString(),
          followUpDate: new Date().toISOString(), // Due now
          stalePreviousStatus: oldStatus,
          staleConvertingAlert: true,
          staleConvertingTriggeredAt: new Date().toISOString(),
          staleFollowUpReason: `Lead remained in '${oldStatus}' stage for >5 hours without moving to Converted.`
        };

        const updatedLead = await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: "follow up",
            customFields: updatedCustomFields
          }
        });

        // 2. Mark the follow-up as an upcoming task
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
                title: `Follow-up: ${lead.name} - Stale ${oldStatus} > 5h`,
                dueDate: new Date(Date.now() + 60 * 60 * 1000), // Due within 1 hour
                leadId: lead.id,
                userId: targetUserId,
                isCompleted: false
              }
            });
          }
        }

        // 3. Create system audit note in lead activity
        await prisma.note.create({
          data: {
            content: `[SYSTEM: Automated 5h Follow-up Triggered]\nStatus automatically moved from "${oldStatus}" to "follow up" because the lead remained in the converting stage for more than 5 hours without moving to Converted.\nFollow-up task created.`,
            leadId: lead.id,
            userId: targetUserId || lead.organizationId
          }
        });

        // 4. Send push notification if token exists
        if (lead.assignedTo?.fcmToken) {
          try {
            await sendPushNotification(
              lead.assignedTo.fcmToken,
              "Follow-up Required ⚠️",
              `Lead ${lead.name} remained in "${oldStatus}" for >5h without conversion. Moved to Follow-up!`
            );
          } catch (e) {
            console.error("Error sending push notification for stale lead:", e);
          }
        }

        processedLeads.push({
          ...updatedLead,
          stalePreviousStatus: oldStatus
        });
      }
    }

    if (processedLeads.length > 0) {
      revalidatePath("/leads");
      revalidatePath("/dashboard");
      revalidatePath("/tasks");
    }

    return processedLeads;
  } catch (error) {
    console.error("Error processing stale converting leads:", error);
    return [];
  }
}

export async function dismissStaleConvertingAlert(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { customFields: true } });
    if (!lead) return;
    const cf = (lead.customFields as any) || {};
    delete cf.staleConvertingAlert;
    await prisma.lead.update({
      where: { id: leadId },
      data: { customFields: cf }
    });
  } catch (e) {
    console.error("Error dismissing stale converting alert:", e);
  }
}

export async function recordQuotationFollowUpDone(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: { assignedTo: true }
    });
    if (!lead) return;

    const cf = (lead.customFields as any) || {};
    const updatedCustomFields = {
      ...cf,
      quotationAlertOpen: false,
      lastQuotationFollowUpAt: new Date().toISOString()
    };

    await prisma.lead.update({
      where: { id: leadId },
      data: { customFields: updatedCustomFields }
    });

    // Complete current quotation follow-up tasks
    await prisma.task.updateMany({
      where: {
        leadId,
        isCompleted: false,
        title: { contains: "Quotation Follow-up" }
      },
      data: { isCompleted: true }
    });

    // Schedule next 1-day follow-up task
    const targetUserId = lead.assignedToId || lead.organizationId;
    await prisma.task.create({
      data: {
        title: `Follow-up: ${lead.name} - Quotation Follow-up`,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24 hours
        leadId: lead.id,
        userId: targetUserId,
        isCompleted: false
      }
    });

    await prisma.note.create({
      data: {
        content: `[SYSTEM: Quotation Follow-up Recorded]\nFollow-up logged. Next daily follow-up alert scheduled in 24 hours.`,
        leadId,
        userId: targetUserId
      }
    });

    revalidatePath(`/leads/${leadId}`);
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
  } catch (e) {
    console.error("Error recording quotation follow-up:", e);
  }
}

export async function dismissRevisionAlert(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { customFields: true } });
    if (!lead) return;
    const cf = (lead.customFields as any) || {};
    cf.revisionAlertDismissedUntil = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    await prisma.lead.update({
      where: { id: leadId },
      data: { customFields: cf }
    });
    revalidatePath("/leads");
    revalidatePath("/dashboard");
  } catch (e) {
    console.error("Error dismissing revision alert:", e);
  }
}

export async function checkAndEscalateInactiveLeads(organizationId?: string) {
  try {
    const now = Date.now();
    const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
    const fortyEightHoursAgo = new Date(now - FORTY_EIGHT_HOURS_MS);

    const activeLeads = await prisma.lead.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: {
          notIn: [
            ...CONVERTED_STATUSES,
            ...JUNK_STATUSES
          ]
        }
      },
      include: {
        assignedTo: true,
        organization: true,
        calls: {
          where: {
            createdAt: { gte: fortyEightHoursAgo }
          },
          orderBy: { createdAt: "desc" },
          take: 5
        }
      }
    });

    const escalatedLeads = [];
    let transporter: any = null;

    for (const lead of activeLeads) {
      const sLower = (lead.status || "").trim().toLowerCase();
      if (["won", "advance recieved", "pay pending", "junk", "lost", "job enquiry", "just curious", "hold"].includes(sLower)) {
        continue;
      }

      const cf = (lead.customFields as any) || {};

      // 1. Determine how long the lead has been in this status
      let statusTimestamp: number;
      if (cf.statusChangedAt) {
        statusTimestamp = new Date(cf.statusChangedAt).getTime();
      } else {
        const possibleTimestamps: number[] = [new Date(lead.createdAt).getTime()];
        if (cf.quotation?.timestamp) possibleTimestamps.push(new Date(cf.quotation.timestamp).getTime());
        if (cf.siteVisit?.timestamp) possibleTimestamps.push(new Date(cf.siteVisit.timestamp).getTime());
        if (cf.siteVisit?.verifiedAt) possibleTimestamps.push(new Date(cf.siteVisit.verifiedAt).getTime());
        statusTimestamp = Math.max(...possibleTimestamps);
      }

      const timeInStatusMs = now - statusTimestamp;

      // Check if lead stayed in current status for >= 48 hours
      if (timeInStatusMs < FORTY_EIGHT_HOURS_MS) {
        // If lead was previously flagged but has moved to a new status less than 48 hours ago, clear old flag
        if (cf.inactivity48hAlert) {
          const updatedCustomFields = { ...cf };
          delete updatedCustomFields.inactivity48hAlert;
          await prisma.lead.update({
            where: { id: lead.id },
            data: { customFields: updatedCustomFields }
          });
        }
        continue;
      }

      // 2. ONLY if there are NO call logs in that 48-hour period
      if (lead.calls && lead.calls.length > 0) {
        // Call logs exist in the last 48 hours -> Caller attempted contact, DO NOT escalate!
        if (cf.inactivity48hAlert) {
          const updatedCustomFields = { ...cf };
          delete updatedCustomFields.inactivity48hAlert;
          await prisma.lead.update({
            where: { id: lead.id },
            data: { customFields: updatedCustomFields }
          });
        }
        continue;
      }

      // 3. Debounce emails: max 1 escalation email per 24 hours per lead to prevent email spam
      const lastEmailed = cf.last48hInactivityEmailedAt ? new Date(cf.last48hInactivityEmailedAt).getTime() : 0;
      const shouldSendEmail = (now - lastEmailed) >= (24 * 60 * 60 * 1000);

      const hoursInStatus = Math.floor(timeInStatusMs / (60 * 60 * 1000));
      const assigneeName = lead.assignedTo?.name || 'Unassigned / Caller Queue';
      const adminEmails = lead.organization?.escalationEmails || 'stelarinteriors21@gmail.com,shaji2222222@gmail.com';

      if (shouldSendEmail) {
        if (!transporter) {
          transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.SMTP_USER || 'shaji2222222@gmail.com',
              pass: process.env.SMTP_PASS || 'umlt zsnv cxsr kfjy'
            }
          });
        }

        const mailOptions = {
          from: `"Stelar CRM Alerts" <${process.env.SMTP_USER || 'shaji2222222@gmail.com'}>`,
          to: adminEmails,
          subject: `🚨 URGENT: 48h Inactivity Escalation - ${lead.name} (${lead.status})`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 24px 20px; text-align: center;">
                <h2 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em;">🚨 LEAD ESCALATION: 48H INACTIVITY</h2>
                <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95; font-weight: 500;">Zero call attempts logged in the last 48 hours</p>
              </div>
              <div style="padding: 24px; background-color: #ffffff;">
                <p style="font-size: 15px; line-height: 1.6; color: #374151; margin-top: 0;">
                  This lead has remained in status <span style="background-color: #fee2e2; color: #b91c1c; font-weight: 700; padding: 3px 10px; border-radius: 6px; font-size: 14px;">${lead.status}</span> for <b>${hoursInStatus} hours</b> (>48h) with <b style="color: #dc2626;">ZERO call logs</b> recorded during this period.
                </p>
                <div style="background-color: #f9fafb; border-radius: 10px; padding: 18px; margin: 20px 0; border: 1px solid #e5e7eb;">
                  <h3 style="margin-top: 0; margin-bottom: 14px; font-size: 15px; color: #111827; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Lead Summary</h3>
                  <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                    <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;"><b>Lead Name:</b></td><td style="padding: 6px 0; color: #111827; font-weight: 700;">${lead.name}</td></tr>
                    <tr><td style="padding: 6px 0; color: #6b7280;"><b>Phone Number:</b></td><td style="padding: 6px 0; color: #111827;"><a href="tel:${lead.phone}" style="color: #2563eb; text-decoration: none; font-weight: 700;">${lead.phone}</a></td></tr>
                    <tr><td style="padding: 6px 0; color: #6b7280;"><b>Current Status:</b></td><td style="padding: 6px 0; color: #dc2626; font-weight: 800;">${lead.status}</td></tr>
                    <tr><td style="padding: 6px 0; color: #6b7280;"><b>Duration in Status:</b></td><td style="padding: 6px 0; color: #111827; font-weight: 600;">${hoursInStatus} hours</td></tr>
                    <tr><td style="padding: 6px 0; color: #6b7280;"><b>Assigned Agent:</b></td><td style="padding: 6px 0; color: #111827; font-weight: 600;">${assigneeName}</td></tr>
                    <tr><td style="padding: 6px 0; color: #6b7280;"><b>Calls in Last 48h:</b></td><td style="padding: 6px 0; color: #dc2626; font-weight: 800;">0 calls logged</td></tr>
                    ${lead.city ? `<tr><td style="padding: 6px 0; color: #6b7280;"><b>City:</b></td><td style="padding: 6px 0; color: #111827;">${lead.city}</td></tr>` : ''}
                  </table>
                </div>
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
                  <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
                    <b>Action Required:</b> The assigned caller has not contacted this lead for over 48 hours. Please follow up directly or reassign to an active caller in the CRM.
                  </p>
                </div>
              </div>
              <div style="background-color: #f9fafb; padding: 14px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
                Stelar CRM Compliance System • Automated Escalation
              </div>
            </div>
          `
        };

        try {
          await transporter.sendMail(mailOptions);
        } catch (mailErr) {
          console.error(`Failed to send 48h inactivity email for lead ${lead.id}:`, mailErr);
        }
      }

      // 4. Update lead: mark as escalated (escalationLevel = 2), set customFields flags
      const updatedCustomFields = {
        ...cf,
        inactivity48hAlert: true,
        inactivity48hHours: hoursInStatus,
        inactivity48hTriggeredAt: cf.inactivity48hTriggeredAt || new Date().toISOString(),
        ...(shouldSendEmail ? { last48hInactivityEmailedAt: new Date().toISOString() } : {})
      };

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          escalationLevel: 2,
          customFields: updatedCustomFields
        }
      });

      // 5. Audit note if email was sent
      if (shouldSendEmail) {
        await prisma.note.create({
          data: {
            content: `[SYSTEM: 48-Hour Inactivity Escalation Alert Sent to Admin]\nLead has remained in status "${lead.status}" for ${hoursInStatus} hours with 0 calls logged during the last 48-hour period.\nEscalated to Admin via email.`,
            leadId: lead.id,
            userId: lead.assignedToId || lead.organizationId
          }
        });

        // 6. Push notification if assigned caller has fcmToken
        if (lead.assignedTo?.fcmToken) {
          try {
            await sendPushNotification(
              lead.assignedTo.fcmToken,
              "Lead Escalated to Admin ⚠️",
              `Lead ${lead.name} has had 0 calls in 48 hours (Status: ${lead.status}). Escalation email sent to Admin!`
            );
          } catch (e) {
            console.error("Error sending push notification for 48h inactivity:", e);
          }
        }
      }

      escalatedLeads.push(lead);
    }

    if (escalatedLeads.length > 0) {
      revalidatePath("/leads");
      revalidatePath("/dashboard");
    }

    return escalatedLeads;
  } catch (error) {
    console.error("Error checking and escalating inactive leads:", error);
    return [];
  }
}

export async function dismissInactivity48hAlert(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { customFields: true } });
    if (!lead) return;
    const cf = (lead.customFields as any) || {};
    delete cf.inactivity48hAlert;
    await prisma.lead.update({
      where: { id: leadId },
      data: { customFields: cf }
    });
    revalidatePath("/leads");
    revalidatePath("/dashboard");
  } catch (e) {
    console.error("Error dismissing 48h inactivity alert:", e);
  }
}

export async function getActionRequiredLeads() {
  const user = await getCurrentUser();
  if (!user) return [];

  // Automatically process any stale converting leads on each poll
  await checkAndProcessStaleConvertingLeads(user.organizationId);

  // Automatically check and escalate leads with >48h inactivity (0 calls in 48h)
  await checkAndEscalateInactiveLeads(user.organizationId);

  // STRICT POLICY: System Admins (ADMIN, ROOT) and non-caller staff must NEVER receive call alerts or call prompts!
  // Only callers (role === 'TELECALLER') receive call alerts.
  if (user.role !== "TELECALLER") {
    return [];
  }

  const alerts = [];

  // 1. Ghosted First Contact
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const ghostedLeads = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      assignedToId: user.id,
      assignedAt: { lte: twoHoursAgo },
      calls: { none: {} },
      status: { notIn: ["Junk", "Lost", "Won"] }
    }
  });

  for (const lead of ghostedLeads) {
    const cf = (lead.customFields as any) || {};
    const isReassigned = !!lead.previousAssigneeId || !!cf.isReassigned || !!cf.reassignedAt;
    const sLower = (lead.status || "").trim().toLowerCase();
    const isFollowUp = sLower === "follow up" || sLower === "followup";

    // Requirement: For a lead who is reassigned, no need for the alert every 2 hours if their status is not followup
    if (isReassigned && !isFollowUp) {
      continue;
    }

    alerts.push({
      type: "NO_FIRST_CALL",
      message: `You accepted ${lead.name} over 2 hours ago but haven't called them yet!`,
      lead
    });
  }

  // 2. Post-Site Visit Silence
  const activeLeads = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      assignedToId: user.id,
      status: { notIn: ["Junk", "Lost", "Won"] }
    }
  });

  for (const lead of activeLeads) {
    const cf = lead.customFields as any;
    if (cf?.siteVisit?.type === "Done" && cf.siteVisit.verifiedAt) {
      const verifiedTime = new Date(cf.siteVisit.verifiedAt).getTime();
      if (Date.now() - verifiedTime > 24 * 60 * 60 * 1000) {
        if (!["Quotation shared", "Estimated Quotation", "final Quotation", "Quotation Requested", "Revised Quotation", "Quotation without site visit", "Won", "Advance recieved", "Pay Pending"].includes(lead.status)) {
          alerts.push({
            type: "POST_SITE_VISIT",
            message: `Site visit for ${lead.name} was completed over 24 hours ago! Call them and move to Quotation phase.`,
            lead
          });
        }
      }
    }
  }

  // 3. Stale Converting Stage Leads (>5h without converting, automatically moved to follow up)
  const staleLeads = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      assignedToId: user.id,
      status: "follow up"
    }
  });

  for (const lead of staleLeads) {
    const cf = (lead.customFields as any) || {};
    if (cf.staleConvertingAlert) {
      alerts.push({
        type: "STALE_CONVERTING_5H",
        message: `5h Timeout Alert: ${lead.name} remained in "${cf.stalePreviousStatus || 'converting stage'}" for >5 hours without moving to Converted! Moved to Follow-up; task created.`,
        lead
      });
    }
  }

  // 4. Quotation Follow-up (1-day frequency) and Revision Alerts
  const quotationLeads = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      assignedToId: user.id,
      status: {
        notIn: ["Junk", "Lost", "Job enquiry", "just curious", "Hold", "Won", "Advance recieved", "Pay Pending", "JUNK", "LOST", "HOLD", "JOB ENQUIRY", "JUST CURIOUS"]
      }
    }
  });

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  for (const lead of quotationLeads) {
    const cf = (lead.customFields as any) || {};

    // Don't alert if quotation was approved or lead lost
    if (cf.quotationApproved) continue;

    // Check for Revision Requested alert
    if (cf.revisionAlertActive) {
      if (cf.revisionAlertDismissedUntil && new Date(cf.revisionAlertDismissedUntil).getTime() > Date.now()) {
        continue;
      }
      alerts.push({
        type: "QUOTATION_REVISION_REQUESTED",
        message: `Quotation Revision Alert: ${lead.name} has requested changes to their quotation! Prepare and send the revised quote promptly.`,
        lead
      });
      continue;
    }

    // Check for Quotation Follow-up alert (frequency 1 day)
    if (cf.quotationFollowUpActive) {
      const lastFollowUp = cf.lastQuotationFollowUpAt 
        ? new Date(cf.lastQuotationFollowUpAt).getTime()
        : (cf.quotationSentAt ? new Date(cf.quotationSentAt).getTime() : 0);
      
      const isDueByTime = lastFollowUp > 0 && (Date.now() - lastFollowUp >= ONE_DAY_MS);
      const isOpenImmediately = !!cf.quotationAlertOpen;

      if (isOpenImmediately || isDueByTime) {
        alerts.push({
          type: "QUOTATION_FOLLOWUP_DUE",
          message: isOpenImmediately
            ? `Quotation Follow-up: Quotation was sent to ${lead.name}. Follow up required (Daily 1-day frequency cycle active).`
            : `Quotation Follow-up Due: It has been >24 hours since quotation was sent/followed up for ${lead.name}. Call them to get feedback or approval!`,
          lead
        });
      }
    }
  }

  // 5. 48-Hour Inactivity Escalation Alert (Lead stayed in status >48h with 0 calls in 48h)
  const inactive48hLeads = await prisma.lead.findMany({
    where: {
      organizationId: user.organizationId,
      assignedToId: user.id,
      status: {
        notIn: [
          ...CONVERTED_STATUSES,
          ...JUNK_STATUSES
        ]
      }
    }
  });

  for (const lead of inactive48hLeads) {
    const cf = (lead.customFields as any) || {};
    if (cf.inactivity48hAlert) {
      alerts.push({
        type: "INACTIVITY_48H_ESCALATION",
        message: `🚨 Inactivity Escalation Alert: ${lead.name} has remained in "${lead.status}" for ${cf.inactivity48hHours || '>48'} hours with ZERO call attempts logged in the last 48 hours! Admin alerted via email.`,
        lead
      });
    }
  }

  return alerts;
}
