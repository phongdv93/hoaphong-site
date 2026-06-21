import { notFound } from "next/navigation";
import { getGroupById } from "@/lib/erp/modules";
import { ModuleStub } from "@/components/erp/ModuleStub";

const RESERVED = new Set(["kho-go", "admin", "login", "quan-tri"]);

export default async function ErpSubModulePage({
  params,
}: {
  params: Promise<{ group: string; sub: string }>;
}) {
  const { group: groupId, sub: subId } = await params;
  if (RESERVED.has(groupId)) notFound();

  const group = getGroupById(groupId);
  if (!group) notFound();

  const subModule = group.items.find((i) => i.id === subId);
  if (!subModule) notFound();

  return (
    <ModuleStub module={subModule} groupId={group.id} groupTitle={group.title} groupHref={group.href} />
  );
}
