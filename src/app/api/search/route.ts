import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/authActions";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ leads: [], team: [] });
    }

    const isAdmin = user.role === "ADMIN" || user.role === "ROOT";

    const leadWhere: any = {
      organizationId: user.organizationId,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
      ]
    };

    if (!isAdmin && user.role !== "SITE_VISITOR") {
      leadWhere.assignedToId = user.id;
    }

    const [leads, team] = await Promise.all([
      prisma.lead.findMany({
        where: leadWhere,
        take: 8,
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
          city: true,
        }
      }),
      isAdmin
        ? prisma.user.findMany({
            where: {
              organizationId: user.organizationId,
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { email: { contains: query, mode: 'insensitive' } },
              ]
            },
            take: 5,
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            }
          })
        : Promise.resolve([])
    ]);

    return NextResponse.json({ leads, team });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
