import { getOrganizationSettings, getMetaFormsSettingsData } from "@/app/actions/settingsActions";
import { getCurrentUser } from "@/app/actions/authActions";
import { redirect } from "next/navigation";
import SettingsClient from "@/components/SettingsClient";
import { stripInternalOrgConfigKeys } from "@/lib/metaFormConfig";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "ROOT")) {
    redirect("/dashboard");
  }

  const [settings, metaForms] = await Promise.all([
    getOrganizationSettings(),
    getMetaFormsSettingsData(),
  ]);

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Organization Settings</h1>
      
      <SettingsClient 
        initialEmails={settings?.escalationEmails || ""} 
        initialLabels={stripInternalOrgConfigKeys(settings?.customFieldLabels)}
        initialRequireGps={settings?.requireGps || false}
        initialTags={(settings?.customTags as any[]) || [{name: "Potential lead", color: "#3b82f6"}, {name: "Future potential lead", color: "#8b5cf6"}]}
        initialSoundMuted={Boolean((settings?.customFieldLabels as any)?.globalSoundMuted)}
        initialMetaForms={metaForms}
      />
    </div>
  );
}
