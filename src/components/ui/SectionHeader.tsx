import { type LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  emoji?: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function SectionHeader({ title, icon: Icon, emoji, subtitle, right }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {emoji && <span className="text-sm">{emoji}</span>}
        {Icon && <Icon size={14} className="text-t3" />}
        <h2 className="text-xs font-bold text-t3 uppercase tracking-wider">{title}</h2>
        {subtitle && <span className="text-2xs text-t4">{subtitle}</span>}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
