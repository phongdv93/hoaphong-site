import { notFound } from "next/navigation";
import { getGroupById } from "@/lib/erp/modules";
import { GroupHub } from "@/components/erp/GroupHub";

const RESERVED = new Set(["kho-go", "admin", "login", "quan-tri"]);

export default async function ErpGroupPage({ params }: { params: Promise<{ group: string }> }) {
  const { group: groupId } = await params;
  if (RESERVED.has(groupId)) notFound();

  const group = getGroupById(groupId);
  if (!group) notFound();

  return <GroupHub group={group} />;
}
