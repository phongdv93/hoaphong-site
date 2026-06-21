import { NextResponse } from "next/server";
import { runWithTenantCompany } from "@/lib/db/tenant-context";
import { getSessionUser } from "@/lib/auth";
import { resolveActiveCompanyForUser } from "./companies";
import { getProject } from "./repository";
import type { Project } from "./types";

export async function resolveProjectTenant(): Promise<
  | { err: NextResponse }
  | { user: { id: number }; companyId: number; run: <T>(fn: () => Promise<T>) => Promise<T> }
> {
  const user = await getSessionUser();
  if (!user) return { err: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const active = await resolveActiveCompanyForUser(user.id);
  if (!active) {
    return { err: NextResponse.json({ error: "Chưa chọn công ty" }, { status: 400 }) };
  }

  return {
    user,
    companyId: active.companyId,
    run: <T>(fn: () => Promise<T>) => runWithTenantCompany(active.companyId, fn),
  };
}

export async function loadProjectInTenant(
  projectId: number
): Promise<
  | { err: NextResponse }
  | {
      user: { id: number };
      companyId: number;
      project: Project;
      run: <T>(fn: () => Promise<T>) => Promise<T>;
    }
> {
  const base = await resolveProjectTenant();
  if ("err" in base) return base;

  const project = await base.run(() => getProject(projectId, base.companyId));
  if (!project) {
    return { err: NextResponse.json({ error: "Không tìm thấy dự án" }, { status: 404 }) };
  }

  return {
    user: base.user,
    companyId: base.companyId,
    project,
    run: base.run,
  };
}
