import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')
    const municipioId = searchParams.get('municipioId')

    // Allow empty or short term searches to show all barrios for a municipio
    if (!municipioId) {
      return NextResponse.json(
        { error: 'Missing municipioId parameter' },
        { status: 400 }
      )
    }

    const whereClause: any = {
      id_municipio: parseInt(municipioId)
    };

    // Only add name filter if term is provided
    if (term && term.trim() !== '') {
      whereClause.nombre = {
        contains: term,
        mode: 'insensitive'
      };
    }

    const barrios = await prisma.barrio.findMany({
      where: whereClause,
      select: {
        id_barrio: true,
        nombre: true,
        codigo_barrio: true,
        id_municipio: true
      },
      take: 20,
      orderBy: {
        nombre: 'asc'
      }
    })

    console.log(`Found ${barrios.length} barrios for municipio ${municipioId} with term "${term}"`);
    return NextResponse.json(barrios)
  } catch (error) {
    console.error('Error searching barrios:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 