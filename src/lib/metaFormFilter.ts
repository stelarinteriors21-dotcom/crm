import prisma from "@/lib/prisma";
import {
  extractMetaFormConfig,
  MetaFormVisibilityConfig,
  DEFAULT_META_FORM_CONFIG,
  normalizeFormName,
} from "./metaFormConfig";

export async function getOrgMetaFormConfig(organizationId: string): Promise<MetaFormVisibilityConfig> {
  if (!organizationId) return { ...DEFAULT_META_FORM_CONFIG };
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { customFieldLabels: true },
  });
  return extractMetaFormConfig(org?.customFieldLabels);
}

/**
 * Returns Lead IDs belonging to Meta forms currently marked as hidden for this organization.
 * Uses explicit PostgreSQL JSON extraction so leads without `metaFormId` (manual, Excel, WhatsApp)
 * are never accidentally filtered out.
 */
export async function getHiddenLeadIdsForOrg(
  organizationId: string,
  preloadedConfig?: MetaFormVisibilityConfig
): Promise<string[]> {
  if (!organizationId) return [];
  const config = preloadedConfig || (await getOrgMetaFormConfig(organizationId));

  const hiddenIds = config.hiddenMetaFormIds.filter(Boolean);
  const hiddenNamesNorm = config.hiddenMetaFormNames.map(normalizeFormName).filter(Boolean);

  if (hiddenIds.length === 0 && hiddenNamesNorm.length === 0) {
    return [];
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "Lead"
      WHERE "organizationId" = ${organizationId}
        AND (
          (${hiddenIds.length > 0} AND ("customFields"->>'metaFormId') = ANY(${hiddenIds}::text[]))
          OR (${hiddenNamesNorm.length > 0} AND LOWER(TRIM(COALESCE("customFields"->>'metaFormName', ''))) = ANY(${hiddenNamesNorm}::text[]))
        )
    `;
    return rows.map((r) => r.id);
  } catch (err) {
    console.error("Failed to query hidden form lead IDs:", err);
    return [];
  }
}

/**
 * Returns Prisma `where` exclusion (`{ id: { notIn: hiddenLeadIds } }`) when any forms are hidden.
 * Safe for `findMany`, `findFirst`, `count`, and `groupBy`.
 */
export async function getHiddenFormExclusionWhere(
  organizationId: string,
  preloadedConfig?: MetaFormVisibilityConfig
): Promise<Record<string, any>> {
  const hiddenIds = await getHiddenLeadIdsForOrg(organizationId, preloadedConfig);
  if (hiddenIds.length === 0) return {};
  return { id: { notIn: hiddenIds } };
}

/**
 * Global hidden lead ID lookup across all organizations for multi-org cron jobs (`escalate`, alerts).
 */
export async function getHiddenLeadIdsAllOrgs(): Promise<string[]> {
  const orgs = await prisma.organization.findMany({
    select: { id: true, customFieldLabels: true },
  });

  const allHiddenIds: string[] = [];
  for (const org of orgs) {
    const config = extractMetaFormConfig(org.customFieldLabels);
    if (config.hiddenMetaFormIds.length > 0 || config.hiddenMetaFormNames.length > 0) {
      const ids = await getHiddenLeadIdsForOrg(org.id, config);
      allHiddenIds.push(...ids);
    }
  }
  return allHiddenIds;
}

export interface DbMetaFormStat {
  formId: string;
  formName: string;
  leadCount: number;
}

/**
 * Summarizes distinct Meta forms currently tagged on leads inside Postgres for an org.
 */
export async function getOrgMetaFormDbStats(organizationId: string): Promise<DbMetaFormStat[]> {
  if (!organizationId) return [];
  try {
    const rows = await prisma.$queryRaw<
      Array<{ form_id: string | null; form_name: string | null; lead_count: bigint | number }>
    >`
      SELECT
        NULLIF(TRIM(COALESCE("customFields"->>'metaFormId', '')), '') AS form_id,
        NULLIF(TRIM(COALESCE("customFields"->>'metaFormName', '')), '') AS form_name,
        COUNT(*) AS lead_count
      FROM "Lead"
      WHERE "organizationId" = ${organizationId}
        AND (
          NULLIF(TRIM(COALESCE("customFields"->>'metaFormId', '')), '') IS NOT NULL
          OR NULLIF(TRIM(COALESCE("customFields"->>'metaFormName', '')), '') IS NOT NULL
        )
      GROUP BY form_id, form_name
      ORDER BY COUNT(*) DESC
    `;

    return rows.map((r) => ({
      formId: r.form_id || "",
      formName: r.form_name || (r.form_id ? `Form ${r.form_id}` : "Unknown Form"),
      leadCount: Number(r.lead_count || 0),
    }));
  } catch (err) {
    console.error("Failed to aggregate DB Meta form stats:", err);
    return [];
  }
}
