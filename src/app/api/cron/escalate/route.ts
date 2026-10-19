import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { sendPushNotification } from '@/lib/firebaseAdmin';
import { checkAndEscalateInactiveLeads } from '@/app/actions/alertActions';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 0. Automated 48-Hour Inactivity Escalation (Alerts admin via email if lead stays in RNR, follow up, Fresh, etc. > 48h with 0 calls in 48h)
    const inactiveEscalated = await checkAndEscalateInactiveLeads();

    // 1. Wake up SNOOZED leads whose time is up
    const wakeLeads = await prisma.lead.findMany({
      where: {
        assignedStatus: 'SNOOZED',
        snoozedUntil: { lte: new Date() }
      },
      include: { assignedTo: true }
    });

    let wokeCount = 0;
    for (const lead of wakeLeads) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          assignedStatus: 'PENDING',
          assignedAt: new Date(),
          snoozedUntil: null,
          escalationLevel: 0
        }
      });
      wokeCount++;
      if (lead.assignedTo?.fcmToken) {
        await sendPushNotification(lead.assignedTo.fcmToken, "Snooze Over! ⏰", `Time to call ${lead.name}`);
      }
    }

    // 2. We only want to process leads that have been PENDING for > 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const ignoredLeads = await prisma.lead.findMany({
      where: {
        assignedStatus: 'PENDING',
        assignedAt: { lte: tenMinutesAgo },
        escalationLevel: { lt: 2 } // 0 = unescalated, 1 = warning, 2 = admin alert via email
      },
      include: {
        assignedTo: true
      }
    });

    // 3. Check for missed follow-ups (overdue by more than 8 hours, basically missed for the day)
    const activeFollowUps = await prisma.lead.findMany({
      where: {
        status: "follow up",
        escalationLevel: { lt: 2 },
        assignedToId: { not: null }
      },
      include: {
        assignedTo: true
      }
    });

    const nowTime = Date.now();
    for (const lead of activeFollowUps) {
      const cf = lead.customFields as any;
      if (cf && cf.followUpDate) {
        const fTime = new Date(cf.followUpDate).getTime();
        // Overdue by > 8 hours (28800000 ms)
        if (nowTime - fTime > 8 * 60 * 60 * 1000) {
          (lead as any).isMissedFollowUp = true;
          ignoredLeads.push(lead);
        }
      }
    }


    // 4. Check for Endless Follow-up (>= 5 follow ups without moving forward)
    const allActiveLeads = await prisma.lead.findMany({
      where: {
        escalationLevel: { lt: 2 },
        assignedToId: { not: null },
        status: { notIn: ["JUNK", "LOST", "WON"] }
      },
      include: { assignedTo: true }
    });

    const nowTime2 = Date.now();
    for (const lead of allActiveLeads) {
      const cf = (lead.customFields as any) || {};
      let needsEscalation = false;
      let reason = "";

      // Rule 1: Endless Follow Up
      if (cf.followUpCount >= 5 && lead.status === "follow up") {
        needsEscalation = true;
        reason = "Endless Follow-up Trap (>= 5 follow-ups)";
      }

      // Rule 4: Unverified Site Visit (> 4 hours)
      if (cf.siteVisit && (cf.siteVisit.type === "Scheduled" || cf.siteVisit.type === "Rescheduled") && cf.siteVisit.date && cf.siteVisit.time) {
        const svTime = new Date(`${cf.siteVisit.date}T${cf.siteVisit.time}`).getTime();
        if (nowTime2 - svTime > 4 * 60 * 60 * 1000) {
          needsEscalation = true;
          reason = "Unverified Site Visit (> 4 hours passed)";
        }
      }

      // Rule 3: Post-Site Visit Silence (> 48 hours without advancing status)
      if (cf.siteVisit && cf.siteVisit.type === "Done" && cf.siteVisit.verifiedAt) {
        const verifiedTime = new Date(cf.siteVisit.verifiedAt).getTime();
        if (nowTime2 - verifiedTime > 48 * 60 * 60 * 1000) {
          if (!["Quotation shared", "Estimated Quotation", "final Quotation", "Quotation Requested", "Revised Quotation", "Negotiation", "Won"].includes(lead.status)) {
            needsEscalation = true;
            reason = "Post-Site Visit Silence (> 48h with no Quotation)";
          }
        }
      }

      if (needsEscalation) {
        (lead as any).customEscalationReason = reason;
        ignoredLeads.push(lead);
      }
    }

    if (ignoredLeads.length === 0 && wakeLeads.length === 0) {
      return NextResponse.json({ 
        message: 'No ignored, snoozed, or missed follow-up leads found.',
        inactive48hEscalatedCount: inactiveEscalated.length 
      });
    }

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER || 'shaji2222222@gmail.com',
        pass: process.env.SMTP_PASS || 'umlt zsnv cxsr kfjy'
      }
    });

    let emailedCount = 0;

    for (const lead of ignoredLeads) {
      // Get org emails
      const org = lead.assignedTo?.organizationId 
        ? await prisma.organization.findUnique({ where: { id: lead.assignedTo.organizationId } })
        : await prisma.organization.findFirst();

      const adminEmails = org?.escalationEmails || 'stelarinteriors21@gmail.com,shaji2222222@gmail.com';

      // 1. Send Email
      const assigneeName = lead.assignedTo?.name || 'Unknown Agent';
      const isFollowUp = (lead as any).isMissedFollowUp;

      const mailOptions = {
        from: `"Stelar CRM Alerts" <${process.env.SMTP_USER || 'shaji2222222@gmail.com'}>`,
        to: adminEmails,
        subject: (lead as any).customEscalationReason 
          ? `🚨 URGENT: Workflow Violation by ${assigneeName}!`
          : isFollowUp 
          ? `🚨 URGENT: Follow-Up Missed by ${assigneeName} (Overdue)!`
          : `🚨 URGENT: Lead Ignored by ${assigneeName} for > 10 Mins!`,
        html: `
          <h2 style="color: #d93025;">Lead Escalation Alert</h2>
          <p>${(lead as any).customEscalationReason ? 
            `<b>Reason:</b> ${(lead as any).customEscalationReason}` : 
            isFollowUp ? 
            'The following lead was scheduled for a <b>follow-up</b> that is now overdue by more than 8 hours (Missed for the day!).' : 
            'The following lead was assigned over 10 minutes ago, but they have not accepted, passed, or snoozed it.'}</p>
          <hr/>
          <h3>Lead Details:</h3>
          <ul>
            <li><b>Name:</b> ${lead.name}</li>
            <li><b>Phone:</b> ${lead.phone}</li>
            <li><b>City:</b> ${lead.city || 'N/A'}</li>
            <li><b>Property Status:</b> ${lead.propertyStatus || 'N/A'}</li>
            <li><b>Assigned To:</b> ${assigneeName}</li>
          </ul>
          <p>Please log in to the CRM dashboard to reassign or handle this lead manually.</p>
        `
      };

      await transporter.sendMail(mailOptions);
      emailedCount++;

      // 2. Mark lead as escalated to level 2 and optionally unassign if it's a missed follow up
      const updateData: any = { escalationLevel: 2 };
      if (isFollowUp) {
        updateData.assignedToId = null; // Strip from caller
        updateData.assignedStatus = 'PENDING';
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: updateData
      });
    }

    return NextResponse.json({ 
      message: `Successfully escalated ${emailedCount} leads via email. 48h Inactivity escalated: ${inactiveEscalated.length}.`,
      emailedCount,
      inactive48hEscalatedCount: inactiveEscalated.length
    });

  } catch (error) {
    console.error('Escalation Cron Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
