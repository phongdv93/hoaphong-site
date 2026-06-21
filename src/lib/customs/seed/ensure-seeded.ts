import {
  countCustomsMasterByType,
  importCustomsMasterDataBatch,
  type CustomsMasterType,
} from "@/lib/customs/master-data";
import { getAllSeedTypes, getSeedBundle } from "./load-bundles";
import hqOverrides from "./hq-overrides.json";

const seededCompanies = new Set<number>();

/** Nạp danh mục HQ mặc định vào tenant DB (một lần / process / công ty). */
export async function ensureCustomsMasterDataSeeded(companyId: number): Promise<void> {
  if (seededCompanies.has(companyId)) return;

  for (const type of getAllSeedTypes()) {
    const existing = await countCustomsMasterByType(companyId, type);
    if (existing > 0) continue;

    const bundle = getSeedBundle(type);
    if (!bundle) continue;

    await importCustomsMasterDataBatch(
      companyId,
      type,
      bundle.items,
      bundle.source || "hq-seed",
      bundle.version || "vnaccs"
    );
  }

  await seedHqOverrides(companyId);
  seededCompanies.add(companyId);
}

async function seedHqOverrides(companyId: number): Promise<void> {
  const bundle = hqOverrides as {
    version: string;
    source: string;
    items: Array<{
      types: CustomsMasterType[];
      code: string;
      name: string;
      extra: string;
    }>;
  };
  for (const item of bundle.items) {
    for (const type of item.types) {
      await importCustomsMasterDataBatch(
        companyId,
        type,
        [{ code: item.code, name: item.name, extra: item.extra }],
        bundle.source,
        bundle.version
      );
    }
  }
}

export async function reseedCustomsMasterData(
  companyId: number,
  types?: CustomsMasterType[]
): Promise<Record<string, number>> {
  const target = types?.length ? types : getAllSeedTypes();
  const out: Record<string, number> = {};
  for (const type of target) {
    const bundle = getSeedBundle(type);
    if (!bundle) continue;
    const r = await importCustomsMasterDataBatch(
      companyId,
      type,
      bundle.items,
      bundle.source || "hq-seed",
      bundle.version || "vnaccs"
    );
    out[type] = r.upserted;
  }
  seededCompanies.add(companyId);
  return out;
}
