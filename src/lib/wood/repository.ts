import { tenantQuery, tenantQueryOne, tenantWithTransaction } from "@/lib/db/tenant";
import type { PoolClient } from "pg";
import { boardVolumeM3 } from "./volume";
import { computeBundleLayout } from "./layout";
import { encodeGridInNotes, type BoardGridLayout } from "./grid";
import type { BoardInput, BundleStatus, WoodBoard, WoodBundle, WoodSpecies, ProductionOrder } from "./types";

function mapSpecies(row: Record<string, unknown>): WoodSpecies {
  return {
    id: row.id as number,
    code: row.code as string,
    name: row.name as string,
    pricePerM3: Number(row.price_per_m3),
    notes: row.notes as string,
  };
}

function mapBundle(row: Record<string, unknown>): WoodBundle {
  return {
    id: row.id as number,
    code: row.code as string,
    speciesId: row.species_id as number,
    speciesName: row.species_name as string | undefined,
    speciesCode: row.species_code as string | undefined,
    packingListNo: row.packing_list_no as string,
    supplier: row.supplier as string,
    thicknessMm: Number(row.thickness_mm),
    lengthMm: Number(row.length_mm),
    photoEndGrain: row.photo_end_grain as string,
    photoPackingList: row.photo_packing_list as string,
    photosJson: row.photos_json as string,
    totalVolumeM3: Number(row.total_volume_m3),
    remainingVolumeM3: Number(row.remaining_volume_m3),
    boardCount: row.board_count as number,
    status: row.status as WoodBundle["status"],
    notes: row.notes as string,
    receivedAt: String(row.received_at),
  };
}

function mapBoard(row: Record<string, unknown>): WoodBoard {
  return {
    id: row.id as number,
    bundleId: row.bundle_id as number,
    seqNo: row.seq_no as number,
    widthMm: Number(row.width_mm),
    thicknessMm: Number(row.thickness_mm),
    lengthMm: Number(row.length_mm),
    volumeM3: Number(row.volume_m3),
    posX: Number(row.pos_x),
    posY: Number(row.pos_y),
    posZ: Number(row.pos_z),
    status: row.status as WoodBoard["status"],
    issuedToPoId: (row.issued_to_po_id as number) ?? null,
    issuedAt: row.issued_at ? String(row.issued_at) : null,
  };
}

export async function listSpecies(): Promise<WoodSpecies[]> {
  const rows = await tenantQuery("SELECT * FROM wood_species ORDER BY name");
  return rows.map(mapSpecies);
}

export async function listBundles(): Promise<WoodBundle[]> {
  const rows = await tenantQuery(
    `SELECT b.*, s.name as species_name, s.code as species_code
     FROM wood_bundles b JOIN wood_species s ON s.id = b.species_id
     ORDER BY b.received_at DESC`
  );
  return rows.map(mapBundle);
}

export async function getBundle(id: number): Promise<WoodBundle | null> {
  const row = await tenantQueryOne(
    `SELECT b.*, s.name as species_name, s.code as species_code
     FROM wood_bundles b JOIN wood_species s ON s.id = b.species_id WHERE b.id = $1`,
    [id]
  );
  if (!row) return null;
  const bundle = mapBundle(row);
  const boards = await tenantQuery("SELECT * FROM wood_boards WHERE bundle_id = $1 ORDER BY seq_no", [id]);
  bundle.boards = boards.map(mapBoard);
  return bundle;
}

export async function listPOs(): Promise<ProductionOrder[]> {
  const rows = await tenantQuery("SELECT * FROM production_orders ORDER BY created_at DESC");
  return rows.map((row) => ({
    id: row.id as number,
    poNumber: row.po_number as string,
    customerName: row.customer_name as string,
    requiredVolumeM3: row.required_volume_m3 != null ? Number(row.required_volume_m3) : null,
    issuedVolumeM3: Number(row.issued_volume_m3),
    status: row.status as ProductionOrder["status"],
    notes: row.notes as string,
    createdAt: String(row.created_at),
  }));
}

export async function generateBundleCode(): Promise<string> {
  const row = await tenantQueryOne<{ c: string }>("SELECT COUNT(*)::int AS c FROM wood_bundles");
  const n = Number(row?.c ?? 0) + 1;
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `K-${ym}-${String(n).padStart(4, "0")}`;
}

export interface CreateBundleInput {
  speciesId: number;
  packingListNo: string;
  supplier?: string;
  thicknessMm: number;
  lengthMm: number;
  photoEndGrain?: string;
  photoPackingList?: string;
  photosJson?: string[];
  notes?: string;
  layoutGrid?: BoardGridLayout;
  boards: BoardInput[];
}

export async function createBundle(input: CreateBundleInput): Promise<number> {
  const code = await generateBundleCode();

  const flatBoards: { widthMm: number; thicknessMm: number; lengthMm: number }[] = [];
  for (const b of input.boards) {
    const qty = b.quantity ?? 1;
    const thickness = b.thicknessMm ?? input.thicknessMm;
    const length = b.lengthMm ?? input.lengthMm;
    for (let i = 0; i < qty; i++) {
      flatBoards.push({ widthMm: b.widthMm, thicknessMm: thickness, lengthMm: length });
    }
  }

  const layout = computeBundleLayout(flatBoards, input.lengthMm);
  let totalVol = 0;
  for (const b of layout) {
    totalVol += boardVolumeM3(b.lengthMm, b.widthMm, b.thicknessMm);
  }

  const notes = input.layoutGrid
    ? encodeGridInNotes(input.layoutGrid, input.notes ?? "")
    : input.notes ?? "";

  return tenantWithTransaction(async (client) => {
    const bundleRes = await client.query<{ id: number }>(
      `INSERT INTO wood_bundles (
        code, species_id, packing_list_no, supplier, thickness_mm, length_mm,
        photo_end_grain, photo_packing_list, photos_json,
        total_volume_m3, remaining_volume_m3, board_count, status, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'in_stock',$13)
      RETURNING id`,
      [
        code,
        input.speciesId,
        input.packingListNo,
        input.supplier ?? "",
        input.thicknessMm,
        input.lengthMm,
        input.photoEndGrain ?? "",
        input.photoPackingList ?? "",
        JSON.stringify(input.photosJson ?? []),
        totalVol,
        totalVol,
        layout.length,
        notes,
      ]
    );
    const bundleId = bundleRes.rows[0].id;

    for (let i = 0; i < layout.length; i++) {
      const b = layout[i];
      const vol = boardVolumeM3(b.lengthMm, b.widthMm, b.thicknessMm);
      await client.query(
        `INSERT INTO wood_boards (
          bundle_id, seq_no, width_mm, thickness_mm, length_mm, volume_m3,
          pos_x, pos_y, pos_z, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'available')`,
        [bundleId, i + 1, b.widthMm, b.thicknessMm, b.lengthMm, vol, b.posX, b.posY, b.posZ]
      );
    }

    return bundleId;
  });
}

export async function issueBoards(
  boardIds: number[],
  poId: number
): Promise<{ issued: number; errors: string[] }> {
  const errors: string[] = [];
  let issued = 0;
  for (const boardId of boardIds) {
    try {
      await issueBoard(boardId, poId);
      issued++;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : `Lỗi thanh #${boardId}`);
    }
  }
  return { issued, errors };
}

export async function issueBoard(boardId: number, poId: number): Promise<void> {
  await tenantWithTransaction(async (client) => {
    await issueBoardInTransaction(client, boardId, poId);
  });
}

async function issueBoardInTransaction(client: PoolClient, boardId: number, poId: number) {
  const boardRes = await client.query("SELECT * FROM wood_boards WHERE id = $1", [boardId]);
  const board = boardRes.rows[0] as Record<string, unknown> | undefined;
  if (!board) throw new Error("Không tìm thấy thanh gỗ");
  if (board.status === "issued") throw new Error("Thanh đã được phát");

  const volume = Number(board.volume_m3);
  const bundleId = board.bundle_id as number;

  await client.query(
    `UPDATE wood_boards SET status = 'issued', issued_to_po_id = $1, issued_at = NOW() WHERE id = $2`,
    [poId, boardId]
  );
  await client.query("INSERT INTO wood_issues (board_id, po_id, volume_m3) VALUES ($1,$2,$3)", [
    boardId,
    poId,
    volume,
  ]);
  await client.query(
    `UPDATE production_orders SET issued_volume_m3 = issued_volume_m3 + $1 WHERE id = $2`,
    [volume, poId]
  );

  const bundleRes = await client.query("SELECT remaining_volume_m3 FROM wood_bundles WHERE id = $1", [bundleId]);
  const remaining = Math.max(0, Number(bundleRes.rows[0].remaining_volume_m3) - volume);

  const issuedCountRes = await client.query(
    "SELECT COUNT(*)::int AS c FROM wood_boards WHERE bundle_id = $1 AND status = 'issued'",
    [bundleId]
  );
  const totalCountRes = await client.query("SELECT COUNT(*)::int AS c FROM wood_boards WHERE bundle_id = $1", [
    bundleId,
  ]);
  const issuedCount = issuedCountRes.rows[0].c as number;
  const totalCount = totalCountRes.rows[0].c as number;

  let status: BundleStatus = "partial";
  if (remaining <= 0.0001 || issuedCount >= totalCount) status = "depleted";
  else if (issuedCount === 0) status = "in_stock";

  await client.query("UPDATE wood_bundles SET remaining_volume_m3 = $1, status = $2 WHERE id = $3", [
    remaining,
    status,
    bundleId,
  ]);
}

export async function createPO(
  poNumber: string,
  customerName: string,
  requiredVolumeM3?: number,
  notes?: string
): Promise<number> {
  const res = await tenantQueryOne<{ id: number }>(
    `INSERT INTO production_orders (po_number, customer_name, required_volume_m3, notes)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [poNumber, customerName, requiredVolumeM3 ?? null, notes ?? ""]
  );
  return res!.id;
}

export async function getWoodStats() {
  const bundles = await tenantQueryOne<{ c: number; v: number }>(
    `SELECT COUNT(*)::int AS c, COALESCE(SUM(remaining_volume_m3),0)::float AS v
     FROM wood_bundles WHERE status != 'depleted'`
  );
  const boards = await tenantQueryOne<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM wood_boards WHERE status = 'available'"
  );
  const pos = await tenantQueryOne<{ c: number }>(
    "SELECT COUNT(*)::int AS c FROM production_orders WHERE status = 'open'"
  );
  return {
    bundleCount: bundles?.c ?? 0,
    totalVolumeM3: Number(bundles?.v ?? 0),
    availableBoards: boards?.c ?? 0,
    openPOs: pos?.c ?? 0,
  };
}
