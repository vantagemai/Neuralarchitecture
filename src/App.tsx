import { Users, Eye, BarChart3, MousePointerClick, Globe, TrendingUp, Camera } from 'lucide-react';
import { MetricCard } from './components/MetricCard';
import { FollowerChart } from './components/FollowerChart';
import { EngagementChart } from './components/EngagementChart';
import { HourlyActivityChart } from './components/HourlyActivityChart';
import { PostsTable } from './components/PostsTable';
import { DemographicsChart } from './components/DemographicsChart';
import { TopCities } from './components/TopCities';
import { StoriesMetrics } from './components/StoriesMetrics';
import { summaryMetrics } from './data/mockData';

function App() {
  return (
    <div className="min-h-screen bg-[#f8f9fc]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] flex items-center justify-center">
              <Camera size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Instagram Metrics</h1>
              <p className="text-xs text-gray-500">Dashboard de Metricas</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Ultimo update: Hoje, 14:30</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#833AB4] to-[#E1306C]" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard
            title="Seguidores"
            value={summaryMetrics.totalFollowers}
            change={summaryMetrics.followersChangePercent}
            icon={<Users size={20} />}
          />
          <MetricCard
            title="Alcance"
            value={summaryMetrics.totalReach}
            change={summaryMetrics.reachChange}
            icon={<Eye size={20} />}
          />
          <MetricCard
            title="Impressoes"
            value={summaryMetrics.totalImpressions}
            change={summaryMetrics.impressionsChange}
            icon={<BarChart3 size={20} />}
          />
          <MetricCard
            title="Engajamento"
            value={`${summaryMetrics.engagementRate}%`}
            change={summaryMetrics.engagementChange}
            icon={<TrendingUp size={20} />}
            format="percent"
          />
          <MetricCard
            title="Visitas ao Perfil"
            value={summaryMetrics.profileVisits}
            change={summaryMetrics.profileVisitsChange}
            icon={<MousePointerClick size={20} />}
          />
          <MetricCard
            title="Cliques no Site"
            value={summaryMetrics.websiteClicks}
            change={summaryMetrics.websiteClicksChange}
            icon={<Globe size={20} />}
          />
        </section>

        {/* Charts Row 1 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FollowerChart />
          <EngagementChart />
        </section>

        {/* Posts Table */}
        <PostsTable />

        {/* Charts Row 2 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StoriesMetrics />
          <HourlyActivityChart />
        </section>

        {/* Charts Row 3 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DemographicsChart />
          <TopCities />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-gray-400">
          Instagram Metrics Dashboard — Neural Architecture
        </div>
      </footer>
    </div>
  );
}

export default App;
