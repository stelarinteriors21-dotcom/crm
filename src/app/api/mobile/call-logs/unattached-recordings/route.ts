import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Get calls from the last 48 hours with duration > 0 that are missing audio recordings
    const since = new Date(Date.now() - 48 * 3600 * 1000);
    const where: any = {
      duration: { gt: 0 },
      recordingUrl: null,
      createdAt: { gte: since }
    };

    if (userId) {
      where.userId = userId;
    }

    const unattachedCalls = await prisma.callLog.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true, phone: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const formatted = unattachedCalls.map(c => ({
      id: c.id,
      leadId: c.leadId,
      leadName: c.lead?.name || '',
      phone: c.lead?.phone || '',
      duration: c.duration,
      createdAt: c.createdAt
    }));

    return NextResponse.json({ success: true, calls: formatted }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
