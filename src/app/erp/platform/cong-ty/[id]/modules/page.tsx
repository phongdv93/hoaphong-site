import { redirect } from "next/navigation";

/** Chuyển URL cũ sang trang quản lý công ty thống nhất. */
export default async function PlatformModulesLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/erp/platform/cong-ty/${id}`);
}
