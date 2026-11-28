import { getCurrentUser } from "@/app/actions/authActions";
import { getWhatsAppConversationsAction, getWhatsAppApiConfig } from "@/app/actions/whatsAppActions";
import WhatsAppHubClient from "@/components/WhatsAppHubClient";

interface WhatsAppPageProps {
  searchParams?: {
    leadId?: string;
  };
}

export default async function WhatsAppPage({ searchParams }: WhatsAppPageProps) {
  const [conversations, config, user] = await Promise.all([
    getWhatsAppConversationsAction(),
    getWhatsAppApiConfig(),
    getCurrentUser()
  ]);

  const isAdmin = user?.role === "ADMIN" || user?.role === "ROOT";

  return (
    <WhatsAppHubClient 
      initialConversations={conversations} 
      initialConfig={config} 
      initialLeadId={searchParams?.leadId}
      isAdmin={isAdmin}
    />
  );
}
