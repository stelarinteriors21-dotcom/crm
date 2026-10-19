import { getCurrentUser } from "@/app/actions/authActions";
import { redirect } from "next/navigation";
import BulkUploadClient from "@/components/BulkUploadClient";

export default async function BulkUploadPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) {
    redirect("/add/single");
  }

  return <BulkUploadClient />;
}
