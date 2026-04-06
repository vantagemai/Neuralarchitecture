import { type LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: 'red' | 'green' | 'gold' | 'purp' | 'blue' | 'default';
  highlight?: boolean;
}

const COLORS = {
  red:     { border: 'border-l-vred',   text: 'text-vred',   neon: 'neon-red',   icon: 'text-vred' },
  green:   { border: 'border-l-vgreen', text: 'text-vgreen', neon: 'neon-green', icon: 'text-vgreen' },
  gold:    { border: 'border-l-vgold',  text: 'text-vgold',  neon: 'neon-gold',  icon: 'text-vgold' },
  purp:    { border: 'border-l-vpurp',  text: 'text-vpurp',  neon: 'neon-purp',  icon: 'text-vpurp' },
  blue:    { border: 'border-l-vblue',  text: 'text-vblue',  neon: 'neon-blue',  icon: 'text-vblue' },
  default: { border: 'border-l-b3',     text: 'text-t1',     neon: '',           icon: 'text-t2' },
};

export function KpiCard({ label, value, icon: Icon, trend, trendLabel, color = 'default' }: KpiCardProps) {
  const c = COLORS[color];
  const isUp = trend && trend > 0;

  return (
    <div className={`bg-surface border border-b1 border-l-[3px] ${c.border} rounded-lg p-4 transition-all duration-200 hover:border-b2 card-shadow`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-t4 uppercase tracking-[0.12em]">{label}</span>
        {Icon && <Icon size={15} className={`${c.icon} opacity-60`} />}
      </div>
      <div className={`text-2xl font-bold font-mono tracking-tight ${c.text} ${c.neon}`}>
        {value}
      </div>
      {(trend !== undefined || trendLabel) && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {trend !== undefined && (
            <span className={`flex items-center gap-0.5 text-[11px] font-bold font-mono ${
              isUp ? 'text-vgreen' : 'text-vred'
            }`}>
              {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trend)}%
            </span>
          )}
          {trendLabel && (
            <span className="text-[10px] text-t4">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
