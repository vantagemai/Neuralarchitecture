import { type LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: 'red' | 'green' | 'gold' | 'purp' | 'blue' | 'default';
  highlight?: boolean;
  sparkData?: number[];
}

const COLORS = {
  red:     { border: 'border-l-vred',   text: 'text-vred',   neon: 'neon-red',   icon: 'text-vred',   spark: '#F11013' },
  green:   { border: 'border-l-vgreen', text: 'text-vgreen', neon: 'neon-green', icon: 'text-vgreen', spark: '#00C864' },
  gold:    { border: 'border-l-vgold',  text: 'text-vgold',  neon: 'neon-gold',  icon: 'text-vgold',  spark: '#FFD130' },
  purp:    { border: 'border-l-vpurp',  text: 'text-vpurp',  neon: 'neon-purp',  icon: 'text-vpurp',  spark: '#9B7FE0' },
  blue:    { border: 'border-l-vblue',  text: 'text-vblue',  neon: 'neon-blue',  icon: 'text-vblue',  spark: '#5B9AF5' },
  default: { border: 'border-l-b3',     text: 'text-t1',     neon: '',           icon: 'text-t2',     spark: '#6B6B76' },
};

function Sparkline({ data, color, width = 80, height = 20 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 2) - 1}`).join(' ');
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="shrink-0 opacity-90">
      <polygon points={areaPoints} fill={color} opacity="0.15" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export function KpiCard({ label, value, icon: Icon, trend, trendLabel, color = 'default', sparkData }: KpiCardProps) {
  const c = COLORS[color];
  const isUp = trend && trend > 0;

  return (
    <div className={`bg-surface border border-b1 border-l-2 ${c.border} p-3 transition-all hover:bg-elevated/30`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] text-t4 uppercase tracking-[0.12em]">{label}</span>
        {Icon && <Icon size={12} className={`${c.icon} opacity-40`} />}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className={`text-xl font-bold tracking-tight ${c.text} ${c.neon}`}>{value}</div>
          {(trend !== undefined || trendLabel) && (
            <div className="flex items-center gap-1 mt-0.5">
              {trend !== undefined && (
                <span className={`flex items-center gap-0.5 text-[10px] font-bold ${isUp ? 'text-vgreen' : 'text-vred'}`}>
                  {isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {Math.abs(trend)}%
                </span>
              )}
              {trendLabel && <span className="text-[9px] text-t4">{trendLabel}</span>}
            </div>
          )}
        </div>
        {sparkData && <Sparkline data={sparkData} color={c.spark} />}
      </div>
    </div>
  );
}
