import prisma from "@/lib/prisma";
import PermissionTemplatesClientPage from "@/components/PermissionTemplatesClientPage";

export default async function PermissionTemplatesPage() {
  const templates = await prisma.permissionTemplate.findMany({
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  return <PermissionTemplatesClientPage templates={templates} />;
}
