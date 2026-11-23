export const META_FORM_CONFIG_KEY = "__metaFormVisibility";

export const INTERNAL_ORG_CONFIG_KEYS = new Set([
  META_FORM_CONFIG_KEY,
  "customSources",
  "globalSoundMuted",
  "soundMutedBy",
  "soundMutedAt",
]);

export interface KnownMetaForm {
  id: string;
  name: string;
  status?: string;
  leadsCount?: number;
  createdTime?: string;
  lastSeenAt?: string;
}

export interface MetaFormVisibilityConfig {
  hiddenMetaFormIds: string[];
  hiddenMetaFormNames: string[];
  autoHideNewForms: boolean;
  knownMetaForms: KnownMetaForm[];
}

export const DEFAULT_META_FORM_CONFIG: MetaFormVisibilityConfig = {
  hiddenMetaFormIds: [],
  hiddenMetaFormNames: [],
  autoHideNewForms: false,
  knownMetaForms: [],
};

export function normalizeFormName(name: string): string {
  return name.trim().toLowerCase();
}

export function extractMetaFormConfig(customFieldLabels: unknown): MetaFormVisibilityConfig {
  if (!customFieldLabels || typeof customFieldLabels !== "object" || Array.isArray(customFieldLabels)) {
    return { ...DEFAULT_META_FORM_CONFIG };
  }

  const raw = (customFieldLabels as Record<string, any>)[META_FORM_CONFIG_KEY];
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_META_FORM_CONFIG };
  }

  const hiddenMetaFormIds: string[] = Array.isArray(raw.hiddenMetaFormIds)
    ? Array.from(new Set<string>(raw.hiddenMetaFormIds.map((x: any) => String(x || "").trim()).filter(Boolean)))
    : [];

  const hiddenMetaFormNames: string[] = Array.isArray(raw.hiddenMetaFormNames)
    ? Array.from(new Set<string>(raw.hiddenMetaFormNames.map((x: any) => String(x || "").trim()).filter(Boolean)))
    : [];

  const knownMetaForms: KnownMetaForm[] = Array.isArray(raw.knownMetaForms)
    ? raw.knownMetaForms
        .filter((f: any) => f && typeof f === "object" && (f.id || f.name))
        .map((f: any) => ({
          id: String(f.id || "").trim(),
          name: String(f.name || "Untitled Form").trim(),
          status: f.status ? String(f.status) : undefined,
          leadsCount: typeof f.leadsCount === "number" ? f.leadsCount : undefined,
          createdTime: f.createdTime ? String(f.createdTime) : undefined,
          lastSeenAt: f.lastSeenAt ? String(f.lastSeenAt) : undefined,
        }))
    : [];

  return {
    hiddenMetaFormIds,
    hiddenMetaFormNames,
    autoHideNewForms: Boolean(raw.autoHideNewForms),
    knownMetaForms,
  };
}

export function mergeMetaFormConfigIntoLabels(
  existingLabels: unknown,
  config: MetaFormVisibilityConfig
): Record<string, any> {
  const base =
    existingLabels && typeof existingLabels === "object" && !Array.isArray(existingLabels)
      ? { ...(existingLabels as Record<string, any>) }
      : {};

  return {
    ...base,
    [META_FORM_CONFIG_KEY]: {
      hiddenMetaFormIds: Array.from(new Set(config.hiddenMetaFormIds.filter(Boolean))),
      hiddenMetaFormNames: Array.from(new Set(config.hiddenMetaFormNames.filter(Boolean))),
      autoHideNewForms: Boolean(config.autoHideNewForms),
      knownMetaForms: config.knownMetaForms || [],
    },
  };
}

export function stripInternalOrgConfigKeys(labels: unknown): Record<string, string> {
  if (!labels || typeof labels !== "object" || Array.isArray(labels)) return {};
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(labels as Record<string, any>)) {
    if (INTERNAL_ORG_CONFIG_KEYS.has(k) || k.startsWith("__")) continue;
    if (typeof v === "string") {
      result[k] = v;
    }
  }
  return result;
}

export function isLeadFromHiddenForm(
  leadCustomFields: unknown,
  config: MetaFormVisibilityConfig,
  assignedStatus?: string | null
): boolean {
  if (!config) return false;
  const cf =
    leadCustomFields && typeof leadCustomFields === "object" && !Array.isArray(leadCustomFields)
      ? (leadCustomFields as Record<string, any>)
      : {};

  const formId = typeof cf.metaFormId === "string" ? cf.metaFormId.trim() : "";
  const formName = typeof cf.metaFormName === "string" ? cf.metaFormName.trim() : "";

  if (formId && config.hiddenMetaFormIds.includes(formId)) {
    return true;
  }

  if (formName && config.hiddenMetaFormNames.length > 0) {
    const targetNorm = normalizeFormName(formName);
    if (config.hiddenMetaFormNames.some((n) => normalizeFormName(n) === targetNorm)) {
      return true;
    }
  }

  // If explicitly ingested silently under a hidden form and not yet assigned a visible form
  if (assignedStatus === "HIDDEN_FORM" && !formId && !formName) {
    return true;
  }

  return false;
}

export function filterVisibleLeads<T extends { customFields?: any; assignedStatus?: string | null }>(
  leads: T[],
  config: MetaFormVisibilityConfig
): T[] {
  if (!config || (config.hiddenMetaFormIds.length === 0 && config.hiddenMetaFormNames.length === 0)) {
    return leads;
  }
  return leads.filter((l) => !isLeadFromHiddenForm(l.customFields, config, l.assignedStatus));
}
