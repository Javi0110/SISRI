import { PrismaClient } from '@prisma/client'
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const [municipios, barrios, sectores, cuencas] = await Promise.all([
      prisma.municipio.findMany({
        select: {
          id_municipio: true,
          nombre: true,
          codigo_municipio: true
        },
        orderBy: {
          nombre: 'asc'
        }
      }),
      prisma.barrio.findMany({
        select: {
          id_barrio: true,
          nombre: true,
          codigo_barrio: true,
          id_municipio: true
        },
        orderBy: {
          nombre: 'asc'
        }
      }),
      prisma.sector.findMany({
        select: {
          id_sector: true,
          nombre: true,
          codigo_sector: true,
          id_barrio: true
        },
        orderBy: {
          nombre: 'asc'
        }
      }),
      prisma.cuenca.findMany({
        select: {
          id: true,
          nombre: true,
          codigo_cuenca: true,
        },
        orderBy: {
          nombre: 'asc'
        }
      })
    ])

    return NextResponse.json({
      municipios,
      barrios,
      sectores,
      cuencas
    })
  } catch (error) {
    console.error("Error fetching form data:", error)
    return NextResponse.json(
      { error: "Error fetching form data" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 