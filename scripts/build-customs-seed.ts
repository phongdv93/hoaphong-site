/**
 * Build src/lib/customs/seed/*.json from markdown table (VNACCS-style list).
 * Source: data/customs/ma-chi-cuc-source.md (pipe table rows)
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "data/customs/ma-chi-cuc-source.md");
const OUT_DIR = path.join(ROOT, "src/lib/customs/seed");

interface ParsedRow {
  province: string;
  code: string;
  unitName: string;
  short: string;
  teamName: string;
  teamCode: string;
}

function parseTableRows(text: string): ParsedRow[] {
  const rows: ParsedRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith("|") || line.includes("---")) continue;
    const parts = line
      .split("|")
      .map((p) => p.trim())
      .filter((_, i, arr) => i > 0 && i < arr.length - 1);
    if (parts.length < 6) continue;
    const [province, code, unitName, short, teamName, teamCode] = parts;
    if (!/^[0-9]{2}[A-Z0-9]{2}$/i.test(code)) continue;
    if (province.toLowerCase().includes("tỉnh")) continue;
    rows.push({ province, code: code.toUpperCase(), unitName, short, teamName, teamCode });
  }
  return rows;
}

function pickDisplayName(row: ParsedRow): string {
  const unit = row.unitName.replace(/^Chi cục HQ\s*/i, "").trim();
  const team = row.teamName.trim();
  if (/^chi cục hq/i.test(team) || team === row.unitName) {
    return row.unitName.replace(/^Chi cục HQ\s*/i, "Hải quan ").trim();
  }
  if (/^đội/i.test(team)) {
    return `${unit} — ${team}`;
  }
  return `${unit} — ${team}`;
}

function scoreRow(row: ParsedRow): number {
  let s = 0;
  if (row.teamCode === "0") s += 5;
  if (/^chi cục hq/i.test(row.teamName)) s += 4;
  if (row.teamName === row.unitName) s += 3;
  if (/^đội nghiệp vụ$/i.test(row.teamName)) s += 2;
  return s;
}

function dedupeByCode(rows: ParsedRow[]): Array<{ code: string; name: string; extra: string }> {
  const byCode = new Map<string, { row: ParsedRow; score: number; teams: string[] }>();
  for (const row of rows) {
    const score = scoreRow(row);
    const prev = byCode.get(row.code);
    if (!prev || score > prev.score) {
      byCode.set(row.code, { row, score, teams: prev?.teams ?? [] });
    }
    const entry = byCode.get(row.code)!;
    const t = row.teamName.trim();
    if (t && !entry.teams.includes(t)) entry.teams.push(t);
  }
  return Array.from(byCode.values()).map(({ row, teams }) => {
    const name = pickDisplayName(row);
    const extraParts = [
      row.province,
      row.short ? `Mã rút gọn: ${row.short}` : "",
      teams.length > 1 ? `Đội: ${teams.slice(0, 4).join("; ")}` : "",
    ].filter(Boolean);
    return { code: row.code, name, extra: extraParts.join(" · ") };
  });
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`Missing ${SOURCE}`);
    process.exit(1);
  }
  const text = fs.readFileSync(SOURCE, "utf8");
  const parsed = parseTableRows(text);
  const offices = dedupeByCode(parsed).sort((a, b) => a.code.localeCompare(b.code));
  const importPorts = offices.filter(
    (o) =>
      /cửa khẩu|ck |cảng|sân bay|ga |cảng|biên|hàng không/i.test(o.name) ||
      /CK|Cảng|Ga|Sân bay|cửa khẩu/i.test(o.name)
  );
  const borderGates = importPorts;
  const warehouses = offices.filter((o) =>
    /kho|KCN|KCX|ICD|CFS|bãi|ngoại quan|logistics|bưu|CPN|khu công nghiệp|KCX/i.test(
      `${o.name} ${o.extra}`
    )
  );
  const exportPorts = [
    { code: "CNSHA", name: "Cảng Thượng Hải (Trung Quốc)", extra: "Cảng xuất phổ biến" },
    { code: "CNNGB", name: "Cảng Ninh Ba (Trung Quốc)", extra: "" },
    { code: "CNYTN", name: "Cảng Yantian / Shenzhen (Trung Quốc)", extra: "" },
    { code: "CNQIN", name: "Cảng Thanh Đảo (Trung Quốc)", extra: "" },
    { code: "HKHKG", name: "Hồng Kông", extra: "" },
    { code: "SGSIN", name: "Singapore", extra: "" },
    { code: "KRPUS", name: "Busan (Hàn Quốc)", extra: "" },
    { code: "JPYOK", name: "Yokohama (Nhật Bản)", extra: "" },
    { code: "JPTYO", name: "Tokyo (Nhật Bản)", extra: "" },
    { code: "TWKHH", name: "Kaohsiung (Đài Loan)", extra: "" },
    { code: "THBKK", name: "Bangkok (Thái Lan)", extra: "" },
    { code: "MYPKG", name: "Port Klang (Malaysia)", extra: "" },
    { code: "IDJKT", name: "Jakarta (Indonesia)", extra: "" },
    { code: "USLAX", name: "Los Angeles (Mỹ)", extra: "" },
    { code: "USNYC", name: "New York (Mỹ)", extra: "" },
    { code: "DEHAM", name: "Hamburg (Đức)", extra: "" },
    { code: "NLRTM", name: "Rotterdam (Hà Lan)", extra: "" },
    { code: "AEDXB", name: "Dubai (UAE)", extra: "" },
    { code: "INMAA", name: "Chennai (Ấn Độ)", extra: "" },
    { code: "VNSGN", name: "TP.HCM — cảng xuất nội địa", extra: "VN" },
    { code: "VNHPH", name: "Hải Phòng — cảng xuất nội địa", extra: "VN" },
    { code: "VNDAD", name: "Đà Nẵng — cảng xuất nội địa", extra: "VN" },
    { code: "VNHAN", name: "Hà Nội / Nội Bài — xuất hàng không", extra: "VN" },
  ];

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(OUT_DIR, "customs-offices.json"),
    JSON.stringify({ version: "vnaccs-2025", source: "hq-catalog", items: offices }, null, 0)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "border-gates.json"),
    JSON.stringify({ version: "vnaccs-2025", source: "hq-catalog", items: borderGates }, null, 0)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "import-ports.json"),
    JSON.stringify({ version: "vnaccs-2025", source: "hq-catalog", items: importPorts }, null, 0)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "export-ports.json"),
    JSON.stringify({ version: "vnaccs-2025", source: "unlocode-common", items: exportPorts }, null, 0)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "warehouses.json"),
    JSON.stringify({ version: "vnaccs-2025", source: "hq-catalog", items: warehouses }, null, 0)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "transport-modes.json"),
    JSON.stringify(
      {
        version: "hq-standard",
        source: "hq-catalog",
        items: [
          { code: "1", name: "Đường biển", extra: "Vận chuyển biển" },
          { code: "2", name: "Đường hàng không", extra: "Vận chuyển hàng không" },
          { code: "3", name: "Đường bộ", extra: "Vận chuyển bộ" },
          { code: "4", name: "Đường sắt", extra: "Vận chuyển đường sắt" },
          { code: "5", name: "Đường thủy nội địa", extra: "Vận chuyển thủy nội địa" },
          { code: "9", name: "Loại khác", extra: "" },
        ],
      },
      null,
      0
    )
  );
  fs.writeFileSync(
    path.join(OUT_DIR, "procedure-types.json"),
    JSON.stringify(
      {
        version: "hq-standard",
        source: "hq-catalog",
        items: [
          { code: "A11", name: "Kinh doanh nhập khẩu", extra: "Loại hình A11" },
          { code: "A12", name: "Sản xuất xuất khẩu", extra: "Loại hình A12" },
          { code: "A21", name: "Gia công", extra: "Loại hình A21" },
          { code: "A31", name: "Chế xuất", extra: "Loại hình A31" },
          { code: "A41", name: "Kinh doanh kho ngoại quan", extra: "Loại hình A41" },
          { code: "A42", name: "Kho ngoại quan", extra: "Loại hình A42" },
          { code: "A43", name: "Kho bảo thuế", extra: "Loại hình A43" },
          { code: "B11", name: "Tạm nhập tái xuất", extra: "Loại hình B11" },
          { code: "B12", name: "Tạm xuất tái nhập", extra: "Loại hình B12" },
          { code: "C11", name: "Hàng hóa quá cảnh", extra: "Loại hình C11" },
          { code: "G11", name: "Hàng gửi kho ngoại quan", extra: "Loại hình G11" },
          { code: "G12", name: "Hàng gửi kho CFS", extra: "Loại hình G12" },
          { code: "G13", name: "Hàng gửi kho ICD", extra: "Loại hình G13" },
          { code: "G14", name: "Hàng gửi kho bảo thuế", extra: "Loại hình G14" },
          { code: "G51", name: "Hàng nhập kho ngoại quan", extra: "Loại hình G51" },
          { code: "H11", name: "Hàng nhập khẩu kinh doanh", extra: "Loại hình H11" },
        ],
      },
      null,
      0
    )
  );
  console.log(
    `✓ offices=${offices.length} import_ports=${importPorts.length} warehouses=${warehouses.length} export_ports=${exportPorts.length}`
  );
}

main();
