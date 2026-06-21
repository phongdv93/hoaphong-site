/**
 * Bot RPA (cảnh 2) — upload XML IDA lên cổng Khai báo Hải quan.
 *
 * Cài đặt (một lần):
 *   cd scripts/customs-portal-rpa
 *   npm install
 *   npm run install-browser
 *
 * Chạy:
 *   set CUSTOMS_PORTAL_USER=...
 *   set CUSTOMS_PORTAL_PASSWORD=...
 *   set CUSTOMS_IDA_XML_PATH=D:\path\IDA_HQS4324.xml
 *   npm run submit-ida
 *
 * Lưu ý: Selector UI cổng HQ đổi theo phiên bản — chỉnh file selectors.ts sau khi inspect trang.
 */

import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";
import { PORTAL_SELECTORS } from "./selectors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORTAL_URL =
  process.env.CUSTOMS_PORTAL_URL ||
  "https://e-declaration.customs.gov.vn:8443/#/eclare-ui/QLTKN/QLTKN_IDA";

const USER = process.env.CUSTOMS_PORTAL_USER?.trim();
const PASSWORD = process.env.CUSTOMS_PORTAL_PASSWORD?.trim();
const XML_PATH = process.env.CUSTOMS_IDA_XML_PATH?.trim();
const HEADLESS = process.env.CUSTOMS_RPA_HEADLESS !== "0";

async function main() {
  if (!USER || !PASSWORD) {
    console.error("Thiếu CUSTOMS_PORTAL_USER hoặc CUSTOMS_PORTAL_PASSWORD");
    process.exit(1);
  }
  if (!XML_PATH) {
    console.error("Thiếu CUSTOMS_IDA_XML_PATH (file XML từ ERP)");
    process.exit(1);
  }

  const absXml = path.isAbsolute(XML_PATH) ? XML_PATH : path.resolve(process.cwd(), XML_PATH);

  console.log("Mở cổng HQ:", PORTAL_URL);
  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await page.goto(PORTAL_URL, { waitUntil: "networkidle", timeout: 120_000 });

    // --- Đăng nhập: chỉnh selector trong selectors.ts theo màn hình thật ---
    if (PORTAL_SELECTORS.login.username) {
      await page.locator(PORTAL_SELECTORS.login.username).fill(USER);
      await page.locator(PORTAL_SELECTORS.login.password).fill(PASSWORD);
      await page.locator(PORTAL_SELECTORS.login.submit).click();
      await page.waitForTimeout(3000);
    }

    // --- Import XML (nếu cổng có nút Import — cập nhật selector sau khi inspect) ---
    if (PORTAL_SELECTORS.import.trigger) {
      await page.locator(PORTAL_SELECTORS.import.trigger).click();
      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        page.locator(PORTAL_SELECTORS.import.fileInput).click(),
      ]);
      await fileChooser.setFiles(absXml);
      if (PORTAL_SELECTORS.import.confirm) {
        await page.locator(PORTAL_SELECTORS.import.confirm).click();
      }
      await page.waitForTimeout(5000);
    } else {
      console.warn(
        "Chưa cấu hình selector Import — mở trình duyệt, import tay file:",
        absXml
      );
      await page.waitForTimeout(60_000);
    }

    const shotPath = path.join(__dirname, "last-submit.png");
    await page.screenshot({ path: shotPath, fullPage: true });
    console.log("Đã chụp màn hình:", shotPath);
    console.log(
      "Bước tiếp: trên cổng HQ chọn nghiệp vụ IDA → ký số → IDC (không tự động trong script mẫu)."
    );
  } catch (e) {
    const errShot = path.join(__dirname, "last-error.png");
    await page.screenshot({ path: errShot, fullPage: true }).catch(() => {});
    console.error(e);
    console.error("Ảnh lỗi:", errShot);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
