import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const includeAll = {
  campaigns: true,
  creatives: true,
  funnel: true,
  geo: true,
  decisions: true,
};

export async function GET(
  req: Request,
  { params }: { params: { date: string } }
) {
  try {
    const { date } = params;

    const record = await prisma.dailyRecord.findUnique({
      where: { date },
      include: includeAll,
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch record' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { date: string } }
) {
  try {
    const { date } = params;
    const body = await req.json();
    const {
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

    if (!existing) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    // Delete old relations
    await prisma.campaign.deleteMany({ where: { recordId: existing.id } });
    await prisma.creative.deleteMany({ where: { recordId: existing.id } });
    await prisma.funnel.deleteMany({ where: { recordId: existing.id } });
    await prisma.geo.deleteMany({ where: { recordId: existing.id } });
    await prisma.decision.deleteMany({ where: { recordId: existing.id } });

    // Update record and recreate relations
    const record = await prisma.dailyRecord.update({
      where: { date },
      data: {
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

    return NextResponse.json(record);
  } catch (error) {
    console.error('Failed to update record:', error);
    return NextResponse.json(
      { error: 'Failed to update record' },
      { status: 500 }
    );
  }
}
