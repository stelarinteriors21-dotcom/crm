import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { getCurrentRnrSlot } from '@/app/actions/leadActions';
import { handleConnectedCallAutomations } from '@/app/actions/callActions';

export async function POST(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const formData = await request.formData();
    
    const leadIdFromForm = formData.get('leadId') as string;
    const phone = formData.get('phone') as string;
    const userId = formData.get('userId') as string;
    const durationStr = formData.get('duration') as string; // in seconds
    let duration = parseInt(durationStr || '0');
    const ringTimeStr = formData.get('ringDuration') as string; // in seconds
    const ringDuration = parseInt(ringTimeStr || durationStr || '0');
    let callStatus = (formData.get('callStatus') as string || '').toUpperCase(); // ANSWERED, MISSED, REJECTED
    let notes = formData.get('notes') as string || '';
    const recordingFile = formData.get('audio') as File;
    const ringsStr = formData.get('rings') as string;
    const timestampStr = formData.get('timestamp') as string;
    let callCreatedAt: Date | undefined;
    if (timestampStr && !isNaN(parseInt(timestampStr))) {
      const parsedTime = parseInt(timestampStr);
      if (parsedTime > 0) {
        callCreatedAt = new Date(parsedTime);
      }
    }

    // 1. Duration & Outcome Recovery: If duration was sent as 0 but notes contains verified talk time, recover it!
    if (duration <= 0 && notes) {
      const talkMatch = notes.match(/(\d+)\s*s\s*talk time/i) || notes.match(/talk time[:\s]+(\d+)\s*s/i) || notes.match(/\((\d+)\s*s\)/);
      if (talkMatch) {
        const parsedTalk = parseInt(talkMatch[1]);
        if (parsedTalk > 0) {
          duration = parsedTalk;
          callStatus = 'ANSWERED';
        }
      }
    }

    // 2. If an audio file is uploaded, this call was answered (audio recordings cannot exist for missed calls)
    if (recordingFile) {
      callStatus = 'ANSWERED';
      if (duration <= 0) {
        duration = Math.max(1, ringDuration);
      }
    }

    // Intelligent Ring Calculation & Anti-Fraud Detection
    // Standard cadence: 1 ring cycle is approx 4.5 - 5 seconds (2s ring + 2.5-3s cadence)
    let estimatedRings: number;
    if (ringsStr && !isNaN(parseInt(ringsStr))) {
      estimatedRings = parseInt(ringsStr);
    } else if (ringDuration <= 2) {
      estimatedRings = 0;
    } else if (ringDuration <= 6) {
      estimatedRings = 1;
    } else if (ringDuration <= 10) {
      estimatedRings = 2;
    } else if (ringDuration <= 15) {
      estimatedRings = 3;
    } else {
      estimatedRings = Math.max(1, Math.round(ringDuration / 4.5));
    }

    let antiFraudTag = "";
    const isConnectedCall = duration > 0 || callStatus === 'ANSWERED' || !!recordingFile;

    if (!isConnectedCall) {
      if (estimatedRings === 0 || ringDuration <= 2) {
        antiFraudTag = `[Quick Drop: ${ringDuration}s (0 rings)]`;
      } else if (estimatedRings === 1 || ringDuration <= 6) {
        antiFraudTag = `[⚠️ SHORT RING: ${ringDuration}s (1 ring)] Caller hung up right after first ring`;
      } else if (estimatedRings <= 3) {
        antiFraudTag = `[🔔 PARTIAL RING: ~${estimatedRings} rings (${ringDuration}s)] Customer did not answer`;
      } else {
        antiFraudTag = `[🔔 FULL RINGOUT: ~${estimatedRings} rings (${ringDuration}s)] Ringing No Response (RNR)`;
      }
    } else {
      antiFraudTag = `[✅ CONNECTED: Talk time ${duration}s | Pre-ring ~${estimatedRings} rings]`;
    }

    // Clean user note: strip any auto-generated text or contradictory tags
    let cleanUserNote = notes
      .replace(/Auto-(?:synced|detected)[^|.\n]+\.mp3\s*\|?/gi, '')
      .replace(/\[(?:Direct Call from Phone Dialer|Incoming Call on SIM)\]\s*\(\d+s\)\s*\|?/gi, '')
      .replace(/\[(?:🚨 FAKE DIAL|Quick Drop)[^\]]*\]\s*/gi, '')
      .replace(/\[✅ CONNECTED[^\]]*\]\s*/gi, '')
      .replace(/\[⚠️ SHORT RING[^\]]*\]\s*/gi, '')
      .replace(/\[🔔[^\]]*\]\s*/gi, '')
      .replace(/\[🔒 Verified Device Log[^\]]*\]\s*/gi, '')
      .trim();

    // Final clean note with system tag prepended
    const finalNotes = cleanUserNote ? `${antiFraudTag} ${cleanUserNote}` : antiFraudTag;

    if (!leadIdFromForm && !phone) {
      return new NextResponse('Missing required fields: leadId or phone', { status: 400, headers: corsHeaders });
    }

    let leadId = leadIdFromForm;

    // Look up the lead by phone number if we don't have the ID
    if (!leadId && phone) {
      // Extract the last 10 digits for robust matching across country codes
      const normalizedPhone = phone.replace(/\D/g, "");
      const corePhone = normalizedPhone.length >= 10 ? normalizedPhone.slice(-10) : normalizedPhone;
      
      // 1. Prioritize finding an active lead assigned to this caller
      let lead = userId ? await prisma.lead.findFirst({
        where: {
          phone: { contains: corePhone },
          assignedToId: userId
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, status: true }
      }) : null;

      // 2. Fallback to newest matching lead across organization
      if (!lead) {
        lead = await prisma.lead.findFirst({
          where: {
            phone: { contains: corePhone }
          },
          orderBy: { createdAt: 'desc' },
          select: { id: true, status: true }
        });
      }
      
      if (!lead) {
        return new NextResponse(`Lead not found for phone: ${phone}`, { status: 404, headers: corsHeaders });
      }
      leadId = lead.id;
    }

    let recordingUrl = null;

    // Handle audio file upload
    if (recordingFile) {
      const bytes = await recordingFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filename = `call_${leadId}_${Date.now()}.mp3`;
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('Supabase credentials missing!');
      } else {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data, error } = await supabase.storage
          .from('call-recordings')
          .upload(filename, buffer, {
            contentType: 'audio/mpeg',
            upsert: false
          });

        if (error) {
          console.error('Error uploading to Supabase, falling back to PC disk storage:', error);
          try {
            const localDir = path.join(process.cwd(), 'public', 'uploads', 'recordings');
            if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
            const localFilePath = path.join(localDir, filename);
            await writeFile(localFilePath, buffer);
            recordingUrl = `/uploads/recordings/${filename}`;
          } catch (localErr) {
            console.error('Local fallback error:', localErr);
          }
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('call-recordings')
            .getPublicUrl(filename);
          recordingUrl = publicUrlData.publicUrl;
        }
      }
    }

    let finalUserId = userId;
    const userExists = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    if (!userExists) {
      const leadForUser = await prisma.lead.findUnique({ where: { id: leadId } });
      if (leadForUser && leadForUser.assignedToId) {
        finalUserId = leadForUser.assignedToId;
      } else {
        const admin = await prisma.user.findFirst();
        if (admin) finalUserId = admin.id;
      }
    }

    // 1. Explicit callId passed: update that specific call only
    const specificCallId = formData.get('callId') as string;
    if (specificCallId) {
      const updateData: any = {};
      if (recordingUrl) updateData.recordingUrl = recordingUrl;
      if (duration > 0) updateData.duration = duration;
      if (finalNotes && isConnectedCall) {
        updateData.notes = finalNotes;
      }
      if (Object.keys(updateData).length > 0) {
        const updated = await prisma.callLog.update({
          where: { id: specificCallId },
          data: updateData
        });
        return NextResponse.json({ success: true, callLog: updated }, { headers: corsHeaders });
      }
    }

    // Check recent call for this lead:
    // If callCreatedAt is supplied (e.g. from device log backfill), match within ±2 minute window around the actual call time.
    // Otherwise fallback to checking recent calls within the last 90 seconds.
    const searchWindow = callCreatedAt
      ? {
          gte: new Date(callCreatedAt.getTime() - 2 * 60 * 1000),
          lte: new Date(callCreatedAt.getTime() + 2 * 60 * 1000)
        }
      : {
          gte: new Date(Date.now() - 90 * 1000)
        };

    const recentCall = await prisma.callLog.findFirst({
      where: {
        leadId,
        createdAt: searchWindow
      },
      orderBy: { createdAt: 'desc' }
    });

    if (recentCall) {
      const timeDiffMs = Math.abs(
        (callCreatedAt ? callCreatedAt.getTime() : Date.now()) - new Date(recentCall.createdAt).getTime()
      );

      // Case A: Exact duplicate connected call uploaded twice (SmartCallManager + AutoCallLogWatcher)
      // e.g. both calls have duration > 0 (e.g. 32s and 32s) within window
      if (isConnectedCall && (recentCall.duration > 0 || recentCall.recordingUrl)) {
        const durDiff = Math.abs((recentCall.duration || 0) - duration);
        if (durDiff <= 5 || isNaN(durDiff)) {
          let updateData: any = {};
          if (recordingUrl && !recentCall.recordingUrl) updateData.recordingUrl = recordingUrl;
          if (Object.keys(updateData).length > 0) {
            const updated = await prisma.callLog.update({
              where: { id: recentCall.id },
              data: updateData
            });
            return NextResponse.json({ success: true, callLog: updated, deduplicated: true }, { headers: corsHeaders });
          }
          console.log(`Prevented duplicate connected call for lead ${leadId} (duration=${duration}s within ${Math.round(timeDiffMs/1000)}s)`);
          return NextResponse.json({ success: true, callLog: recentCall, deduplicated: true }, { headers: corsHeaders });
        }
      }

      // Case B: Connected call arrives within 90s after a 0s placeholder (dialer start event)
      if (isConnectedCall && (recentCall.duration === 0 && !recentCall.recordingUrl)) {
        const updated = await prisma.callLog.update({
          where: { id: recentCall.id },
          data: {
            duration: duration,
            recordingUrl: recordingUrl || recentCall.recordingUrl,
            notes: finalNotes || recentCall.notes
          }
        });

        // Update lead status to Contacted if answered & complete any follow-up tasks
        await handleConnectedCallAutomations(leadId, duration, finalUserId);

        console.log(`Upgraded 0s placeholder to connected call (${duration}s) for lead ${leadId}`);
        return NextResponse.json({ success: true, callLog: updated, upgraded: true }, { headers: corsHeaders });
      }

      // Only deduplicate if an identical 0s call was submitted within 8 seconds (e.g. double trigger of same click)
      if (!isConnectedCall && duration === 0 && !recordingUrl) {
        if (timeDiffMs <= 8000 && recentCall.duration === 0) {
          console.log(`Prevented rapid duplicate 0s call for lead ${leadId} within ${Math.round(timeDiffMs/1000)}s`);
          return NextResponse.json({ success: true, callLog: recentCall, deduplicated: true }, { headers: corsHeaders });
        }
      }
    }

    // Case D: Legitimate separate call!
    const callLog = await prisma.callLog.create({
      data: {
        leadId,
        userId: finalUserId,
        duration,
        recordingUrl,
        notes: finalNotes,
        ...(callCreatedAt ? { createdAt: callCreatedAt } : {})
      }
    });

    // Automations based on call log
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (lead) {
      const cf = (lead.customFields as any) || {};
      const hadInactivityAlert = !!cf.inactivity48hAlert;
      if (hadInactivityAlert) {
        delete cf.inactivity48hAlert;
      }

      // Check if this lead has a scheduled follow-up pending in the future
      const hasPendingFutureFollowUp = cf.followUpDate && new Date(cf.followUpDate).getTime() > Date.now();
      const isConnected = duration > 0 || recordingFile || callStatus === 'ANSWERED';

      if (hasPendingFutureFollowUp || isConnected) {
        // Automation 1: Attended call OR call logged before scheduled follow-up -> complete follow-up & change to Contacted
        await handleConnectedCallAutomations(leadId, Math.max(duration, 1), finalUserId);
      } else if (duration === 0) {
        // Automation 2: Call not attended -> change to RNR
        const closedStatuses = ['Won', 'Advance recieved', 'Pay Pending', 'Junk'];
        if (!closedStatuses.includes(lead.status)) {
          const currentSlot = await getCurrentRnrSlot();
          const isStatusChangingToRnr = lead.status !== 'RNR';
          await prisma.lead.update({
            where: { id: leadId },
            data: { 
              status: 'RNR',
              customFields: {
                ...cf,
                rnrLastAttemptAt: new Date().toISOString(),
                ...(currentSlot ? { rnrLastSlot: currentSlot.slotId } : {}),
                ...(isStatusChangingToRnr ? { statusChangedAt: new Date().toISOString() } : {})
              },
              ...(lead.escalationLevel === 2 ? { escalationLevel: 0 } : {})
            }
          });
        }
      }
    }

    return NextResponse.json({ success: true, callLog }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error saving call log:', error);
    return new NextResponse('Internal Server Error', { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
