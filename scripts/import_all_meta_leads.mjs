import { PrismaClient } from "@prisma/client";




const prisma = new PrismaClient();
const META_PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const META_PAGE_ID = process.env.META_PAGE_ID;

async function fetchAllLeads() {
  if (!META_PAGE_ACCESS_TOKEN || !META_PAGE_ID) {
    console.error("Missing META_PAGE_ACCESS_TOKEN or META_PAGE_ID in .env");
    process.exit(1);
  }

  console.log("Fetching all forms for page:", META_PAGE_ID);
  const formsRes = await fetch(
    `https://graph.facebook.com/v19.0/${META_PAGE_ID}/leadgen_forms?access_token=${META_PAGE_ACCESS_TOKEN}`
  );
  const formsData = await formsRes.json();

  if (!formsData.data) {
    console.error("Failed to fetch forms", formsData);
    process.exit(1);
  }

  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error("No organization found in DB");
    process.exit(1);
  }

  const callers = await prisma.user.findMany({
    where: { organizationId: org.id, role: "TELECALLER" },
    orderBy: { id: "asc" }
  });

  let totalProcessed = 0;
  let totalAdded = 0;

  for (const form of formsData.data) {
    console.log(`Fetching leads for form: ${form.name} (${form.id})`);
    
    let url = `https://graph.facebook.com/v19.0/${form.id}/leads?access_token=${META_PAGE_ACCESS_TOKEN}&limit=1000`;
    let hasNext = true;

    while (hasNext && url) {
      const leadsRes = await fetch(url);
      const leadsData = await leadsRes.json();

      if (leadsData.data && leadsData.data.length > 0) {
        for (const lead of leadsData.data) {
          totalProcessed++;
          
          let name = "Unknown";
          let phone = "";
          let email = null;
          let city = null;
          
          if (lead.field_data) {
            lead.field_data.forEach(field => {
              if (field.name === "full_name" || field.name === "first_name") name = (field.values && field.values.length > 0 ? field.values[0] : "");
              if (field.name === "phone_number") phone = (field.values && field.values.length > 0 ? field.values[0] : "");
              if (field.name === "email") email = (field.values && field.values.length > 0 ? field.values[0] : "");
              if (field.name === "city") city = (field.values && field.values.length > 0 ? field.values[0] : "");
            });
          }

          phone = phone.replace(/[^0-9]/g, "");

          if (phone) {
            const existingLead = await prisma.lead.findFirst({ where: { phone, organizationId: org.id } });
            
            if (!existingLead) {
              let assignedToId = null;
              if (callers.length > 0) {
                const lastLead = await prisma.lead.findFirst({
                  where: { assignedToId: { in: callers.map(c => c.id) } },
                  orderBy: { id: "desc" }
                });

                let nextIndex = 0;
                if (lastLead && lastLead.assignedToId) {
                  const lastIndex = callers.findIndex(c => c.id === lastLead.assignedToId);
                  if (lastIndex !== -1) {
                    nextIndex = (lastIndex + 1) % callers.length;
                  }
                }
                assignedToId = callers[nextIndex].id;
              }

              await prisma.lead.create({
                data: {
                  name,
                  phone,
                  email,
                  city,
                  source: "META ADS",
                  status: "Fresh",
                  fbAd: lead.campaign_name || "Facebook Ad",
                  organizationId: org.id,
                  assignedToId,
                  assignedStatus: "PENDING",
                  assignedAt: new Date(lead.created_time || Date.now())
                }
              });
              totalAdded++;
            }
          }
        }
      }

      if (leadsData.paging && leadsData.paging.next) {
        url = leadsData.paging.next;
      } else {
        hasNext = false;
      }
    }
  }

  console.log(`\nDONE! Processed ${totalProcessed} historical leads from Meta.`);
  console.log(`Successfully imported ${totalAdded} new leads into the CRM.`);
}

fetchAllLeads()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

