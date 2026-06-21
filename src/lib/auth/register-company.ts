import { z } from "zod";
import { createSession, hashPassword } from "@/lib/auth";
import { logRegistrationRequest } from "@/lib/company-verify/registration-log";
import { verifyCompanyRegistration } from "@/lib/company-verify/verify-registration";
import { normalizeTaxCode } from "@/lib/company-verify/tax-code";
import { platformExecute, platformWithTransaction } from "@/lib/db/platform";
import {
  createCompany,
  getCompany,
} from "@/lib/projects/companies";

const schema = z.object({
  companyName: z.string().min(1, "Tên công ty bắt buộc"),
  taxCode: z.string().min(1, "Mã số thuế bắt buộc"),
  phone: z.string().min(1, "Điện thoại bắt buộc"),
  address: z.string().optional(),
  name: z.string().min(1, "Tên người quản trị bắt buộc"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu phải ≥ 6 ký tự"),
});

export type RegisterCompanyInput = z.infer<typeof schema>;

async function rollbackRegistration(userId: number, companyId?: number | null) {
  if (companyId) {
    await platformExecute(`DELETE FROM companies WHERE id = $1`, [companyId]);
  }
  if (userId) {
    await platformExecute(`DELETE FROM users WHERE id = $1`, [userId]);
  }
}

export async function registerCompanyAccount(
  raw: unknown
): Promise<{
  userId: number;
  companyId: number;
  companyCode: string;
  requestId: number;
  verifySummary: string;
  token: string;
}> {
  const parsed = schema.parse(raw);
  const email = parsed.email.trim().toLowerCase();
  const name = parsed.name.trim();
  const companyName = parsed.companyName.trim();
  const taxCode = normalizeTaxCode(parsed.taxCode);
  const phone = parsed.phone.trim();
  const address = (parsed.address ?? "").trim();

  const verification = await verifyCompanyRegistration({
    companyName,
    taxCode,
    phone,
    address,
    adminEmail: email,
  });

  if (!verification.ok) {
    await logRegistrationRequest({
      companyName,
      taxCode,
      phone,
      address,
      adminName: name,
      adminEmail: email,
      status: "rejected",
      verifyDetails: verification.details,
      rejectionReason: verification.reason,
    });
    throw new Error(verification.reason || "Hồ sơ không đạt điều kiện tự động duyệt");
  }

  const passwordHash = await hashPassword(parsed.password);
  let userId = 0;
  let companyId: number | null = null;

  try {
    await platformWithTransaction(async (client) => {
      const u = await client.query<{ id: number }>(
        `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id`,
        [email, passwordHash, name]
      );
      userId = u.rows[0].id;
    });

    companyId = await createCompany({
      name: companyName,
      taxCode,
      phone,
      address,
      email,
      createdBy: userId,
      selfService: true,
    });

    const company = await getCompany(companyId);
    if (!company) {
      throw new Error("Không tạo được công ty");
    }

    const requestId = await logRegistrationRequest({
      companyName,
      taxCode,
      phone,
      address,
      adminName: name,
      adminEmail: email,
      status: "auto_approved",
      verifyDetails: verification.details,
      companyId,
    });

    const token = await createSession(userId, email);

    const lookup = verification.details.lookup as { officialName?: string } | null | undefined;
    const verifySummary = lookup?.officialName
      ? `Đã xác minh MST — khớp: ${lookup.officialName}`
      : "Đã duyệt tự động theo quy tắc hệ thống";

    return {
      userId,
      companyId,
      companyCode: company.code,
      requestId,
      verifySummary,
      token,
    };
  } catch (err) {
    await rollbackRegistration(userId, companyId);
    throw err;
  }
}
