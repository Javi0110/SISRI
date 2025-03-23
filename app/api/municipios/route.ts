import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const municipios = await prisma.municipio.findMany({
      select: {
        id_municipio: true,
        nombre: true,
        latitud: true,
        longitud: true,
        codigo_municipio: true,
        barrios: {
          select: {
            id_barrio: true,
            nombre: true,
            sectores: {
              select: {
                id_sector: true,
                nombre: true
              }
            }
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    })

    return NextResponse.json(municipios, {
      headers: {
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    })
  } catch (error) {
    console.error('Error fetching municipios:', error)
    return NextResponse.json(
      { error: 'Failed to fetch municipios' },
      { status: 500 }
    )
  }
} 