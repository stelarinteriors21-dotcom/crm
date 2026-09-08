export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Simple API for the mobile app to fetch assigned leads
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return new NextResponse('User ID is required', { status: 400 });
    }

    const leads = await prisma.lead.findMany({
      where: {
        assignedToId: userId,
        status: {
          not: 'DEAD'
        }
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

