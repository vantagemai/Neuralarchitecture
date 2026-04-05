import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { hourlyActivity } from '../data/mockData';

export function HourlyActivityChart() {
  const maxEngagement = Math.max(...hourlyActivity.map(h => h.engagement));

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Melhor Horario para Postar</h3>
      <p className="text-sm text-gray-500 mb-6">Atividade dos seguidores por hora</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hourlyActivity}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(value: any) => [value, 'Engajamento']}
            />
            <Bar dataKey="engagement" radius={[4, 4, 0, 0]}>
              {hourlyActivity.map((entry) => (
                <Cell
                  key={entry.hour}
                  fill={entry.engagement >= maxEngagement * 0.8 ? '#E1306C' : entry.engagement >= maxEngagement * 0.5 ? '#833AB4' : '#e5e7eb'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
