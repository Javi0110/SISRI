import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const municipios = await prisma.municipio.findMany({
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