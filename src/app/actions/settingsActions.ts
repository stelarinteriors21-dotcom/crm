"use server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/authActions";
import { revalidatePath } from "next/cache";
import {
  extractMetaFormConfig,
  mergeMetaFormConfigIntoLabels,
  INTERNAL_ORG_CONFIG_KEYS,
  KnownMetaForm,
} from "@/lib/metaFormConfig";
import { getOrgMetaFormDbStats } from "@/lib/metaFormFilter";
import { fetchMetaPageForms, syncMetaFormsAndBackfillLeads } from "@/lib/metaFormService";

export async function getOrganizationSettings() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return null;
  
  return prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { escalationEmails: true, customFieldLabels: true, customTags: true, requireGps: true }
  });
}

export async function updateEscalationEmails(emails: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) throw new Error("Unauthorized");
  
  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { escalationEmails: emails }
  });
  
  revalidatePath('/settings');
  return { success: true };
}

export async function updateCustomFieldLabels(labels: Record<string, string>) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) throw new Error("Unauthorized");

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { customFieldLabels: true },
  });

  // Preserve internal org configuration keys stored alongside custom field labels
  const existing =
    org?.customFieldLabels && typeof org.customFieldLabels === "object" && !Array.isArray(org.customFieldLabels)
      ? (org.customFieldLabels as Record<string, any>)
      : {};
  const preservedInternal: Record<string, any> = {};
  for (const [k, v] of Object.entries(existing)) {
    if (INTERNAL_ORG_CONFIG_KEYS.has(k) || k.startsWith("__")) {
      preservedInternal[k] = v;
    }
  }

  const sanitizedUserLabels: Record<string, string> = {};
  for (const [k, v] of Object.entries(labels || {})) {
    if (!INTERNAL_ORG_CONFIG_KEYS.has(k) && !k.startsWith("__") && typeof v === "string") {
      sanitizedUserLabels[k] = v;
    }
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      customFieldLabels: {
        ...sanitizedUserLabels,
        ...preservedInternal,
      },
    },
  });

  revalidatePath('/settings');
  return { success: true };
}
export async function updateCustomTags(tags: any[]) { 
  const user = await getCurrentUser(); 
  if (!user || !user.organizationId) throw new Error('Unauthorized'); 
  await prisma.organization.update({ 
    where: { id: user.organizationId }, 
    data: { customTags: tags } 
  }); 
  revalidatePath('/settings');
  revalidatePath('/leads');
  return { success: true }; 
}

export async function addCustomTag(tagName: string) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) throw new Error('Unauthorized');
  
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { customTags: true }
  });
  
  const currentTags: any[] = (org?.customTags as any[]) || [];
  if (currentTags.find(t => t.name.toLowerCase() === tagName.toLowerCase())) {
    return { success: false, error: "Tag already exists" };
  }
  
  // assign random pleasant color
  const colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
  const newTags = [...currentTags, { name: tagName, color: randomColor }];
  
  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { customTags: newTags }
  });
  
  revalidatePath('/settings');
  revalidatePath('/leads');
  return { success: true, color: randomColor };
}

export async function updateRequireGps(requireGps: boolean) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) throw new Error("Unauthorized");
  
  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { requireGps }
  });
  revalidatePath('/settings');
}

export async function getGlobalSoundMuted(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) return false;

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { customFieldLabels: true }
  });

  const cf = (org?.customFieldLabels as any) || {};
  return Boolean(cf.globalSoundMuted);
}

export async function toggleGlobalSoundMuted(): Promise<{ success: boolean; muted: boolean }> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) throw new Error("Unauthorized");
  if (user.role !== "ADMIN" && user.role !== "ROOT") {
    throw new Error("Only admins can override CRM sounds");
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { customFieldLabels: true }
  });

  const cf = (org?.customFieldLabels as any) || {};
  const newMuted = !cf.globalSoundMuted;

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      customFieldLabels: {
        ...cf,
        globalSoundMuted: newMuted,
        soundMutedBy: user.name || user.email,
        soundMutedAt: new Date().toISOString()
      }
    }
  });

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/leads');
  return { success: true, muted: newMuted };
}

export interface MetaFormListItem {
  id: string;
  name: string;
  status?: string;
  metaLeadsCount?: number;
  dbLeadsCount: number;
  createdTime?: string;
  isHidden: boolean;
}

export interface MetaFormsSettingsPayload {
  forms: MetaFormListItem[];
  hiddenMetaFormIds: string[];
  hiddenMetaFormNames: string[];
  autoHideNewForms: boolean;
  metaApiError?: string;
}

export async function getMetaFormsSettingsData(): Promise<MetaFormsSettingsPayload> {
  const user = await getCurrentUser();
  if (!user || !user.organizationId || (user.role !== "ADMIN" && user.role !== "ROOT")) {
    return {
      forms: [],
      hiddenMetaFormIds: [],
      hiddenMetaFormNames: [],
      autoHideNewForms: false,
    };
  }

  const [org, liveRes, dbStats] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { customFieldLabels: true },
    }),
    fetchMetaPageForms(),
    getOrgMetaFormDbStats(user.organizationId),
  ]);

  const config = extractMetaFormConfig(org?.customFieldLabels);
  const dbCountById = new Map<string, number>();
  const dbNameById = new Map<string, string>();
  const orphanDbForms: Array<{ name: string; count: number }> = [];

  for (const stat of dbStats) {
    if (stat.formId) {
      dbCountById.set(stat.formId, (dbCountById.get(stat.formId) || 0) + stat.leadCount);
      if (stat.formName && !dbNameById.has(stat.formId)) {
        dbNameById.set(stat.formId, stat.formName);
      }
    } else if (stat.formName) {
      orphanDbForms.push({ name: stat.formName, count: stat.leadCount });
    }
  }

  const mergedById = new Map<string, KnownMetaForm>();
  for (const cached of config.knownMetaForms) {
    if (cached.id) mergedById.set(cached.id, cached);
  }
  for (const live of liveRes.forms) {
    if (!live.id) continue;
    const prev = mergedById.get(live.id);
    mergedById.set(live.id, { ...(prev || {}), ...live });
  }
  dbCountById.forEach((_, formId) => {
    if (!mergedById.has(formId)) {
      mergedById.set(formId, {
        id: formId,
        name: dbNameById.get(formId) || `Form ${formId}`,
      });
    }
  });

  // Persist newly discovered live forms silently when autoHideNewForms is active
  if (liveRes.forms.length > 0) {
    const knownSet = new Set(config.knownMetaForms.map((f) => f.id));
    let addedNew = false;
    for (const f of liveRes.forms) {
      if (f.id && !knownSet.has(f.id)) {
        addedNew = true;
        if (config.autoHideNewForms && !config.hiddenMetaFormIds.includes(f.id)) {
          config.hiddenMetaFormIds.push(f.id);
        }
      }
    }
    if (addedNew || mergedById.size !== config.knownMetaForms.length) {
      config.knownMetaForms = Array.from(mergedById.values());
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: {
          customFieldLabels: mergeMetaFormConfigIntoLabels(org?.customFieldLabels, config),
        },
      });
    }
  }

  const hiddenIdSet = new Set(config.hiddenMetaFormIds);
  const hiddenNameSet = new Set(config.hiddenMetaFormNames.map((n) => n.trim().toLowerCase()));

  const forms: MetaFormListItem[] = Array.from(mergedById.values())
    .map((f) => ({
      id: f.id,
      name: f.name,
      status: f.status,
      metaLeadsCount: f.leadsCount,
      dbLeadsCount: dbCountById.get(f.id) || 0,
      createdTime: f.createdTime,
      isHidden: hiddenIdSet.has(f.id) || hiddenNameSet.has(f.name.trim().toLowerCase()),
    }))
    .sort((a, b) => {
      if (b.dbLeadsCount !== a.dbLeadsCount) return b.dbLeadsCount - a.dbLeadsCount;
      return (b.metaLeadsCount || 0) - (a.metaLeadsCount || 0);
    });

  // Include DB-only form names that didn't carry a formId
  for (const orphan of orphanDbForms) {
    if (!forms.some((f) => f.name.trim().toLowerCase() === orphan.name.trim().toLowerCase())) {
      forms.push({
        id: "",
        name: orphan.name,
        dbLeadsCount: orphan.count,
        isHidden: hiddenNameSet.has(orphan.name.trim().toLowerCase()),
      });
    }
  }

  return {
    forms,
    hiddenMetaFormIds: config.hiddenMetaFormIds,
    hiddenMetaFormNames: config.hiddenMetaFormNames,
    autoHideNewForms: config.autoHideNewForms,
    metaApiError: liveRes.error,
  };
}

export async function updateMetaFormVisibility(input: {
  hiddenMetaFormIds: string[];
  hiddenMetaFormNames: string[];
  autoHideNewForms: boolean;
}) {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) throw new Error("Unauthorized");
  if (user.role !== "ADMIN" && user.role !== "ROOT") {
    throw new Error("Only admins can change form visibility settings");
  }

  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { customFieldLabels: true },
  });

  const prevConfig = extractMetaFormConfig(org?.customFieldLabels);
  const nextConfig = {
    ...prevConfig,
    hiddenMetaFormIds: Array.from(new Set((input.hiddenMetaFormIds || []).map((x) => x.trim()).filter(Boolean))),
    hiddenMetaFormNames: Array.from(new Set((input.hiddenMetaFormNames || []).map((x) => x.trim()).filter(Boolean))),
    autoHideNewForms: Boolean(input.autoHideNewForms),
  };

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      customFieldLabels: mergeMetaFormConfigIntoLabels(org?.customFieldLabels, nextConfig),
    },
  });

  // Un-hide silent leads if their form was toggled back ON
  const reEnabledFormIds = prevConfig.hiddenMetaFormIds.filter(
    (id) => !nextConfig.hiddenMetaFormIds.includes(id)
  );
  if (reEnabledFormIds.length > 0) {
    await prisma.$executeRaw`
      UPDATE "Lead"
      SET "assignedStatus" = 'UNASSIGNED'
      WHERE "organizationId" = ${user.organizationId}
        AND "assignedStatus" = 'HIDDEN_FORM'
        AND ("customFields"->>'metaFormId') = ANY(${reEnabledFormIds}::text[])
    `;
  }

  revalidatePath("/settings");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  revalidatePath("/calls");
  revalidatePath("/analytics");
  revalidatePath("/reports");

  return { success: true };
}

export async function syncExistingMetaLeadForms() {
  const user = await getCurrentUser();
  if (!user || !user.organizationId) throw new Error("Unauthorized");
  if (user.role !== "ADMIN" && user.role !== "ROOT") {
    throw new Error("Only admins can sync Meta lead forms");
  }

  const result = await syncMetaFormsAndBackfillLeads(user.organizationId);
  const refreshedData = await getMetaFormsSettingsData();
  revalidatePath("/settings");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { ...result, data: refreshedData };
}
