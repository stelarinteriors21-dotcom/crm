import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notifyUser } from '@/app/actions/leadActions';

const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
const META_PAGE_ID = process.env.META_PAGE_ID || '';

export async function GET(request: Request) {
  try {
    // Basic authorization check (you can use Vercel Cron Secret in production)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!META_PAGE_ACCESS_TOKEN || !META_PAGE_ID) {
      return new NextResponse('Missing Meta credentials. Need META_PAGE_ACCESS_TOKEN and META_PAGE_ID', { status: 400 });
    }

    // Only fetch leads from the last hour to prevent rate limiting
    const sinceTimestamp = Math.floor(Date.now() / 1000) - (60 * 60);

    // 1. Get all forms for the page
    const formsRes = await fetch(
      `https://graph.facebook.com/v19.0/${META_PAGE_ID}/leadgen_forms?access_token=${META_PAGE_ACCESS_TOKEN}`
    );
    const formsData = await formsRes.json();
    
    if (!formsData.data) {
      return new NextResponse('Failed to fetch forms: ' + JSON.stringify(formsData), { status: 400 });
    }

    let leadsProcessed = 0;
    let leadsAdded = 0;

    const org = await prisma.organization.findFirst();
    if (!org) return new NextResponse('No org found', { status: 400 });

    const callers = await prisma.user.findMany({
      where: { organizationId: org.id, role: "TELECALLER" },
      orderBy: { id: 'asc' }
    });

    // 2. Iterate through each form
    for (const form of formsData.data) {
      // 3. Fetch leads
      const leadsRes = await fetch(
        `https://graph.facebook.com/v19.0/${form.id}/leads?since=${sinceTimestamp}&access_token=${META_PAGE_ACCESS_TOKEN}`
      );
      const leadsData = await leadsRes.json();

      if (leadsData.data && leadsData.data.length > 0) {
        for (const lead of leadsData.data) {
          leadsProcessed++;
          
          let name = 'Unknown';
          let phone = '';
          let email = null;
          let city = null;
          
          if (lead.field_data) {
            lead.field_data.forEach((field: { name: string; values: string[] }) => {
              if (field.name === 'full_name' || field.name === 'first_name') name = field.values?.[0] || 'Unknown';
              if (field.name === 'phone_number') phone = field.values?.[0] || '';
              if (field.name === 'email') email = field.values?.[0] || null;
              if (field.name === 'city') city = field.values?.[0] || null;
            });
          }

          phone = phone.replace(/[^0-9]/g, '');

          if (phone) {
            const existingLead = await prisma.lead.findFirst({ where: { phone, organizationId: org.id } });
            
            if (!existingLead) {
              let assignedToId = null;
              if (callers.length > 0) {
                const lastLead = await prisma.lead.findFirst({
                  where: { assignedToId: { in: callers.map(c => c.id) } },
                  orderBy: { createdAt: 'desc' }
                });

                let nextIndex = 0;
                if (lastLead && lastLead.assignedToId) {
                  const lastIndex = callers.findIndex(c => c.id === lastLead.assignedToId);
                  if (lastIndex !== -1) {
                    nextIndex = (lastIndex + 1) % callers.length;
                  }
                }
                assignedToId = callers[nextIndex].id;
              }

              const createdLead = await prisma.lead.create({
                data: {
                  name,
                  phone,
                  email,
                  city,
                  source: 'META ADS',
                  status: 'Fresh',
                  fbAd: lead.campaign_name || 'Facebook Ad',
                  organizationId: org.id,
                  assignedToId,
                  assignedStatus: 'PENDING',
                  assignedAt: new Date()
                }
              });
              
              leadsAdded++;
              console.log(`Successfully ingested and assigned Meta Lead via cron: ${name} (${phone}) to caller ${assignedToId}`);

              // Trigger Push Notification!
              if (assignedToId) {
                try {
                  await notifyUser(assignedToId, 'New Lead Assigned', `You have a new Meta lead: ${name}`);
                } catch (pushErr) {
                  console.error('Failed to send push notification:', pushErr);
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, leadsProcessed, leadsAdded });
  } catch (error) {
    console.error('Error fetching Meta leads:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
