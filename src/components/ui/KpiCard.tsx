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
  red:     { bg: 'bg-vred/8',  border: 'border-vred/15',  text: 'text-vred',   icon: 'bg-vred/12 text-vred' },
  green:   { bg: 'bg-vgreen/8', border: 'border-vgreen/15', text: 'text-vgreen', icon: 'bg-vgreen/12 text-vgreen' },
  gold:    { bg: 'bg-vgold/8',  border: 'border-vgold/15',  text: 'text-vgold',  icon: 'bg-vgold/12 text-vgold' },
  purp:    { bg: 'bg-vpurp/8',  border: 'border-vpurp/15',  text: 'text-vpurp',  icon: 'bg-vpurp/12 text-vpurp' },
  blue:    { bg: 'bg-vblue/8',  border: 'border-vblue/15',  text: 'text-vblue',  icon: 'bg-vblue/12 text-vblue' },
  default: { bg: 'bg-surface',  border: 'border-b1',        text: 'text-t1',     icon: 'bg-elevated text-t2' },
};

export function KpiCard({ label, value, icon: Icon, trend, trendLabel, color = 'default', highlight }: KpiCardProps) {
  const c = COLORS[color];
  const isUp = trend && trend > 0;

  return (
    <div className={`rounded-xl border p-5 transition-all duration-200 hover:border-b3 ${
      highlight ? `${c.bg} ${c.border}` : `bg-surface ${c.border}`
    }`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-medium text-t3 uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.icon}`}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className={`text-2xl font-bold font-mono tracking-tight ${c.text}`}>
        {value}
      </div>
      {(trend !== undefined || trendLabel) && (
        <div className="flex items-center gap-1.5 mt-2">
          {trend !== undefined && (
            <span className={`flex items-center gap-0.5 text-xs font-semibold ${
              isUp ? 'text-vgreen' : 'text-vred'
            }`}>
              {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(trend)}%
            </span>
          )}
          {trendLabel && (
            <span className="text-[11px] text-t4">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
