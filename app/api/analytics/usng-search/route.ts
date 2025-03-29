import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const usng = searchParams.get('usng')

  if (!usng) {
    return NextResponse.json({ error: 'USNG parameter is required' }, { status: 400 })
  }

  try {
    // Use Promise.all to run queries concurrently
    const [properties, incidents] = await Promise.all([
      // Get properties for this USNG
      prisma.propiedades_Existentes.findMany({
        where: {
          grid: {
            usng: usng
          }
        },
        select: {
          id: true,
          tipo: true,
          valor: true
        }
      }),

      // Get incidents for this USNG
      prisma.incidentes.findMany({
        where: {
          evento: {
            grid: {
              usng: usng
            }
          }
        },
        select: {
          id: true,
          tipo: true,
          descripcion: true
        }
      })
    ])

    // Get cuencas for this USNG
    const cuencas = await prisma.cuenca.findMany({
      where: {
        grid: {
          usng: usng
        }
      },
      select: {
        id: true,
        nombre: true,
        codigo_cuenca: true
      }
    })

    // Get the USNG square details
    const usngSquare = await prisma.uSNGSquare.findUnique({
      where: { usng },
      select: {
        latitudes: true,
        longitudes: true
      }
    })

    // Parse coordinates
    const coordinates = usngSquare ? [
      parseFloat(usngSquare.longitudes.split(',')[0]),
      parseFloat(usngSquare.latitudes.split(',')[0])
    ] : null

    return NextResponse.json({
      data: {
        usng,
        coordinates,
        properties,
        cuencas,
        incidents
      }
    })
  } catch (error) {
    console.error('Error searching USNG:', error)
    return NextResponse.json(
      { error: 'Failed to search USNG' },
      { status: 500 }
    )
  }
} 