export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHiddenFormExclusionWhere } from '@/lib/metaFormFilter';

// Simple API for the mobile app to fetch assigned leads
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 });
    }

    const caller = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });
    const hiddenExclusion = caller?.organizationId
      ? await getHiddenFormExclusionWhere(caller.organizationId)
      : {};

    const leads = await prisma.lead.findMany({
      where: {
        assignedToId: userId,
        assignedStatus: { not: 'HIDDEN_FORM' },
        status: {
          not: 'DEAD'
        },
        ...hiddenExclusion,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ success: true, leads });
  } catch (error) {
    console.error('Error fetching leads for mobile:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

