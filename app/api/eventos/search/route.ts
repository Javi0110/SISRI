import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')

    if (!term) {
      return NextResponse.json({ error: 'Search term is required' }, { status: 400 })
    }

    const eventos = await prisma.eventos.findMany({
      where: {
        OR: [
          { titulo: { contains: term, mode: 'insensitive' } },
          { tipo: { contains: term, mode: 'insensitive' } },
          { descripcion: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        titulo: true,
        tipo: true,
        estado: true,
        fecha: true,
      },
      orderBy: {
        fecha: 'desc',
      },
      take: 10, // Limit to 10 results
    })

    return NextResponse.json(eventos)
  } catch (error) {
    console.error('Error searching events:', error)
    return NextResponse.json(
      { error: 'Failed to search events' },
      { status: 500 }
    )
  }
} 