import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { weeklyEngagement } from '../data/mockData';

export function EngagementChart() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Engajamento Semanal</h3>
      <p className="text-sm text-gray-500 mb-6">Distribuicao por tipo de interacao</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyEngagement}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
            <Bar dataKey="likes" name="Curtidas" fill="#E1306C" radius={[4, 4, 0, 0]} />
            <Bar dataKey="comments" name="Comentarios" fill="#833AB4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="shares" name="Compartilhamentos" fill="#F77737" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saves" name="Salvos" fill="#FCAF45" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
