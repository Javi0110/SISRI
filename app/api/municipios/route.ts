import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    let whereClause = {}
    
    // If search parameter is provided, filter municipalities by name
    if (search) {
      whereClause = {
        nombre: {
          contains: search,
          mode: 'insensitive' as const
        }
      }
    }

    const municipios = await prisma.municipio.findMany({
      where: whereClause,
      select: {
        id_municipio: true,
        nombre: true,
        codigo_municipio: true,
        latitud: true,
        longitud: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    })

    return NextResponse.json(municipios)
  } catch (error) {
    console.error('Error fetching municipios:', error)
    return NextResponse.json(
      { error: 'Failed to fetch municipios' },
      { status: 500 }
    )
  }
} 