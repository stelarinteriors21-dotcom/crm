import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

// These should be set in your .env file
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'telecrm_meta_secure_token_2026';

// 1. Webhook Verification (GET)
// Meta will send a GET request here when you configure the webhook in the App Dashboard.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

// 2. Receiving Lead Data (POST)
// Meta will send a POST request whenever a new lead is generated.
export async function POST(request: Request) {
  // Read env vars inside the function so Vercel doesn't cache them as empty at build time!
  const META_APP_SECRET = process.env.META_APP_SECRET || '';
  const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
  
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Security Check: Verify Payload Signature
    // if (META_APP_SECRET && signature) {
    //   const expectedSignature = `sha256=${crypto.createHmac('sha256', META_APP_SECRET).update(rawBody).digest('hex')}`;
    //   if (signature !== expectedSignature) {
    //     console.error('Invalid signature');
    //     return new NextResponse('Invalid signature', { status: 401 });
    //   }
    // }

    const body = JSON.parse(rawBody);
    console.log('Webhook body object:', body.object);

    if (body.object === 'page') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value.item === 'leadgen') {
            const leadgenId = change.value.leadgen_id;
            console.log('Processing leadgen_id:', leadgenId);
            
            // 3. Fetch the actual lead details from Meta Graph API
            if (META_PAGE_ACCESS_TOKEN) {
              console.log('META_PAGE_ACCESS_TOKEN is present, fetching Graph API...');
              const leadResponse = await fetch(`https://graph.facebook.com/v19.0/${leadgenId}?access_token=${META_PAGE_ACCESS_TOKEN}`);
              const leadData = await leadResponse.json();
              console.log('Graph API Response:', JSON.stringify(leadData));
              
              if (leadData.field_data) {
                console.log('Field data found, extracting fields...');
                // Extract fields dynamically (Meta returns them as an array of name/value pairs)
                let name = 'Unknown';
                let phone = '';
                let email = null;
                let city = null;
                let propertyStatus = null;
                
                leadData.field_data.forEach((field: { name: string; values: string[] }) => {
                  if (field.name === 'full_name' || field.name === 'first_name') name = field.values?.[0] || 'Unknown';
                  if (field.name === 'phone_number') phone = field.values?.[0] || '';
                  if (field.name === 'email') email = field.values?.[0] || null;
                  if (field.name === 'city') city = field.values?.[0] || null;
                  if (field.name === 'property_status' || field.name === 'status_of_property') propertyStatus = field.values?.[0] || null;
                });

                // Clean phone number
                phone = phone.replace(/[^0-9]/g, '');

                if (phone) {
                  // Get Org (Assuming single tenant for now)
                  const org = await prisma.organization.findFirst();
                  
                  if (org) {
                    // Check if lead exists
                    const existingLead = await prisma.lead.findFirst({ where: { phone, organizationId: org.id } });
                    
                    if (!existingLead) {
                      // Round-robin auto assignment across telecallers
                      const callers = await prisma.user.findMany({
                        where: { organizationId: org.id, role: "TELECALLER" },
                        orderBy: { id: 'asc' }
                      });

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
                          propertyStatus,
                          source: 'META ADS',
                          status: 'Fresh',
                          fbAd: leadData.campaign_name || 'Facebook Ad',
                          organizationId: org.id,
                          assignedToId,
                          assignedStatus: 'PENDING',
                          assignedAt: new Date()
                        }
                      });
                      console.log(`Successfully ingested and assigned Meta Lead: ${name} (${phone}) to caller ${assignedToId}`);

                      // Trigger Push Notification!
                      if (assignedToId) {
                        try {
                          const { notifyUser } = require('@/app/actions/leadActions');
                          await notifyUser(assignedToId, 'New Lead Assigned', `You have a new Meta lead: ${name}`);
                        } catch (pushErr) {
                          console.error('Failed to send push notification:', pushErr);
                        }
                      }
                    }
                  }
                }
              }
            } else {
              console.log('Received leadgen webhook, but META_PAGE_ACCESS_TOKEN is not set. Lead ID:', leadgenId);
            }
          }
        }
      }
      return new NextResponse('EVENT_RECEIVED', { status: 200 });
    }

    return new NextResponse('Not Found', { status: 404 });
  } catch (error) {
    console.error('Error processing Meta webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
