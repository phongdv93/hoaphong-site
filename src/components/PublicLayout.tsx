import { PublicChrome } from "./PublicChrome";
import { getSettings } from "@/lib/settings";
import { getNavMenu, visibleNavLinks } from "@/lib/nav-menu";

export async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const navLinks = visibleNavLinks(await getNavMenu());

  return (
    <PublicChrome settings={settings} navLinks={navLinks}>
      {children}
    </PublicChrome>
  );
}
