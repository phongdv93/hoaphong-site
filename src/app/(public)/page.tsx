import { HomeHub } from "@/components/home/HomeHub";
import { getSettings } from "@/lib/settings";

export default async function HomePage() {
  const settings = await getSettings();
  return <HomeHub settings={settings} />;
}
