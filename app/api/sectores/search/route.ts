import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')
    const barrioId = searchParams.get('barrioId')

    // Allow empty or short term searches to show all sectors for a barrio
    if (!barrioId) {
      return NextResponse.json(
        { error: 'Missing barrioId parameter' },
        { status: 400 }
      )
    }

    const whereClause: any = {
      id_barrio: parseInt(barrioId)
    };

    // Only add name filter if term is provided
    if (term && term.trim() !== '') {
      whereClause.nombre = {
        contains: term,
        mode: 'insensitive'
      };
    }

    const sectores = await prisma.sector.findMany({
      where: whereClause,
      select: {
        id_sector: true,
        nombre: true,
        codigo_sector: true,
        id_barrio: true
      },
      take: 20,
      orderBy: {
        nombre: 'asc'
      }
    })

    console.log(`Found ${sectores.length} sectores for barrio ${barrioId} with term "${term}"`);
    return NextResponse.json(sectores)
  } catch (error) {
    console.error('Error searching sectores:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 