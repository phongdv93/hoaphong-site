export type BoardStatus = "available" | "issued";
export type BundleStatus = "in_stock" | "partial" | "depleted";

export interface WoodSpecies {
  id: number;
  code: string;
  name: string;
  pricePerM3: number;
  notes: string;
}

export interface ProductionOrder {
  id: number;
  poNumber: string;
  customerName: string;
  requiredVolumeM3: number | null;
  issuedVolumeM3: number;
  status: "open" | "closed";
  notes: string;
  createdAt: string;
}

export interface WoodBoard {
  id: number;
  bundleId: number;
  seqNo: number;
  widthMm: number;
  thicknessMm: number;
  lengthMm: number;
  volumeM3: number;
  posX: number;
  posY: number;
  posZ: number;
  status: BoardStatus;
  issuedToPoId: number | null;
  issuedAt: string | null;
}

export interface WoodBundle {
  id: number;
  code: string;
  speciesId: number;
  speciesName?: string;
  speciesCode?: string;
  packingListNo: string;
  supplier: string;
  thicknessMm: number;
  lengthMm: number;
  photoEndGrain: string;
  photoPackingList: string;
  photosJson: string;
  totalVolumeM3: number;
  remainingVolumeM3: number;
  boardCount: number;
  status: BundleStatus;
  notes: string;
  receivedAt: string;
  boards?: WoodBoard[];
}

export type { BoardGridLayout } from "./grid";

export interface BoardInput {
  widthMm: number;
  thicknessMm?: number;
  lengthMm?: number;
  quantity?: number;
}
