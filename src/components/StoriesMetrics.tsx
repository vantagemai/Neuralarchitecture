import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { storiesData } from '../data/mockData';

export function StoriesMetrics() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Performance dos Stories</h3>
      <p className="text-sm text-gray-500 mb-6">Ultimos 7 dias</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={storiesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
            <Line type="monotone" dataKey="views" name="Visualizacoes" stroke="#E1306C" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="replies" name="Respostas" stroke="#833AB4" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="tapsForward" name="Toques Avancados" stroke="#F77737" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
