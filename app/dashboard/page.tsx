"use client";

import { useState, useEffect } from "react";
import MetricCard from "@/components/metric-card";
import AlertBadge from "@/components/alert-badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Cell,
} from "recharts";

interface Campaign {
  nome: string;
  pda: string;
  dias: number;
  hookRate: number;
  holdRate: number;
  conv: number;
  cpa: number;
  status: string;
}

interface GeoEntry {
  pais: string;
  cpaMedio: number;
  totalConversoes: number;
}

interface DailyRecord {
  date: string;
  mer: number;
  gastoTotal: number;
  receitaTotal: number;
  convTotal: number;
  campaigns?: Campaign[];
}

interface FunnelAvg {
  taxaEntrada: number;
  taxaCheckout: number;
  taxaConversao: number;
}

interface Alert {
  type: "danger" | "warning";
  message: string;
}

interface AnalyticsData {
  records: DailyRecord[];
  previousRecords: DailyRecord[];
  alerts: Alert[];
  funnelAvg: FunnelAvg;
  campaigns: Campaign[];
  geo: GeoEntry[];
}

const periods = [
  { label: "Hoje", days: 1 },
  { label: "7 dias", days: 7 },
  { label: "14 dias", days: 14 },
  { label: "30 dias", days: 30 },
];

const statusColors: Record<string, string> = {
  Testing: "bg-blue-500/20 text-blue-400",
  Winner: "bg-green-500/20 text-accent-green",
  Borderline: "bg-yellow-500/20 text-accent-yellow",
  Pausar: "bg-red-500/20 text-accent-red",
  OK: "bg-green-500/20 text-accent-green",
  "Aten\u00e7\u00e3o": "bg-yellow-500/20 text-accent-yellow",
  "Cr\u00edtico": "bg-red-500/20 text-accent-red",
};

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPct(value: number): string {
  return value.toFixed(1) + "%";
}

function calcChange(current: number, previous: number): number | undefined {
  if (!previous || previous === 0) return undefined;
  return ((current - previous) / Math.abs(previous)) * 100;
}

const darkTooltipStyle = {
  contentStyle: {
    backgroundColor: "#1a1a2e",
    border: "1px solid #2a2a3a",
    borderRadius: 8,
    color: "#e0e0f0",
  },
  itemStyle: { color: "#e0e0f0" },
  labelStyle: { color: "#6b6b85" },
};

export default function DashboardPage() {
  const [selectedDays, setSelectedDays] = useState(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?days=${selectedDays}`)
      .then((res) => res.json())
      .then((json: AnalyticsData) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedDays]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-muted text-lg">Carregando...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-accent-red text-lg">Erro ao carregar dados.</p>
      </div>
    );
  }

  const { records, previousRecords, alerts, funnelAvg, campaigns, geo } = data;

  // Current period aggregates
  const currentMerAvg =
    records.length > 0
      ? records.reduce((s, r) => s + r.mer, 0) / records.length
      : 0;
  const currentGasto = records.reduce((s, r) => s + r.gastoTotal, 0);
  const currentReceita = records.reduce((s, r) => s + r.receitaTotal, 0);
  const currentConv = records.reduce((s, r) => s + r.convTotal, 0);

  // Previous period aggregates
  const prevMerAvg =
    previousRecords && previousRecords.length > 0
      ? previousRecords.reduce((s, r) => s + r.mer, 0) /
        previousRecords.length
      : 0;
  const prevGasto =
    previousRecords?.reduce((s, r) => s + r.gastoTotal, 0) ?? 0;
  const prevReceita =
    previousRecords?.reduce((s, r) => s + r.receitaTotal, 0) ?? 0;
  const prevConv =
    previousRecords?.reduce((s, r) => s + r.convTotal, 0) ?? 0;

  const hasPrev = previousRecords && previousRecords.length > 0;

  // CPA per day from campaigns data within each record
  const cpaChartData = records
    .filter((r) => r.campaigns && r.campaigns.length > 0)
    .map((r) => {
      const avg =
        r.campaigns!.reduce((s, c) => s + c.cpa, 0) / r.campaigns!.length;
      return { date: r.date, cpa: parseFloat(avg.toFixed(2)) };
    });

  // Funnel chart data
  const funnelData = funnelAvg
    ? [
        { name: "Taxa Entrada", value: funnelAvg.taxaEntrada, fill: "#7c6fff" },
        {
          name: "Taxa Checkout",
          value: funnelAvg.taxaCheckout,
          fill: "#00d4aa",
        },
        {
          name: "Taxa Convers\u00e3o",
          value: funnelAvg.taxaConversao,
          fill: "#ff6b6b",
        },
      ]
    : [];

  // Sorted tables
  const sortedCampaigns = campaigns
    ? [...campaigns].sort((a, b) => a.cpa - b.cpa)
    : [];
  const sortedGeo = geo ? [...geo].sort((a, b) => a.cpaMedio - b.cpaMedio) : [];

  return (
    <div className="min-h-screen bg-bg p-6 md:p-10 space-y-8">
      {/* Period Selector */}
      <div className="flex flex-wrap gap-2">
        {periods.map((p) => (
          <button
            key={p.days}
            onClick={() => setSelectedDays(p.days)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedDays === p.days
                ? "bg-accent text-white"
                : "bg-card text-muted border border-border hover:text-text"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="MER M\u00e9dio"
          value={currentMerAvg.toFixed(2)}
          change={hasPrev ? calcChange(currentMerAvg, prevMerAvg) : undefined}
        />
        <MetricCard
          title="Gasto Total R$"
          value={formatBRL(currentGasto)}
          prefix="R$ "
          change={hasPrev ? calcChange(currentGasto, prevGasto) : undefined}
        />
        <MetricCard
          title="Receita Total R$"
          value={formatBRL(currentReceita)}
          prefix="R$ "
          change={hasPrev ? calcChange(currentReceita, prevReceita) : undefined}
        />
        <MetricCard
          title="Convers\u00f5es Totais"
          value={currentConv.toLocaleString("pt-BR")}
          change={hasPrev ? calcChange(currentConv, prevConv) : undefined}
        />
      </div>

      {/* Alerts */}
      {alerts && alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((alert, i) => (
            <AlertBadge key={i} type={alert.type} message={alert.message} />
          ))}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1 - MER over time */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-text font-semibold mb-4">MER ao longo do tempo</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={records}>
              <CartesianGrid stroke="#2a2a3a" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "#6b6b85", fontSize: 12 }} />
              <YAxis tick={{ fill: "#6b6b85", fontSize: 12 }} />
              <Tooltip {...darkTooltipStyle} />
              <ReferenceLine
                y={1.5}
                stroke="#ff6b6b"
                strokeDasharray="6 4"
                label={{ value: "1.5", fill: "#ff6b6b", fontSize: 11 }}
              />
              <ReferenceLine
                y={2.5}
                stroke="#00d4aa"
                strokeDasharray="6 4"
                label={{ value: "2.5", fill: "#00d4aa", fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="mer"
                stroke="#00d4aa"
                strokeWidth={2}
                dot={{ fill: "#00d4aa", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2 - Gasto vs Receita */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-text font-semibold mb-4">Gasto vs Receita</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={records}>
              <CartesianGrid stroke="#2a2a3a" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fill: "#6b6b85", fontSize: 12 }} />
              <YAxis tick={{ fill: "#6b6b85", fontSize: 12 }} />
              <Tooltip {...darkTooltipStyle} />
              <Legend wrapperStyle={{ color: "#6b6b85" }} />
              <Bar dataKey="gastoTotal" name="Gasto" fill="#7c6fff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="receitaTotal" name="Receita" fill="#00d4aa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3 - CPA medio over time */}
        {cpaChartData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-text font-semibold mb-4">
              CPA m\u00e9dio ao longo do tempo
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cpaChartData}>
                <CartesianGrid stroke="#2a2a3a" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#6b6b85", fontSize: 12 }} />
                <YAxis tick={{ fill: "#6b6b85", fontSize: 12 }} />
                <Tooltip {...darkTooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="cpa"
                  stroke="#7c6fff"
                  strokeWidth={2}
                  dot={{ fill: "#7c6fff", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Chart 4 - Funnel */}
        {funnelData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-text font-semibold mb-4">Funil M\u00e9dio</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="vertical">
                <CartesianGrid stroke="#2a2a3a" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tick={{ fill: "#6b6b85", fontSize: 12 }}
                  tickFormatter={(v: number) => formatPct(v)}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "#6b6b85", fontSize: 12 }}
                  width={120}
                />
                <Tooltip
                  {...darkTooltipStyle}
                  formatter={(value: unknown) => formatPct(Number(value))}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Creatives Table */}
      {sortedCampaigns.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <h3 className="text-text font-semibold p-5 pb-3">Criativos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-left">
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">P.D.A.</th>
                  <th className="px-5 py-3 font-medium">Dias</th>
                  <th className="px-5 py-3 font-medium">Hook%</th>
                  <th className="px-5 py-3 font-medium">Hold%</th>
                  <th className="px-5 py-3 font-medium">Conv</th>
                  <th className="px-5 py-3 font-medium">CPA</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedCampaigns.map((c, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-b-0 hover:bg-surface transition-colors"
                  >
                    <td className="px-5 py-3 text-text">{c.nome}</td>
                    <td className="px-5 py-3 text-text font-mono">{c.pda}</td>
                    <td className="px-5 py-3 text-text font-mono">{c.dias}</td>
                    <td className="px-5 py-3 text-text font-mono">
                      {formatPct(c.hookRate)}
                    </td>
                    <td className="px-5 py-3 text-text font-mono">
                      {formatPct(c.holdRate)}
                    </td>
                    <td className="px-5 py-3 text-text font-mono">{c.conv}</td>
                    <td className="px-5 py-3 text-text font-mono">
                      R$ {formatBRL(c.cpa)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                          statusColors[c.status] ?? "bg-card text-muted"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Geo Table */}
      {sortedGeo.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <h3 className="text-text font-semibold p-5 pb-3">
            Distribui\u00e7\u00e3o Geogr\u00e1fica
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-left">
                  <th className="px-5 py-3 font-medium">Pa\u00eds</th>
                  <th className="px-5 py-3 font-medium">CPA M\u00e9dio</th>
                  <th className="px-5 py-3 font-medium">Total Convers\u00f5es</th>
                </tr>
              </thead>
              <tbody>
                {sortedGeo.map((g, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-b-0 hover:bg-surface transition-colors"
                  >
                    <td className="px-5 py-3 text-text">{g.pais}</td>
                    <td className="px-5 py-3 text-text font-mono">
                      R$ {formatBRL(g.cpaMedio)}
                    </td>
                    <td className="px-5 py-3 text-text font-mono">
                      {g.totalConversoes.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
