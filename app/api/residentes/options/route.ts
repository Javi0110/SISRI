import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET() {
  try {
    // Get all values for condition, limitation, and disposition from their respective tables
    const [conditions, limitations, dispositions] = await Promise.all([
      prisma.condicion.findMany({
        select: { nombre: true },
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.limitacion.findMany({
        select: { nombre: true },
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.disposiciones.findMany({
        select: { nombre: true },
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      }),
    ]);

    // Extract values from objects
    const conditionValues = conditions.map((c) => c.nombre);
    const limitationValues = limitations.map((l) => l.nombre);
    const dispositionValues = dispositions.map((d) => d.nombre);

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