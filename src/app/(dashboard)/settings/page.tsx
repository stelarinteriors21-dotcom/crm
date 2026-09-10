import { getOrganizationSettings } from "@/app/actions/settingsActions";
import SettingsClient from "@/components/SettingsClient";

export default async function SettingsPage() {
  const settings = await getOrganizationSettings();

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-black text-gray-900 mb-6">Organization Settings</h1>
      
      <SettingsClient 
        initialEmails={settings?.escalationEmails || ""} 
        initialLabels={(settings?.customFieldLabels as Record<string, string>) || {}}
      />
    </div>
  );
}
