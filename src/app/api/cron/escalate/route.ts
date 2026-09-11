import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { sendPushNotification } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {


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

    // 2. We only want to process leads that have been PENDING for > 20 minutes
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

    const ignoredLeads = await prisma.lead.findMany({
      where: {
        assignedStatus: 'PENDING',
        assignedAt: { lte: twentyMinutesAgo },
        escalationLevel: { lt: 2 } // 0 = unescalated, 1 = warning, 2 = admin alert via email
      },
      include: {
        assignedTo: true
      }
    });

    if (ignoredLeads.length === 0 && wakeLeads.length === 0) {
      return NextResponse.json({ message: 'No ignored or snoozed leads found.' });
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
      const mailOptions = {
        from: `"Stelar CRM Alerts" <${process.env.SMTP_USER || 'shaji2222222@gmail.com'}>`,
        to: adminEmails,
        subject: `🚨 URGENT: Lead Ignored by ${assigneeName} for > 20 Mins!`,
        html: `
          <h2 style="color: #d93025;">Lead Escalation Alert</h2>
          <p>The following lead was assigned to <b>${assigneeName}</b> over 20 minutes ago, but they have not accepted, passed, or snoozed it.</p>
          <hr/>
          <h3>Lead Details:</h3>
          <ul>
            <li><b>Name:</b> ${lead.name}</li>
            <li><b>Phone:</b> ${lead.phone}</li>
            <li><b>City:</b> ${lead.city || 'N/A'}</li>
            <li><b>Property Status:</b> ${lead.propertyStatus || 'N/A'}</li>
            <li><b>Source:</b> ${lead.source}</li>
            <li><b>Assigned At:</b> ${new Date(lead.assignedAt || lead.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</li>
          </ul>
          <br/>
          <p>Please log in to the Stelar CRM Dashboard to manually re-assign this lead.</p>
        `
      };

      await transporter.sendMail(mailOptions);
      emailedCount++;

      // 2. Mark lead as escalated to level 2 so we don't spam the email every 5 minutes
      await prisma.lead.update({
        where: { id: lead.id },
        data: { escalationLevel: 2 }
      });
    }

    return NextResponse.json({ message: `Successfully escalated ${emailedCount} leads via email.` });

  } catch (error) {
    console.error('Escalation Cron Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
