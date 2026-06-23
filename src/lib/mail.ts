import nodemailer from "nodemailer";

export interface MailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export function getMailConfig(): MailConfig {
  const host = process.env.SMTP_HOST?.trim() ?? "";
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS?.trim() ?? "";
  const fromRaw = process.env.MAIL_FROM?.trim() ?? "";
  const from = fromRaw.replace(/^["']|["']$/g, "") || user || "noreply@hoaphong.com.vn";
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = process.env.SMTP_SECURE === "1" || port === 465;
  return {
    enabled: Boolean(host && user && pass),
    host,
    port,
    secure,
    user,
    pass,
    from,
  };
}

async function sendMail(opts: { to: string; subject: string; text: string; html?: string }) {
  const cfg = getMailConfig();
  if (!cfg.enabled) {
    console.info("[mail] SMTP chưa cấu hình — bỏ qua gửi tới", opts.to);
    console.info("[mail]", opts.subject, "\n", opts.text);
    return { sent: false as const, reason: "smtp_not_configured" as const };
  }

  try {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
      ...(cfg.port === 587 && !cfg.secure ? { requireTLS: true } : {}),
    });

    await transport.sendMail({
      from: cfg.from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? opts.text.replace(/\n/g, "<br>"),
    });
    return { sent: true as const };
  } catch (err) {
    console.error("[mail] Gửi thất bại tới", opts.to, err);
    return {
      sent: false as const,
      reason: "send_failed" as const,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function sendStaffCredentialsEmail(input: {
  to: string;
  name: string;
  companyName: string;
  loginUrl: string;
  password: string;
}) {
  const text = [
    `Xin chào ${input.name},`,
    ``,
    `Quản trị viên đã tạo tài khoản ERP cho bạn tại ${input.companyName}.`,
    ``,
    `Đăng nhập: ${input.loginUrl}`,
    `Email: ${input.to}`,
    `Mật khẩu: ${input.password}`,
    ``,
    `Vui lòng đổi mật khẩu sau lần đăng nhập đầu tiên.`,
    ``,
    `— Hoa Phong ERP`,
  ].join("\n");

  return sendMail({
    to: input.to,
    subject: `[${input.companyName}] Tài khoản ERP của bạn`,
    text,
  });
}

export async function sendEmployeeRegisteredEmail(input: {
  to: string;
  name: string;
  companyName: string;
  loginUrl: string;
}) {
  const text = [
    `Xin chào ${input.name},`,
    ``,
    `Bạn đã đăng ký thành công tại ${input.companyName}.`,
    `Hồ sơ đang chờ quản trị viên duyệt — sau khi duyệt, đăng nhập tại:`,
    input.loginUrl,
    ``,
    `— Hoa Phong ERP`,
  ].join("\n");

  return sendMail({
    to: input.to,
    subject: `[${input.companyName}] Đăng ký nhân viên — chờ duyệt`,
    text,
  });
}

export async function sendMemberApprovedEmail(input: {
  to: string;
  name: string;
  companyName: string;
  loginUrl: string;
}) {
  const text = [
    `Xin chào ${input.name},`,
    ``,
    `Tài khoản của bạn tại ${input.companyName} đã được duyệt.`,
    `Đăng nhập ERP: ${input.loginUrl}`,
    ``,
    `— Hoa Phong ERP`,
  ].join("\n");

  return sendMail({
    to: input.to,
    subject: `[${input.companyName}] Tài khoản đã được duyệt`,
    text,
  });
}

/** Nhân viên đã có tài khoản ở công ty khác — được thêm vào công ty mới */
export async function sendMemberInvitedEmail(input: {
  to: string;
  name: string;
  companyName: string;
  loginUrl: string;
}) {
  const text = [
    `Xin chào ${input.name},`,
    ``,
    `Bạn đã được thêm vào công ty ${input.companyName} trên Hoa Phong ERP.`,
    `Dùng email và mật khẩu hiện tại để đăng nhập.`,
    `Sau khi đăng nhập, chọn công ty trong menu bên trái (hoặc vào link công ty):`,
    `${input.loginUrl}`,
    ``,
    `— Hoa Phong ERP`,
  ].join("\n");

  return sendMail({
    to: input.to,
    subject: `[${input.companyName}] Bạn được thêm vào công ty`,
    text,
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
  otp: string;
  otpExpiresMinutes: number;
  expiresMinutes: number;
}) {
  const text = [
    `Xin chào ${input.name},`,
    ``,
    `Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu ERP.`,
    ``,
    `Mã OTP (nhập tại trang Quên mật khẩu): ${input.otp}`,
    `Hiệu lực ${input.otpExpiresMinutes} phút.`,
    ``,
    `Hoặc nhấn link sau trong vòng ${input.expiresMinutes} phút:`,
    input.resetUrl,
    ``,
    `Nếu không phải bạn, bỏ qua email này.`,
    ``,
    `— Hoa Phong ERP`,
  ].join("\n");

  const html = [
    `<p>Xin chào <strong>${input.name}</strong>,</p>`,
    `<p>Bạn đã yêu cầu đặt lại mật khẩu ERP.</p>`,
    `<p style="font-size:24px;font-weight:bold;letter-spacing:4px;font-family:monospace">${input.otp}</p>`,
    `<p>Mã OTP hiệu lực <strong>${input.otpExpiresMinutes} phút</strong>.</p>`,
    `<p>Hoặc <a href="${input.resetUrl}">nhấn vào đây</a> để đặt mật khẩu mới (hiệu lực ${input.expiresMinutes} phút).</p>`,
    `<p style="color:#888;font-size:12px">Nếu không phải bạn, bỏ qua email này.</p>`,
  ].join("");

  return sendMail({
    to: input.to,
    subject: `Mã OTP đặt lại mật khẩu ERP — ${input.otp}`,
    text,
    html,
  });
}

export function generateRandomPassword(): string {
  return `Hp${Math.random().toString(36).slice(2, 8)}!${Math.floor(Math.random() * 90 + 10)}`;
}
