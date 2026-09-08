const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

console.log("🚀 Starting TeleCRM Automations Background Worker...");

// Simulated WhatsApp Sending Function
async function sendWhatsAppTemplate(leadPhone, templateName) {
  console.log(`[WhatsApp API] Sending template '${templateName}' to ${leadPhone}`);
  // In production, this would be an actual Axios call to Meta's Cloud API:
  /*
    await axios.post(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
      messaging_product: "whatsapp",
      to: leadPhone,
      type: "template",
      template: { name: templateName, language: { code: "en_US" } }
    }, { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }});
  */
  return true;
}

async function processAutomations() {
  try {
    const rules = await prisma.automationRule.findMany({
      where: { isActive: true }
    });

    if (rules.length === 0) return;

    // Check newly added leads in the last 5 minutes (as a polling example)
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentLeads = await prisma.lead.findMany({
      where: { createdAt: { gte: fiveMinsAgo } }
    });

    for (const rule of rules) {
      if (rule.triggerOn === 'NEW_LEAD') {
        for (const lead of recentLeads) {
          // Check if condition matches
          if (rule.condition) {
            const [field, operator, val] = rule.condition.split(' ');
            // Simple string matching evaluator
            if (operator === '==' && lead[field] !== val.replace(/'/g, '')) continue;
          }

          // Execute Action
          if (rule.actionType === 'SEND_WHATSAPP') {
            const payload = JSON.parse(rule.actionPayload);
            
            // Check if we already logged this message to avoid spam
            const existingLog = await prisma.whatsAppLog.findFirst({
              where: { leadId: lead.id, message: `Auto: ${payload.template}` }
            });

            if (!existingLog) {
              const success = await sendWhatsAppTemplate(lead.phone, payload.template);
              if (success) {
                await prisma.whatsAppLog.create({
                  data: {
                    leadId: lead.id,
                    direction: 'OUTBOUND',
                    message: `Auto: ${payload.template}`,
                    status: 'DELIVERED'
                  }
                });
                console.log(`✅ Automation Triggered: Sent '${payload.template}' to ${lead.name}`);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Worker Error:", error);
  }
}

// Poll every 30 seconds
setInterval(processAutomations, 30000);

// Round-Robin State
let lastAssignedUserIndex = 0;

async function processLeadAssignments() {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) return;

    // Get all telecallers
    const users = await prisma.user.findMany({
      where: { organizationId: org.id },
      orderBy: { id: 'asc' }
    });
    
    if (users.length === 0) return;

    // 1. Reassign leads that timed out (PENDING for > 10 mins)
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const timedOutLeads = await prisma.lead.findMany({
      where: {
        assignedStatus: 'PENDING',
        assignedAt: { lt: tenMinsAgo },
        assignedToId: { not: null }
      }
    });

    for (const lead of timedOutLeads) {
      console.log(`[Assignment] Lead ${lead.name} timed out for user ${lead.assignedToId}. Reassigning...`);
      
      // Pick next user, skipping the one who ignored it if possible
      let nextUser = users[lastAssignedUserIndex % users.length];
      if (nextUser.id === lead.assignedToId && users.length > 1) {
         lastAssignedUserIndex++;
         nextUser = users[lastAssignedUserIndex % users.length];
      }
      lastAssignedUserIndex++;

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          assignedToId: nextUser.id,
          assignedStatus: 'PENDING',
          assignedAt: new Date()
        }
      });
      console.log(`[Assignment] Lead ${lead.name} reassigned to ${nextUser.name}`);
    }

    // 2. Auto-assign new unassigned leads
    const unassignedLeads = await prisma.lead.findMany({
      where: { assignedToId: null, organizationId: org.id }
    });

    for (const lead of unassignedLeads) {
      const nextUser = users[lastAssignedUserIndex % users.length];
      lastAssignedUserIndex++;

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          assignedToId: nextUser.id,
          assignedStatus: 'PENDING',
          assignedAt: new Date()
        }
      });
      console.log(`[Assignment] Unassigned lead ${lead.name} assigned to ${nextUser.name}`);
    }

  } catch (error) {
    console.error("Assignment Worker Error:", error);
  }
}

// Poll every 10 seconds for assignment
setInterval(processLeadAssignments, 10000);
console.log("🚀 Polling every 30 seconds for Automations and 10 seconds for Assignments...");
