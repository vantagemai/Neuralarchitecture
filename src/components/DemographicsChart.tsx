import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { demographics } from '../data/mockData';

export function DemographicsChart() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Demografia</h3>
      <p className="text-sm text-gray-500 mb-6">Distribuicao por idade e genero</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={demographics} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" unit="%" />
            <YAxis type="category" dataKey="ageGroup" tick={{ fontSize: 12 }} stroke="#9ca3af" width={50} />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(value: number) => [`${value}%`]}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '13px' }} />
            <Bar dataKey="male" name="Masculino" fill="#833AB4" radius={[0, 4, 4, 0]} />
            <Bar dataKey="female" name="Feminino" fill="#E1306C" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
