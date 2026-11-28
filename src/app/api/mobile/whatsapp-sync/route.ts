import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// In-memory deduplication map to prevent concurrent request race conditions
const recentSyncMap = new Map<string, number>();

export async function POST(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // COMPLETE CUTOFF: Disabled permanently in favor of official Meta WhatsApp Cloud API
  console.log('[whatsapp-sync] Ignored: Screen reading & companion sync permanently disabled in favor of Meta WhatsApp Cloud API.');
  return NextResponse.json(
    { success: true, ignored: true, reason: 'screen_reading_disabled_cloud_api_active' },
    { headers: corsHeaders }
  );
}

export async function POST_DISABLED(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    let body: any = {};
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      body = {
        phone: formData.get('phone') as string,
        contactName: formData.get('contactName') as string,
        message: formData.get('message') as string,
        direction: (formData.get('direction') as string || 'INBOUND').toUpperCase(),
        timestamp: formData.get('timestamp') as string,
      };
    }

    const { phone, contactName, message, direction = 'INBOUND', leadId, timestamp } = body;
    console.log(`[whatsapp-sync] incoming POST: phone="${phone}", contactName="${contactName}", msg="${message?.slice(0, 40)}", dir="${direction}", leadId="${leadId}"`);

    if (!message || (!phone && !contactName && !leadId)) {
      console.warn('[whatsapp-sync] Rejected 400: missing message or contact info', body);
      return NextResponse.json(
        { error: 'Missing message or contact info (phone/contactName/leadId required)' },
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanMsg = (message || '').trim();
    const lowerMsg = cleanMsg.toLowerCase();

    // Reject system, accessibility, or junk test spam
    const systemSubstrings = [
      'whatsapp locked', 'unlock to use whatsapp', 'recent chats', 'message yourself',
      'touch the fingerprint', 'use pin', 'use password', 'online', 'typing...',
      'system apps', 'more apps', 'recents',
      'add a caption…', 'add a caption...', 'contacts',
      'tucson-queen-supplement-olive', 'thoughts-capabilities-marshall-les',
      'messages are end-to-end', 'tap here for contact info', 'end-to-end encrypted'
    ];
    if (systemSubstrings.some(p => lowerMsg.includes(p))) {
      console.log(`[whatsapp-sync] Ignored system/metadata message: "${cleanMsg.slice(0, 30)}"`);
      return NextResponse.json({ success: true, ignored: true, reason: 'system_metadata' }, { headers: corsHeaders });
    }

    // Exact single-word UI label rejections (from Android accessibility scanner)
    const exactUiWords = [
      'camera', 'settings', 'themes', 'notes', 'tools', 'dice', 'clock',
      'date calculator', 'phone', 'messaging', 'lock', 'stelar crm', 'follow up'
    ];
    if (exactUiWords.includes(lowerMsg)) {
      console.log(`[whatsapp-sync] Ignored single-word UI label: "${cleanMsg}"`);
      return NextResponse.json({ success: true, ignored: true, reason: 'ui_label' }, { headers: corsHeaders });
    }

    // Reject known test spam strings
    const spamWords = ['skingorpy', 'hdugbfyfv', 'kdfhvfldbnvlsdbv', 'kdfhvfdlbnvlsd6v', 'jbdwfuh', 'gshuvdhu', 'diujbsdhub', 'sjbdhvbde]', 'jdbhdv', 'idejdjd', 'oishshsdkxix', 'ggng'];
    if (spamWords.includes(lowerMsg)) {
      console.log(`[whatsapp-sync] Ignored test spam message: "${cleanMsg}"`);
      return NextResponse.json({ success: true, ignored: true, reason: 'test_spam' }, { headers: corsHeaders });
    }

    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const corePhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

    const cleanName = (contactName || '').trim();
    const isGenericContact = !cleanName || cleanName.toLowerCase() === 'whatsapp contact' || cleanName.toLowerCase() === 'whatsapp';

    // 1. Locate matching lead
    let lead: any = null;
    if (leadId) {
      lead = await prisma.lead.findUnique({ where: { id: leadId } });

      // STRICT SAFETY: Verify phone number matches the lead to prevent cross-contamination
      if (lead && corePhone && corePhone.length >= 7) {
        const leadPhoneDigits = (lead.phone || '').replace(/[^0-9]/g, '');
        const leadCore = leadPhoneDigits.slice(-10);
        const altDigits = (((lead.customFields as any)?.alternatePhone || '') as string).replace(/[^0-9]/g, '');
        const altCore = altDigits.slice(-10);

        const matchesPrimary = leadCore && (leadCore.endsWith(corePhone) || corePhone.endsWith(leadCore));
        const matchesAlt = altCore && (altCore.endsWith(corePhone) || corePhone.endsWith(altCore));

        if (leadCore && !matchesPrimary && !matchesAlt) {
          console.warn(`[whatsapp-sync] REJECTED MISMATCH: leadId=${lead.id} (${lead.name}) phone="${lead.phone}" does not match payload phone="${phone}"`);
          return NextResponse.json(
            { error: `Phone number mismatch: Lead is ${lead.name} (${lead.phone}), but message payload is from ${phone}` },
            { status: 400, headers: corsHeaders }
          );
        }
      }
    }

    // A) Search by contactName if specific
    let leadByName: any = null;
    if (!lead && !isGenericContact && cleanName.length >= 2) {
      const lowerContact = cleanName.toLowerCase();
      const candidates = await prisma.lead.findMany({
        select: { id: true, name: true, phone: true, customFields: true },
        take: 200,
        orderBy: { createdAt: 'desc' }
      });

      for (const c of candidates) {
        const cLower = c.name.toLowerCase().trim();
        if (cLower.length >= 2) {
          if (lowerContact === cLower || lowerContact.startsWith(cLower + ' ') || lowerContact.includes(cLower)) {
            leadByName = c;
            break;
          }
        }
      }
    }

    // B) Search by phone if available
    let leadByPhone: any = null;
    if (!lead && corePhone && corePhone.length >= 7) {
      leadByPhone = await prisma.lead.findFirst({
        where: {
          OR: [
            { phone: { contains: corePhone } },
            { customFields: { path: ['alternatePhone'], string_contains: corePhone } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // C) Disambiguate between name match and phone match
    if (!lead) {
      if (leadByName && leadByPhone) {
        if (leadByName.id === leadByPhone.id) {
          lead = leadByName;
        } else {
          // Conflict: phone points to Lead A, but WhatsApp chat title clearly points to Lead B.
          // Prioritize the chat title's lead if the phone-matched lead has an unrelated name.
          const phoneLeadLower = (leadByPhone.name || '').toLowerCase();
          const lowerContact = cleanName.toLowerCase();
          if (!phoneLeadLower.includes(lowerContact) && !lowerContact.includes(phoneLeadLower)) {
            console.warn(`[whatsapp-sync] Conflict: phone matched "${leadByPhone.name}", but chat title matched "${leadByName.name}". Prioritizing chat title.`);
            lead = leadByName;
          } else {
            lead = leadByPhone;
          }
        }
      } else if (leadByName) {
        lead = leadByName;
      } else if (leadByPhone) {
        lead = leadByPhone;
      }
    }

    // Reject self-chat or "You" chat
    if (cleanName.includes('(You)') || cleanName.toLowerCase() === 'you' || cleanName.toLowerCase() === 'message yourself') {
      console.log(`[whatsapp-sync] Ignored self-chat: "${cleanName}"`);
      return NextResponse.json({ success: true, ignored: true, reason: 'self_chat' }, { headers: corsHeaders });
    }

    // D) Auto-create lead ONLY if explicitly requested and valid phone number exists
    if (!lead && body.autoCreate === true && corePhone && corePhone.length >= 10) {
      const defaultOrg = await prisma.organization.findFirst();
      if (defaultOrg) {
        lead = await prisma.lead.create({
          data: {
            name: cleanName && cleanName.length >= 2 && !isGenericContact ? cleanName : `WhatsApp Lead (${cleanPhone})`,
            phone: cleanPhone,
            source: 'WHATSAPP',
            status: 'Fresh',
            organizationId: defaultOrg.id,
            customFields: {
              sourceChannel: 'WhatsApp Web Extension',
              autoCreatedFromWhatsApp: true,
            }
          }
        });
        console.log(`[whatsapp-sync] Auto-created new Lead for phone="${cleanPhone}", name="${lead.name}" (id=${lead.id})`);
      }
    }

    if (!lead) {
      console.warn(`[whatsapp-sync] NO matching lead for phone="${phone}", contactName="${contactName}", corePhone="${corePhone}"`);
      return NextResponse.json(
        { success: true, matched: false, notice: 'No matching lead found for phone/contact' },
        { headers: corsHeaders }
      );
    }

    // 2. Prevent duplicate logging via in-memory lock & intelligent DB deduplication
    const finalDir = direction === 'OUTBOUND' ? 'OUTBOUND' : 'INBOUND';
    const dedupeKey = `${lead.id}:${finalDir}:${cleanMsg}`;
    const nowMs = Date.now();
    const lastSeen = recentSyncMap.get(dedupeKey);
    if (lastSeen && (nowMs - lastSeen < 60000)) {
      console.log(`[whatsapp-sync] Deduplicated via memory lock: "${cleanMsg.slice(0, 30)}" for lead=${lead.name}`);
      return NextResponse.json(
        { success: true, duplicated: true, notice: 'Deduplicated via in-memory lock' },
        { headers: corsHeaders }
      );
    }
    recentSyncMap.set(dedupeKey, nowMs);

    // Prune stale in-memory entries if size exceeds 500
    if (recentSyncMap.size > 500) {
      for (const [k, v] of Array.from(recentSyncMap.entries())) {
        if (nowMs - v > 120000) recentSyncMap.delete(k);
      }
    }

    // Smart DB deduplication:
    // If the message is a standard sentence, URL, or document name (> 8 chars), check if it was ever logged for this lead in the same direction.
    // If it's short (< 8 chars, e.g. "ok", "hi"), check if logged in the last 6 hours.
    const sixHoursAgo = new Date(nowMs - 6 * 3600 * 1000);
    const existingLog = await prisma.whatsAppLog.findFirst({
      where: {
        leadId: lead.id,
        direction: finalDir,
        message: cleanMsg,
        ...(cleanMsg.length <= 8 ? { createdAt: { gte: sixHoursAgo } } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existingLog) {
      console.log(`[whatsapp-sync] Already exists in DB: "${cleanMsg.slice(0, 30)}" for lead=${lead.name}`);
      return NextResponse.json(
        { success: true, duplicated: true, logId: existingLog.id },
        { headers: corsHeaders }
      );
    }

    // If incoming payload is OUTBOUND, but this exact message was previously saved as INBOUND, correct it to OUTBOUND!
    if (finalDir === 'OUTBOUND') {
      const existingInbound = await prisma.whatsAppLog.findFirst({
        where: {
          leadId: lead.id,
          direction: 'INBOUND',
          message: cleanMsg,
        }
      });
      if (existingInbound) {
        await prisma.whatsAppLog.update({
          where: { id: existingInbound.id },
          data: { direction: 'OUTBOUND' }
        });
        console.log(`[whatsapp-sync] Corrected INBOUND to OUTBOUND for: "${cleanMsg.slice(0, 30)}" for lead=${lead.name}`);
        return NextResponse.json(
          { success: true, updated: true, logId: existingInbound.id, notice: 'Corrected to OUTBOUND' },
          { headers: corsHeaders }
        );
      }
    }

    // If incoming payload claims to be INBOUND, but this exact message was already recorded as OUTBOUND for this lead, NEVER re-save as INBOUND!
    if (finalDir === 'INBOUND') {
      const existingOutbound = await prisma.whatsAppLog.findFirst({
        where: {
          leadId: lead.id,
          direction: 'OUTBOUND',
          message: cleanMsg,
        }
      });
      if (existingOutbound) {
        console.log(`[whatsapp-sync] Preserved OUTBOUND direction for: "${cleanMsg.slice(0, 30)}" for lead=${lead.name}`);
        return NextResponse.json(
          { success: true, duplicated: true, logId: existingOutbound.id, notice: 'Already recorded as OUTBOUND' },
          { headers: corsHeaders }
        );
      }
    }

    // 3. Determine timestamp (honor client timestamp if valid)
    let logDate = new Date();
    if (timestamp) {
      const parsed = new Date(timestamp);
      if (!isNaN(parsed.getTime())) {
        logDate = parsed;
      }
    }

    // 4. Create WhatsAppLog entry
    const newLog = await prisma.whatsAppLog.create({
      data: {
        leadId: lead.id,
        direction: finalDir,
        message: cleanMsg,
        status: 'DELIVERED',
        createdAt: logDate,
      }
    });

    console.log(`[whatsapp-sync] SUCCESS created log ${newLog.id} for lead="${lead.name}" (${lead.id}): [${finalDir}] "${cleanMsg.slice(0, 40)}"`);

    return NextResponse.json(
      {
        success: true,
        log: newLog,
        leadName: lead.name,
        leadId: lead.id
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('WhatsApp Sync error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    // Return list of all CRM lead phone numbers and names for 1-click extension bulk sync
    if (searchParams.get('crmLeads') === 'true' || searchParams.get('getLeads') === 'true') {
      const leads = await prisma.lead.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          customFields: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const formatted = leads.map(l => {
        const cleanDigits = (l.phone || '').replace(/[^0-9]/g, '');
        const core10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
        return {
          id: l.id,
          name: l.name,
          phone: cleanDigits,
          core10,
          alternatePhone: (l.customFields as any)?.alternatePhone || null
        };
      });

      return NextResponse.json({ success: true, count: formatted.length, leads: formatted }, { headers: corsHeaders });
    }

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400, headers: corsHeaders });
    }

    const messages = await prisma.whatsAppLog.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ success: true, messages }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
