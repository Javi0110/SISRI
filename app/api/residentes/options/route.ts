import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET() {
  try {
    // Get distinct values for condition, limitation, and disposition
    const [conditions, limitations, dispositions] = await Promise.all([
      prisma.habitantes.findMany({
        select: {
          condicion: true,
        },
        distinct: ['condicion'],
        where: {
          condicion: {
            not: null,
          },
        },
      }),
      prisma.habitantes.findMany({
        select: {
          limitacion: true,
        },
        distinct: ['limitacion'],
        where: {
          limitacion: {
            not: null,
          },
        },
      }),
      prisma.habitantes.findMany({
        select: {
          disposicion: true,
        },
        distinct: ['disposicion'],
        where: {
          disposicion: {
            not: null,
          },
        },
      }),
    ]);

    // Extract values from objects and filter out nulls
    const conditionValues = conditions
      .map((c: { condicion: string | null }) => c.condicion)
      .filter((c: string | null): c is string => !!c)
      .sort();
    
    const limitationValues = limitations
      .map((l: { limitacion: string | null }) => l.limitacion)
      .filter((l: string | null): l is string => !!l)
      .sort();
    
    const dispositionValues = dispositions
      .map((d: { disposicion: string | null }) => d.disposicion)
      .filter((d: string | null): d is string => !!d)
      .sort();

    return NextResponse.json({
      conditions: conditionValues,
      limitations: limitationValues,
      dispositions: dispositionValues,
    });
  } catch (error) {
    console.error('Error fetching resident options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resident options' },
      { status: 500 }
    );
  }
} 