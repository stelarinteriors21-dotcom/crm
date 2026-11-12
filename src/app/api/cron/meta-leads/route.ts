import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getMetaGraphBaseUrl, ingestMetaLead } from '@/lib/metaFormService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
    const META_PAGE_ID = process.env.META_PAGE_ID || '';
    // Basic authorization check (you can use Vercel Cron Secret in production)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!META_PAGE_ACCESS_TOKEN || !META_PAGE_ID) {
      return new NextResponse('Missing Meta credentials. Need META_PAGE_ACCESS_TOKEN and META_PAGE_ID', { status: 400 });
    }

    const graphBase = getMetaGraphBaseUrl();

    // Only fetch leads from the last hour to prevent rate limiting
    const sinceTimestamp = Math.floor(Date.now() / 1000) - (60 * 60);

    // 1. Get all forms for the page
    const formsRes = await fetch(
      `${graphBase}/${META_PAGE_ID}/leadgen_forms?access_token=${META_PAGE_ACCESS_TOKEN}`
    );
    const formsData = await formsRes.json();
    
    if (!formsData.data) {
      return new NextResponse('Failed to fetch forms: ' + JSON.stringify(formsData), { status: 400 });
    }

    let leadsProcessed = 0;
    let leadsAdded = 0;
    let leadsHidden = 0;

    const org = await prisma.organization.findFirst();
    if (!org) return new NextResponse('No org found', { status: 400 });

    // 2. Iterate through each form
    for (const form of formsData.data) {
      // 3. Fetch leads for this form
      const leadsRes = await fetch(
        `${graphBase}/${form.id}/leads?since=${sinceTimestamp}&access_token=${META_PAGE_ACCESS_TOKEN}`
      );
      const leadsData = await leadsRes.json();

      if (leadsData.data && leadsData.data.length > 0) {
        for (const lead of leadsData.data) {
          leadsProcessed++;
          const res = await ingestMetaLead({
            organizationId: org.id,
            formId: form.id,
            formName: form.name,
            leadgenId: lead.id,
            campaignName: lead.campaign_name,
            fieldData: lead.field_data || [],
            logPrefix: 'Meta Cron',
          });
          if (res.added) {
            leadsAdded++;
            if (res.hidden) leadsHidden++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, leadsProcessed, leadsAdded, leadsHidden });
  } catch (error) {
    console.error('Error fetching Meta leads:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
