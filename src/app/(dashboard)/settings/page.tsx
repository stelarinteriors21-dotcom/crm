import { getOrganizationSettings } from "@/app/actions/settingsActions";
import { getCurrentUser } from "@/app/actions/authActions";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/SettingsClient";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) {
    redirect("/dashboard");
  }

  const settings = await getOrganizationSettings();

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Organization Settings</h1>
      
      <SettingsClient 
        initialEmails={settings?.escalationEmails || ""} 
        initialLabels={(settings?.customFieldLabels as Record<string, string>) || {}}
        initialRequireGps={settings?.requireGps || false}
        initialTags={(settings?.customTags as any[]) || [{name: "Potential lead", color: "#3b82f6"}, {name: "Future potential lead", color: "#8b5cf6"}]}
      />
    </div>
  );
}
