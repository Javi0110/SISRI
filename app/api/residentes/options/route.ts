import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET() {
  try {
    // Get all values for condition, limitation, and disposition from their respective tables
    const [conditions, limitations, dispositions] = await Promise.all([
      prisma.condicion.findMany({
        select: { id: true, nombre: true },
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.limitacion.findMany({
        select: { id: true, nombre: true },
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      }),
      prisma.disposiciones.findMany({
        select: { id: true, nombre: true },
        where: { activo: true },
        orderBy: { nombre: 'asc' },
      }),
    ]);

    return NextResponse.json({
      conditions,
      limitations,
      dispositions,
    });
  } catch (error) {
    console.error('Error fetching resident options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resident options' },
      { status: 500 }
    );
  }
} 