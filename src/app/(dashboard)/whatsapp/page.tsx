import { getCurrentUser } from "@/app/actions/authActions";
import { getWhatsAppConversationsAction, getWhatsAppApiConfig } from "@/app/actions/whatsAppActions";
import WhatsAppHubClient from "@/components/WhatsAppHubClient";

interface WhatsAppPageProps {
  searchParams?: {
    leadId?: string;
  };
}

export default async function WhatsAppPage({ searchParams }: WhatsAppPageProps) {
  const [conversations, config] = await Promise.all([
    getWhatsAppConversationsAction(),
    getWhatsAppApiConfig()
  ]);

  return (
    <WhatsAppHubClient 
      initialConversations={conversations} 
      initialConfig={config} 
      initialLeadId={searchParams?.leadId}
    />
  );
}
