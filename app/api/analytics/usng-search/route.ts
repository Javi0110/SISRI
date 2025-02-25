import { NextResponse } from 'next/server'
import { PrismaClient, Propiedades_Existentes } from '@prisma/client';

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { usng } = await request.json()

    if (!usng) {
      return NextResponse.json({ error: 'USNG grid code is required' }, { status: 400 })
    }

    // Fetch all related data for the USNG grid
    const [properties, eventos, incidents] = await Promise.all([
      prisma.propiedades_Existentes.findMany({
        where: { grid: usng },
        include: {
          municipio: true,
          barrio: true,
        },
      }),
      prisma.eventos.findMany({
        where: { grid: usng },
      }),
      prisma.incidentes.findMany({
        where: { eventoId: { in: eventos.map((evento: any) => evento.id) } },
      }),
    ])

    return NextResponse.json({
      usng,
      properties,
      eventos,
      incidents,
    })
  } catch (error) {
    console.error('USNG search error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch USNG data' },
      { status: 500 }
    )
  }
} 