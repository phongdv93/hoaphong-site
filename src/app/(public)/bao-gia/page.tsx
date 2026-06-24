import { redirect } from "next/navigation";

/** Giữ URL cũ — chuyển sang mini tool public. */
export default function BaoGiaRedirectPage() {
  redirect("/mini-tool/bao-gia");
}
