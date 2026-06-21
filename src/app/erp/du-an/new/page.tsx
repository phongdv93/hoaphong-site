import { redirect } from "next/navigation";

/** Tạo dự án mở trong right panel */
export default function DuAnNewRedirect() {
  redirect("/erp/du-an?create=1");
}
