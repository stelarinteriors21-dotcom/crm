import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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
    const duration = parseInt(durationStr || '0');
    const notes = formData.get('notes') as string || '';
    const recordingFile = formData.get('audio') as File;

    if ((!leadIdFromForm && !phone) || !userId) {
      return new NextResponse('Missing required fields', { status: 400, headers: corsHeaders });
    }

    let leadId = leadIdFromForm;

    // Look up the lead by phone number if we don't have the ID
    if (!leadId && phone) {
      // Extract the last 10 digits for robust matching across country codes
      const normalizedPhone = phone.replace(/\D/g, "");
      const corePhone = normalizedPhone.length >= 10 ? normalizedPhone.slice(-10) : normalizedPhone;
      
      const lead = await prisma.lead.findFirst({
        where: {
          phone: { contains: corePhone }
        },
        select: { id: true, status: true }
      });
      
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
          console.error('Error uploading to Supabase:', error);
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('call-recordings')
            .getPublicUrl(filename);
          recordingUrl = publicUrlData.publicUrl;
        }
      }
    }

    let finalUserId = userId;
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      const leadForUser = await prisma.lead.findUnique({ where: { id: leadId } });
      if (leadForUser && leadForUser.assignedToId) {
        finalUserId = leadForUser.assignedToId;
      } else {
        const admin = await prisma.user.findFirst();
        if (admin) finalUserId = admin.id;
      }
    }

    // Deduplication check: prevent identical calls from being logged multiple times 
    // (e.g. if the mobile app retries the upload on poor connections)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingLog = await prisma.callLog.findFirst({
      where: {
        leadId,
        userId: finalUserId,
        duration,
        notes,
        createdAt: { gte: fiveMinutesAgo }
      }
    });

    if (existingLog) {
      console.log(`Duplicate call log detected for lead ${leadId}, skipping duplicate insertion.`);
      return NextResponse.json({ success: true, callLog: existingLog }, { headers: corsHeaders });
    }

    // Save call log in database
    const callLog = await prisma.callLog.create({
      data: {
        leadId,
        userId: finalUserId,
        duration,
        recordingUrl,
        notes
      }
    });

    // Optionally update lead status to CONTACTED if it was NEW
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (lead && lead.status === 'NEW') {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: 'CONTACTED' }
      });
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
