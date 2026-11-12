import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { getMetaGraphBaseUrl, ingestMetaLead } from '@/lib/metaFormService';

// These should be set in your .env file
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'stelar_meta_secure_token_2026';

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
          if (change.field === 'leadgen') {
            const leadgenId = change.value.leadgen_id;
            const webhookFormId = change.value.form_id ? String(change.value.form_id) : undefined;
            console.log('Processing leadgen_id:', leadgenId, 'form_id:', webhookFormId);
            
            // 3. Fetch the actual lead details from Meta Graph API
            if (META_PAGE_ACCESS_TOKEN) {
              console.log('META_PAGE_ACCESS_TOKEN is present, fetching Graph API...');
              const graphBase = getMetaGraphBaseUrl();
              let leadResponse = await fetch(
                `${graphBase}/${leadgenId}?fields=id,created_time,field_data,form_id,campaign_name&access_token=${META_PAGE_ACCESS_TOKEN}`
              );
              let leadData = await leadResponse.json();
              if (!leadResponse.ok || leadData?.error) {
                leadResponse = await fetch(`${graphBase}/${leadgenId}?access_token=${META_PAGE_ACCESS_TOKEN}`);
                leadData = await leadResponse.json();
              }
              console.log('Graph API Response:', JSON.stringify(leadData));
              
              if (leadData.field_data) {
                const org = await prisma.organization.findFirst();
                if (org) {
                  await ingestMetaLead({
                    organizationId: org.id,
                    formId: webhookFormId || leadData.form_id,
                    leadgenId,
                    campaignName: leadData.campaign_name,
                    fieldData: leadData.field_data,
                    logPrefix: 'Meta Webhook',
                  });
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
