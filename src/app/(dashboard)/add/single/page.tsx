import { getCurrentUser } from "@/app/actions/authActions";
import { redirect } from "next/navigation";
import AddSingleLeadClient from "@/components/AddSingleLeadClient";

export default async function AddSingleLeadPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const isAdmin = user.role === "ADMIN" || user.role === "ROOT";

  return <AddSingleLeadClient isAdmin={isAdmin} />;
}
