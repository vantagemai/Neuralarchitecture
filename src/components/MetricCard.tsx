import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  format?: 'number' | 'percent';
}

export function MetricCard({ title, value, change, icon, format = 'number' }: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] flex items-center justify-center text-white">
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </span>
        <div className={`flex items-center gap-1 text-sm font-medium mb-1 ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          <span>
            {isPositive ? '+' : ''}{change}{format === 'percent' ? 'pp' : '%'}
          </span>
        </div>
      </div>
    </div>
  );
}
