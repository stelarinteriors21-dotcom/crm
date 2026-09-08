import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // Delete related call logs and tasks first due to foreign key constraints
    await prisma.callLog.deleteMany({ where: { leadId: params.id } });
    await prisma.task.deleteMany({ where: { leadId: params.id } });
    
    await prisma.lead.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ success: false, error: "Failed to delete lead" }, { status: 500 });
  }
}
