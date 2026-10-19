import { getCurrentUser } from "@/app/actions/authActions";
import { redirect } from "next/navigation";
import AdminAuditReportClient from "@/components/AdminAuditReportClient";

export default async function AdminAuditReportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  
  if (user.role !== "ADMIN" && user.role !== "ROOT") {
    redirect("/dashboard");
  }

  return <AdminAuditReportClient />;
}

export const dynamic = "force-dynamic";
