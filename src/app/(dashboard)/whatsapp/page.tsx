import { getCurrentUser } from "@/app/actions/authActions";
import { getWhatsAppConversationsAction, getWhatsAppApiConfig } from "@/app/actions/whatsAppActions";
import WhatsAppHubClient from "@/components/WhatsAppHubClient";

export default async function WhatsAppPage() {
  const [conversations, config] = await Promise.all([
    getWhatsAppConversationsAction(),
    getWhatsAppApiConfig()
  ]);

  return <WhatsAppHubClient initialConversations={conversations} initialConfig={config} />;
}
