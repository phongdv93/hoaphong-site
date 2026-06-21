/**
 * Selector Playwright — cập nhật sau khi mở DevTools trên cổng e-declaration.
 * Để trống = script chỉ mở trang + chờ import tay.
 */
export const PORTAL_SELECTORS = {
  login: {
    username: process.env.CUSTOMS_RPA_SEL_USER || "",
    password: process.env.CUSTOMS_RPA_SEL_PASSWORD || "",
    submit: process.env.CUSTOMS_RPA_SEL_LOGIN_BTN || "",
  },
  import: {
    trigger: process.env.CUSTOMS_RPA_SEL_IMPORT_BTN || "",
    fileInput: process.env.CUSTOMS_RPA_SEL_FILE_INPUT || 'input[type="file"]',
    confirm: process.env.CUSTOMS_RPA_SEL_IMPORT_OK || "",
  },
  idaSubmit: process.env.CUSTOMS_RPA_SEL_IDA_SEND || "",
} as const;
