import prisma from "@/lib/prisma";
import { notifyUser } from "@/app/actions/leadActions";
import {
  extractMetaFormConfig,
  mergeMetaFormConfigIntoLabels,
  isLeadFromHiddenForm,
  KnownMetaForm,
} from "./metaFormConfig";

export interface MetaFieldItem {
  name: string;
  values?: string[];
}

export interface ParsedMetaLeadFields {
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  propertyStatus: string | null;
  customFields: Record<string, string>;
}

export function normalizeIndianPhoneKey(phone: string): string {
  const digits = String(phone || "").replace(/[^0-9]/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function extractMetaLeadFields(fieldData: MetaFieldItem[] = []): ParsedMetaLeadFields {
  let name = "Unknown";
  let phone = "";
  let email: string | null = null;
  let city: string | null = null;
  let propertyStatus: string | null = null;
  const customFields: Record<string, string> = {};

  for (const field of fieldData) {
    const val = field.values?.[0] || "";
    if (field.name === "full_name" || field.name === "first_name") {
      name = val || "Unknown";
    } else if (field.name === "phone_number") {
      phone = val;
    } else if (field.name === "email") {
      email = val || null;
    } else if (field.name === "city") {
      city = val || null;
    } else if (field.name === "property_status" || field.name === "status_of_property") {
      propertyStatus = val || null;
    } else if (field.name) {
      customFields[field.name] = val;
    }
  }

  return {
    name,
    phone: phone.replace(/[^0-9]/g, ""),
    email,
    city,
    propertyStatus,
    customFields,
  };
}

export function getMetaGraphBaseUrl(): string {
  return (process.env.META_GRAPH_API_BASE || "https://graph.facebook.com/v19.0").replace(/\/+$/, "");
}

export async function fetchMetaPageForms(): Promise<{
  forms: KnownMetaForm[];
  error?: string;
}> {
  const token = process.env.META_PAGE_ACCESS_TOKEN || "";
  const pageId = process.env.META_PAGE_ID || "";
  const graphBase = getMetaGraphBaseUrl();

  if (!token || !pageId) {
    return {
      forms: [],
      error: "META_PAGE_ACCESS_TOKEN or META_PAGE_ID is not configured in environment.",
    };
  }

  try {
    // Try rich fields first; fall back to minimal fields if Graph API restricts leads_count
    let res = await fetch(
      `${graphBase}/${pageId}/leadgen_forms?fields=id,name,status,leads_count,created_time&limit=100&access_token=${token}`,
      { cache: "no-store" }
    );
    let data = await res.json();

    if (!res.ok || data?.error) {
      res = await fetch(
        `${graphBase}/${pageId}/leadgen_forms?fields=id,name,status&limit=100&access_token=${token}`,
        { cache: "no-store" }
      );
      data = await res.json();
    }

    if (!res.ok || !Array.isArray(data?.data)) {
      const msg = data?.error?.message || "Failed to load Meta Lead Forms from Graph API";
      return { forms: [], error: msg };
    }

    const forms: KnownMetaForm[] = data.data.map((f: any) => ({
      id: String(f.id || ""),
      name: String(f.name || `Form ${f.id}`),
      status: f.status ? String(f.status) : undefined,
      leadsCount: typeof f.leads_count === "number" ? f.leads_count : undefined,
      createdTime: f.created_time ? String(f.created_time) : undefined,
      lastSeenAt: new Date().toISOString(),
    }));

    return { forms };
  } catch (err: any) {
    return {
      forms: [],
      error: err?.message || "Network error contacting Meta Graph API",
    };
  }
}

export async function fetchSingleMetaFormMeta(formId: string): Promise<KnownMetaForm | null> {
  const token = process.env.META_PAGE_ACCESS_TOKEN || "";
  if (!token || !formId) return null;
  const graphBase = getMetaGraphBaseUrl();

  try {
    const res = await fetch(
      `${graphBase}/${formId}?fields=id,name,status&access_token=${token}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (res.ok && data?.id) {
      return {
        id: String(data.id),
        name: String(data.name || `Form ${data.id}`),
        status: data.status ? String(data.status) : undefined,
        lastSeenAt: new Date().toISOString(),
      };
    }
  } catch {}
  return null;
}

async function pickNextRoundRobinCaller(organizationId: string): Promise<string | null> {
  const callers = await prisma.user.findMany({
    where: {
      organizationId,
      role: "TELECALLER",
      leaves: {
        none: {
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  if (callers.length === 0) return null;

  const lastLead = await prisma.lead.findFirst({
    where: { assignedToId: { in: callers.map((c) => c.id) } },
    orderBy: { createdAt: "desc" },
  });

  let nextIndex = 0;
  if (lastLead?.assignedToId) {
    const lastIndex = callers.findIndex((c) => c.id === lastLead.assignedToId);
    if (lastIndex !== -1) {
      nextIndex = (lastIndex + 1) % callers.length;
    }
  }
  return callers[nextIndex].id;
}

/**
 * Registers newly encountered Meta forms in Organization config and applies
 * `autoHideNewForms` when enabled.
 */
async function ensureFormRegisteredAndGetConfig(
  organizationId: string,
  formId?: string | null,
  formName?: string | null
) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { customFieldLabels: true },
  });

  const config = extractMetaFormConfig(org?.customFieldLabels);
  const cleanFormId = (formId || "").trim();
  const cleanFormName = (formName || "").trim();

  if (!cleanFormId) return config;

  const existingIdx = config.knownMetaForms.findIndex((f) => f.id === cleanFormId);
  let dirty = false;

  if (existingIdx === -1) {
    config.knownMetaForms.push({
      id: cleanFormId,
      name: cleanFormName || `Form ${cleanFormId}`,
      lastSeenAt: new Date().toISOString(),
    });
    if (config.autoHideNewForms && !config.hiddenMetaFormIds.includes(cleanFormId)) {
      config.hiddenMetaFormIds.push(cleanFormId);
    }
    dirty = true;
  } else if (cleanFormName && config.knownMetaForms[existingIdx].name !== cleanFormName) {
    config.knownMetaForms[existingIdx] = {
      ...config.knownMetaForms[existingIdx],
      name: cleanFormName,
      lastSeenAt: new Date().toISOString(),
    };
    dirty = true;
  }

  if (dirty) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        customFieldLabels: mergeMetaFormConfigIntoLabels(org?.customFieldLabels, config),
      },
    });
  }

  return config;
}

export interface IngestMetaLeadInput {
  organizationId: string;
  formId?: string | null;
  formName?: string | null;
  leadgenId?: string | null;
  campaignName?: string | null;
  fieldData?: MetaFieldItem[];
  logPrefix?: string;
}

/**
 * Unified ingestion handler shared by Meta Polling Cron and Meta Webhook.
 * Tags every lead with `metaFormId` / `metaFormName` and respects form visibility settings:
 * hidden forms are saved silently (unassigned, no push alert, excluded from CRM views)
 * so toggling a form back ON reveals them without losing data.
 */
export async function ingestMetaLead(input: IngestMetaLeadInput): Promise<{
  added: boolean;
  hidden: boolean;
  leadId?: string;
}> {
  const { organizationId, leadgenId, campaignName, fieldData = [], logPrefix = "Meta" } = input;
  let formId = (input.formId || "").trim();
  let formName = (input.formName || "").trim();

  const parsed = extractMetaLeadFields(fieldData);
  if (!parsed.phone) {
    return { added: false, hidden: false };
  }

  // Resolve missing formName if webhook only provided form_id
  if (formId && !formName) {
    const preConfig = extractMetaFormConfig(
      (
        await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { customFieldLabels: true },
        })
      )?.customFieldLabels
    );
    const cached = preConfig.knownMetaForms.find((f) => f.id === formId);
    if (cached?.name) {
      formName = cached.name;
    } else {
      const fetched = await fetchSingleMetaFormMeta(formId);
      if (fetched?.name) formName = fetched.name;
    }
  }

  const config = await ensureFormRegisteredAndGetConfig(organizationId, formId, formName);

  const enrichedCustomFields: Record<string, any> = {
    ...parsed.customFields,
    ...(formId ? { metaFormId: formId } : {}),
    ...(formName ? { metaFormName: formName } : {}),
    ...(leadgenId ? { metaLeadgenId: leadgenId } : {}),
  };

  const isHidden = isLeadFromHiddenForm(enrichedCustomFields, config);

  const existingLead = await prisma.lead.findFirst({
    where: { phone: parsed.phone, organizationId },
  });

  if (existingLead) {
    const prevCf =
      existingLead.customFields && typeof existingLead.customFields === "object"
        ? (existingLead.customFields as Record<string, any>)
        : {};

    const needsFormTag =
      (formId && !prevCf.metaFormId) ||
      (formName && !prevCf.metaFormName) ||
      (!isHidden && existingLead.assignedStatus === "HIDDEN_FORM");

    if (needsFormTag) {
      let nextAssignedToId = existingLead.assignedToId;
      let nextAssignedStatus = existingLead.assignedStatus;
      let unhidLead = false;

      if (!isHidden && existingLead.assignedStatus === "HIDDEN_FORM" && !existingLead.assignedToId) {
        nextAssignedToId = await pickNextRoundRobinCaller(organizationId);
        nextAssignedStatus = nextAssignedToId ? "PENDING" : "UNASSIGNED";
        unhidLead = true;
      }

      await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          assignedToId: nextAssignedToId,
          assignedStatus: nextAssignedStatus,
          ...(unhidLead ? { assignedAt: new Date() } : {}),
          customFields: {
            ...prevCf,
            ...(formId ? { metaFormId: formId } : {}),
            ...(formName ? { metaFormName: formName } : {}),
            ...(leadgenId && !prevCf.metaLeadgenId ? { metaLeadgenId: leadgenId } : {}),
          },
        },
      });

      if (unhidLead && nextAssignedToId) {
        try {
          await notifyUser(
            nextAssignedToId,
            "New Lead Assigned",
            `You have a new Meta lead: ${existingLead.name}`,
            true
          );
        } catch (pushErr) {
          console.error("Failed to send push notification:", pushErr);
        }
      }
    }

    return { added: false, hidden: isHidden, leadId: existingLead.id };
  }

  if (isHidden) {
    const hiddenLead = await prisma.lead.create({
      data: {
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email,
        city: parsed.city,
        propertyStatus: parsed.propertyStatus,
        customFields: enrichedCustomFields,
        source: "META ADS",
        status: "Fresh",
        fbAd: campaignName || "Facebook Ad",
        organizationId,
        assignedToId: null,
        assignedStatus: "HIDDEN_FORM",
      },
    });
    console.log(
      `[${logPrefix}] Stored hidden-form lead silently (form=${formName || formId}): ${parsed.name} (${parsed.phone})`
    );
    return { added: true, hidden: true, leadId: hiddenLead.id };
  }

  const assignedToId = await pickNextRoundRobinCaller(organizationId);
  const createdLead = await prisma.lead.create({
    data: {
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      city: parsed.city,
      propertyStatus: parsed.propertyStatus,
      customFields: enrichedCustomFields,
      source: "META ADS",
      status: "Fresh",
      fbAd: campaignName || "Facebook Ad",
      organizationId,
      assignedToId,
      assignedStatus: assignedToId ? "PENDING" : "UNASSIGNED",
      assignedAt: new Date(),
    },
  });

  console.log(
    `[${logPrefix}] Ingested Meta Lead (form=${formName || formId}): ${parsed.name} (${parsed.phone}) -> ${assignedToId || "unassigned"}`
  );

  if (assignedToId) {
    try {
      await notifyUser(
        assignedToId,
        "New Lead Assigned",
        `You have a new Meta lead: ${parsed.name}`,
        true
      );
    } catch (pushErr) {
      console.error("Failed to send push notification:", pushErr);
    }
  }

  return { added: true, hidden: false, leadId: createdLead.id };
}

/**
 * Fetches live Meta Lead Forms, merges them into Org settings, and matches existing
 * CRM leads by last-10-digit phone number so historical leads get tagged with their
 * `metaFormId` and `metaFormName` without altering statuses or callers.
 */
export async function syncMetaFormsAndBackfillLeads(organizationId: string): Promise<{
  success: boolean;
  formsCount: number;
  matchedCount: number;
  error?: string;
}> {
  const token = process.env.META_PAGE_ACCESS_TOKEN || "";
  const { forms, error } = await fetchMetaPageForms();
  if (error || forms.length === 0) {
    return {
      success: false,
      formsCount: 0,
      matchedCount: 0,
      error: error || "No forms returned from Meta Graph API.",
    };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { customFieldLabels: true },
  });
  const config = extractMetaFormConfig(org?.customFieldLabels);

  const byId = new Map<string, KnownMetaForm>();
  for (const prev of config.knownMetaForms) {
    if (prev.id) byId.set(prev.id, prev);
  }
  for (const liveForm of forms) {
    const prev = byId.get(liveForm.id);
    byId.set(liveForm.id, { ...(prev || {}), ...liveForm });
    if (config.autoHideNewForms && !prev && !config.hiddenMetaFormIds.includes(liveForm.id)) {
      config.hiddenMetaFormIds.push(liveForm.id);
    }
  }
  config.knownMetaForms = Array.from(byId.values());

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      customFieldLabels: mergeMetaFormConfigIntoLabels(org?.customFieldLabels, config),
    },
  });

  // Load org leads missing metaFormId keyed by normalized 10-digit phone
  const orgLeads = await prisma.lead.findMany({
    where: { organizationId },
    select: { id: true, phone: true, customFields: true },
  });

  const phoneToLeads = new Map<string, Array<{ id: string; customFields: any }>>();
  for (const lead of orgLeads) {
    const cf =
      lead.customFields && typeof lead.customFields === "object"
        ? (lead.customFields as Record<string, any>)
        : {};
    if (cf.metaFormId) continue;

    const key = normalizeIndianPhoneKey(lead.phone);
    if (!key) continue;
    const arr = phoneToLeads.get(key) || [];
    arr.push({ id: lead.id, customFields: cf });
    phoneToLeads.set(key, arr);
  }

  const pendingUpdates: Array<{
    id: string;
    customFields: Record<string, any>;
  }> = [];
  const graphBase = getMetaGraphBaseUrl();

  if (token && phoneToLeads.size > 0) {
    for (const form of forms) {
      if (typeof form.leadsCount === "number" && form.leadsCount === 0) continue;

      let nextUrl: string | null =
        `${graphBase}/${form.id}/leads?fields=id,created_time,field_data&limit=500&access_token=${token}`;
      let pagesFetched = 0;

      while (nextUrl && pagesFetched < 4) {
        pagesFetched++;
        try {
          const res: Response = await fetch(nextUrl, { cache: "no-store" });
          const payload = await res.json();
          if (!res.ok || !Array.isArray(payload?.data)) break;

          for (const item of payload.data) {
            const parsed = extractMetaLeadFields(item.field_data || []);
            const phoneKey = normalizeIndianPhoneKey(parsed.phone);
            if (!phoneKey) continue;

            const matchingLeads = phoneToLeads.get(phoneKey);
            if (!matchingLeads || matchingLeads.length === 0) continue;

            for (const target of matchingLeads) {
              pendingUpdates.push({
                id: target.id,
                customFields: {
                  ...target.customFields,
                  metaFormId: form.id,
                  metaFormName: form.name,
                  ...(item.id && !target.customFields.metaLeadgenId ? { metaLeadgenId: item.id } : {}),
                },
              });
            }
            phoneToLeads.delete(phoneKey);
          }

          nextUrl = payload?.paging?.next || null;
        } catch (pageErr) {
          console.error(`Error paginating leads for form ${form.id}:`, pageErr);
          break;
        }
      }
    }
  }

  for (let i = 0; i < pendingUpdates.length; i += 15) {
    const batch = pendingUpdates.slice(i, i + 15);
    await Promise.all(
      batch.map((u) =>
        prisma.lead.update({
          where: { id: u.id },
          data: { customFields: u.customFields },
        })
      )
    );
  }

  return {
    success: true,
    formsCount: forms.length,
    matchedCount: pendingUpdates.length,
  };
}
