import { redirect } from "next/navigation";

/** Trang chi tiết đã gộp vào right panel trên timeline */
export default async function DuAnDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/erp/du-an?p=${id}`);
}
