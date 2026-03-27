import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const includeAll = {
  campaigns: true,
  creatives: true,
  funnel: true,
  geo: true,
  decisions: true,
};

export async function GET() {
  try {
    const records = await prisma.dailyRecord.findMany({
      orderBy: { date: 'desc' },
      include: includeAll,
    });

    return NextResponse.json(records);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch records' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      date,
      gastoTotal,
      receitaTotal,
      mer,
      emq,
      convTotal,
      campaigns,
      creatives,
      funnel,
      geo,
      decisions,
    } = body;

    const existing = await prisma.dailyRecord.findUnique({
      where: { date },
    });

    if (existing) {
      await prisma.campaign.deleteMany({ where: { recordId: existing.id } });
      await prisma.creative.deleteMany({ where: { recordId: existing.id } });
      await prisma.funnel.deleteMany({ where: { recordId: existing.id } });
      await prisma.geo.deleteMany({ where: { recordId: existing.id } });
      await prisma.decision.deleteMany({ where: { recordId: existing.id } });
    }

    const record = await prisma.dailyRecord.upsert({
      where: { date },
      update: {
        gastoTotal,
        receitaTotal,
        mer,
        emq,
        convTotal,
        campaigns: {
          create: campaigns ?? [],
        },
        creatives: {
          create: creatives ?? [],
        },
        funnel: funnel ? { create: funnel } : undefined,
        geo: geo ? { create: geo } : undefined,
        decisions: decisions ? { create: decisions } : undefined,
      },
      create: {
        date,
        gastoTotal,
        receitaTotal,
        mer,
        emq,
        convTotal,
        campaigns: {
          create: campaigns ?? [],
        },
        creatives: {
          create: creatives ?? [],
        },
        funnel: funnel ? { create: funnel } : undefined,
        geo: geo ? { create: geo } : undefined,
        decisions: decisions ? { create: decisions } : undefined,
      },
      include: includeAll,
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Failed to create/update record:', error);
    return NextResponse.json(
      { error: 'Failed to create/update record' },
      { status: 500 }
    );
  }
}
