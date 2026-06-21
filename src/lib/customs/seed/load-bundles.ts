import type { CustomsMasterType } from "@/lib/customs/master-data";
import customsOffices from "./customs-offices.json";
import borderGates from "./border-gates.json";
import importPorts from "./import-ports.json";
import exportPorts from "./export-ports.json";
import warehouses from "./warehouses.json";
import transportModes from "./transport-modes.json";
import procedureTypes from "./procedure-types.json";

export interface SeedItem {
  code: string;
  name: string;
  extra: string;
}

interface SeedBundle {
  version: string;
  source: string;
  items: SeedItem[];
}

const BUNDLES: Record<CustomsMasterType, SeedBundle> = {
  customs_office: customsOffices as SeedBundle,
  border_gate: borderGates as SeedBundle,
  import_port: importPorts as SeedBundle,
  export_port: exportPorts as SeedBundle,
  warehouse: warehouses as SeedBundle,
  transport_mode: transportModes as SeedBundle,
  procedure_type: procedureTypes as SeedBundle,
};

export function getSeedBundle(type: CustomsMasterType): SeedBundle | null {
  const bundle = BUNDLES[type];
  if (!bundle?.items?.length) return null;
  return bundle;
}

export function getAllSeedTypes(): CustomsMasterType[] {
  return (Object.keys(BUNDLES) as CustomsMasterType[]).filter(
    (t) => (BUNDLES[t]?.items?.length ?? 0) > 0
  );
}
