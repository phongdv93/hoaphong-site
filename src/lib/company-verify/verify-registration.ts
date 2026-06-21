import { platformQueryOne } from "@/lib/db/platform";
import { aiConfirmCompanyName } from "./ai-match";
import { lookupBusinessByTaxCode } from "./lookup";
import { hasDuplicateTaxRegistration } from "./registration-log";
import {
  companyNamesMatch,
  isValidVietnamTaxCode,
  normalizeTaxCode,
} from "./tax-code";

export interface VerifyRegistrationInput {
  companyName: string;
  taxCode: string;
  phone?: string;
  address?: string;
  adminEmail: string;
}

export interface VerifyRegistrationResult {
  ok: boolean;
  reason?: string;
  details: Record<string, unknown>;
}

export async function verifyCompanyRegistration(
  input: VerifyRegistrationInput
): Promise<VerifyRegistrationResult> {
  const details: Record<string, unknown> = { steps: [] as string[] };
  const steps = details.steps as string[];

  const companyName = input.companyName.trim();
  const taxCode = normalizeTaxCode(input.taxCode);
  const phone = (input.phone ?? "").trim();
  const address = (input.address ?? "").trim();
  const email = input.adminEmail.trim().toLowerCase();
  details.submitted = { companyName, taxCode, phone, address: address || undefined };

  if (!companyName || companyName.length < 3) {
    return { ok: false, reason: "Tên công ty quá ngắn", details };
  }
  if (!taxCode) {
    return { ok: false, reason: "Mã số thuế bắt buộc", details };
  }
  if (!isValidVietnamTaxCode(taxCode)) {
    return { ok: false, reason: "Mã số thuế không hợp lệ (10 số + chữ số kiểm tra)", details };
  }
  if (!phone || phone.length < 8) {
    return { ok: false, reason: "Số điện thoại liên hệ bắt buộc", details };
  }
  steps.push("format_ok");

  const dup = await hasDuplicateTaxRegistration(taxCode);
  if (dup.duplicate) {
    return { ok: false, reason: dup.reason, details: { ...details, duplicate: true } };
  }
  steps.push("no_duplicate");

  const existingEmail = await platformQueryOne<{ id: number }>(
    `SELECT id FROM users WHERE LOWER(email) = $1`,
    [email]
  );
  if (existingEmail) {
    return {
      ok: false,
      reason:
        "Email đã có tài khoản — đăng nhập rồi liên hệ admin để được mời vào công ty mới, hoặc dùng email khác để đăng ký doanh nghiệp",
      details: { ...details, emailExists: true },
    };
  }
  steps.push("email_available");

  const lookup = await lookupBusinessByTaxCode(taxCode);
  details.lookup = lookup;

  if (lookup) {
    steps.push(`lookup_${lookup.source}`);
    if (lookup.status === "inactive") {
      return {
        ok: false,
        reason: "Doanh nghiệp không còn hoạt động theo dữ liệu tra cứu MST",
        details,
      };
    }
    const nameCheck = await aiConfirmCompanyName({
      submittedName: companyName,
      officialName: lookup.officialName,
      taxCode,
    });
    details.nameCheck = nameCheck;
    if (!nameCheck.match) {
      return {
        ok: false,
        reason: nameCheck.reason || "Tên công ty không khớp MST",
        details,
      };
    }
    steps.push("name_matched");
  } else {
    const rulesOnly = process.env.COMPANY_VERIFY_RULES_ONLY !== "0";
    if (!rulesOnly) {
      return {
        ok: false,
        reason:
          "Không tra cứu được MST — cấu hình COMPANY_MST_VERIFY_URL hoặc bật COMPANY_VERIFY_RULES_ONLY=1",
        details,
      };
    }
    steps.push("rules_only_no_lookup");
    if (companyName.length < 8) {
      return {
        ok: false,
        reason: "Khi chưa tra cứu được MST, tên công ty phải đủ chi tiết (≥ 8 ký tự)",
        details,
      };
    }
  }

  details.autoApprove = true;
  return { ok: true, details };
}

/** Kiểm tra nhanh tên khi có lookup nội bộ (test) */
export function quickNameMatch(a: string, b: string): boolean {
  return companyNamesMatch(a, b);
}
