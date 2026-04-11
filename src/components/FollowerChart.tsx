import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { followerGrowth } from '../data/mockData';

export function FollowerChart() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Crescimento de Seguidores</h3>
      <p className="text-sm text-gray-500 mb-6">Ultimos 30 dias</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={followerGrowth}>
            <defs>
              <linearGradient id="followerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#833AB4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#833AB4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" interval={4} />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" domain={['dataMin - 50', 'dataMax + 50']} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(value) => [(value as number).toLocaleString('pt-BR'), 'Seguidores']}
            />
            <Area type="monotone" dataKey="followers" stroke="#833AB4" strokeWidth={2.5} fill="url(#followerGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
