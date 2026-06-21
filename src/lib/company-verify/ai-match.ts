import { companyNamesMatch } from "./tax-code";

/** So khớp tên bằng OpenAI khi tra cứu MST có tên chính thức */
export async function aiConfirmCompanyName(input: {
  submittedName: string;
  officialName: string;
  taxCode: string;
}): Promise<{ match: boolean; reason: string }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    const ok = companyNamesMatch(input.submittedName, input.officialName);
    return {
      match: ok,
      reason: ok
        ? "Tên khớp (so sánh tự động)"
        : "Tên công ty không khớp với MST đã tra cứu",
    };
  }

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Bạn kiểm tra đăng ký doanh nghiệp Việt Nam. Trả JSON: {\"match\":boolean,\"reason\":string}. match=true nếu tên người nhập và tên chính thức cùng một doanh nghiệp (khác dấu/TNHH/viết tắt vẫn OK).",
          },
          {
            role: "user",
            content: JSON.stringify({
              taxCode: input.taxCode,
              submittedName: input.submittedName,
              officialName: input.officialName,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const ok = companyNamesMatch(input.submittedName, input.officialName);
      return {
        match: ok,
        reason: ok ? "Tên khớp (AI lỗi, dùng so sánh dự phòng)" : "Tên không khớp MST",
      };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { match?: boolean; reason?: string };
    return {
      match: Boolean(parsed.match),
      reason: parsed.reason || (parsed.match ? "AI xác nhận khớp" : "AI từ chối"),
    };
  } catch {
    const ok = companyNamesMatch(input.submittedName, input.officialName);
    return {
      match: ok,
      reason: ok ? "Tên khớp (so sánh dự phòng)" : "Tên không khớp MST",
    };
  }
}
