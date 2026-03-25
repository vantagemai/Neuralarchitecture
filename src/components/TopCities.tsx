import { MapPin } from 'lucide-react';
import { topCities } from '../data/mockData';

export function TopCities() {
  const maxPercentage = topCities[0].percentage;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-1">
        <MapPin size={18} className="text-[#E1306C]" />
        <h3 className="text-lg font-semibold text-gray-900">Principais Cidades</h3>
      </div>
      <p className="text-sm text-gray-500 mb-6">Onde estao seus seguidores</p>
      <div className="space-y-4">
        {topCities.map((city) => (
          <div key={city.city}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-gray-700 font-medium">{city.city}</span>
              <span className="text-gray-500">{city.percentage}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#833AB4] to-[#E1306C] transition-all duration-500"
                style={{ width: `${(city.percentage / maxPercentage) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
