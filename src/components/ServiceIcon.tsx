import {
  Building2,
  Code,
  Package,
  Paintbrush,
  PenTool,
  Sofa,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  sofa: Sofa,
  paintbrush: Paintbrush,
  building: Building2,
  package: Package,
  zap: Zap,
  "pen-tool": PenTool,
  code: Code,
  sparkles: Sparkles,
};

export function ServiceIcon({ name, className = "w-6 h-6" }: { name: string; className?: string }) {
  const Icon = icons[name] || Sparkles;
  return <Icon className={className} />;
}
