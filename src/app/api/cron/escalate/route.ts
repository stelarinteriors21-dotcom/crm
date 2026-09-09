import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import nodemailer from 'nodemailer';

// Remove dynamic force-dynamic if not needed, but for cron it's good
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // We only want to process leads that have been PENDING for > 20 minutes
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

    if (ignoredLeads.length === 0) {
      return NextResponse.json({ message: 'No ignored leads found.' });
    }

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER || 'shaji2222222@gmail.com',
        pass: process.env.SMTP_PASS || 'umlt zsnv cxsr kfjy'
      }
    });

    // Email recipients (Root Admins)
    const adminEmails = [
      'stelarinteriors21@gmail.com', // Primary Admin
      'shaji2222222@gmail.com'       // Testing/Fallback Admin
    ];

    let emailedCount = 0;

    for (const lead of ignoredLeads) {
      // 1. Send Email
      const assigneeName = lead.assignedTo?.name || 'Unknown Agent';
      const mailOptions = {
        from: `"Stelar CRM Alerts" <${process.env.SMTP_USER || 'shaji2222222@gmail.com'}>`,
        to: adminEmails.join(','),
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
