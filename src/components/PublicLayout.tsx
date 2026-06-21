import { PublicChrome } from "./PublicChrome";
import { getSettings } from "@/lib/settings";

export async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return <PublicChrome settings={settings}>{children}</PublicChrome>;
}
