import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const rules = await prisma.automationRule.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, rules });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch rules' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, triggerOn, condition, actionType, actionPayload } = await req.json();
    
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error("No organization found");

    const rule = await prisma.automationRule.create({
      data: {
        name,
        triggerOn,
        condition,
        actionType,
        actionPayload: JSON.stringify(actionPayload),
        organizationId: org.id
      }
    });

    return NextResponse.json({ success: true, rule });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: 'Failed to create rule' }, { status: 500 });
  }
}
