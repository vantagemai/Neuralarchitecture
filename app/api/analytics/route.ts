import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format, subDays } from 'date-fns';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') ?? '30', 10);

    const today = new Date();
    const fromDate = format(subDays(today, days), 'yyyy-MM-dd');
    const toDate = format(today, 'yyyy-MM-dd');

    const records = await prisma.dailyRecord.findMany({
      where: {
        date: { gte: fromDate },
      },
      orderBy: { date: 'asc' },
      include: {
        campaigns: true,
        creatives: true,
        funnel: true,
        geo: true,
        decisions: true,
      },
    });

    // Build records summary
    const recordsSummary = records.map((r) => ({
      date: r.date,
      mer: r.mer,
      gastoTotal: r.gastoTotal,
      receitaTotal: r.receitaTotal,
      convTotal: r.convTotal,
      emq: r.emq,
    }));

    // Calculate funnel averages
    const recordsWithFunnel = records.filter((r) => r.funnel);
    const funnelAvg =
      recordsWithFunnel.length > 0
        ? {
            taxaEntrada:
              recordsWithFunnel.reduce((sum, r) => sum + (r.funnel?.taxaEntrada ?? 0), 0) /
              recordsWithFunnel.length,
            taxaCheckout:
              recordsWithFunnel.reduce((sum, r) => sum + (r.funnel?.taxaCheckout ?? 0), 0) /
              recordsWithFunnel.length,
            taxaConv:
              recordsWithFunnel.reduce((sum, r) => sum + (r.funnel?.taxaConv ?? 0), 0) /
              recordsWithFunnel.length,
          }
        : { taxaEntrada: 0, taxaCheckout: 0, taxaConv: 0 };

    // Top creatives sorted by CPA ascending
    const allCreatives = records.flatMap((r) => r.creatives);
    const topCreatives = [...allCreatives].sort((a, b) => a.cpa - b.cpa);

    // Aggregate geo data
    const geoMap = new Map<string, { spent: number; conversions: number }>();

    function parseGeoString(geoStr: string) {
      // Format: "Country . R$XX . YY conv"
      if (!geoStr || geoStr.trim() === '') return null;
      const parts = geoStr.split('\u00b7').map((s) => s.trim());
      if (parts.length < 3) return null;

      const country = parts[0].trim();
      const spentMatch = parts[1].match(/R?\$?([\d.,]+)/);
      const convMatch = parts[2].match(/(\d+)/);

      const spent = spentMatch ? parseFloat(spentMatch[1].replace(',', '.')) : 0;
      const conversions = convMatch ? parseInt(convMatch[1], 10) : 0;

      return { country, spent, conversions };
    }

    for (const record of records) {
      if (!record.geo) continue;

      const geoStrings = [record.geo.top1, record.geo.top2, record.geo.top3];
      for (const geoStr of geoStrings) {
        const parsed = parseGeoString(geoStr);
        if (!parsed) continue;

        const existing = geoMap.get(parsed.country) ?? { spent: 0, conversions: 0 };
        geoMap.set(parsed.country, {
          spent: existing.spent + parsed.spent,
          conversions: existing.conversions + parsed.conversions,
        });
      }
    }

    const topGeo = Array.from(geoMap.entries()).map(([country, data]) => ({
      country,
      spent: data.spent,
      conversions: data.conversions,
    }));

    // Generate alerts
    const alerts: Array<{ type: 'danger' | 'warning'; message: string }> = [];

    // Check EMQ < 6 in last 3 records
    const last3 = records.slice(-3);
    if (last3.length >= 3 && last3.every((r) => r.emq < 6)) {
      alerts.push({
        type: 'danger',
        message: 'EMQ abaixo de 6 nos ultimos 3 dias consecutivos',
      });
    }

    // Check any campaign with frequency > 5
    const highFreqCampaigns = records.flatMap((r) =>
      r.campaigns.filter((c) => c.frequency > 5)
    );
    if (highFreqCampaigns.length > 0) {
      const uniqueNames = [...new Set(highFreqCampaigns.map((c) => c.name))];
      alerts.push({
        type: 'danger',
        message: `Campanhas com frequencia > 5: ${uniqueNames.join(', ')}`,
      });
    }

    // Check MER < 1.5 in last 7 records
    const last7 = records.slice(-7);
    if (last7.length >= 7 && last7.every((r) => r.mer < 1.5)) {
      alerts.push({
        type: 'warning',
        message: 'MER abaixo de 1.5 nos ultimos 7 dias consecutivos',
      });
    }

    // Check CPMr rising trend (3 consecutive days)
    if (records.length >= 3) {
      const recentRecords = records.slice(-3);
      const avgCpmrPerDay = recentRecords.map((r) => {
        if (r.campaigns.length === 0) return 0;
        return r.campaigns.reduce((sum, c) => sum + c.cpmr, 0) / r.campaigns.length;
      });

      if (
        avgCpmrPerDay[0] > 0 &&
        avgCpmrPerDay[1] > avgCpmrPerDay[0] &&
        avgCpmrPerDay[2] > avgCpmrPerDay[1]
      ) {
        alerts.push({
          type: 'warning',
          message: 'CPMr em tendencia de alta nos ultimos 3 dias consecutivos',
        });
      }
    }

    return NextResponse.json({
      records: recordsSummary,
      funnelAvg,
      topCreatives,
      topGeo,
      alerts,
    });
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
