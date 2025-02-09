import { PrismaClient } from '@prisma/client'
import { NextResponse } from "next/server"

const prisma = new PrismaClient()


export async function GET() {
  try {
    const [municipios, cuencas] = await Promise.all([
      prisma.municipio.findMany({
        select: {
          id_municipio: true,
          nombre: true,
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
      }),
      prisma.cuenca.findMany({
        select: {
          id: true,
          nombre: true,
          codigo_cuenca: true
        },
        orderBy: {
          nombre: 'asc'
        }
      })
    ])

    return NextResponse.json({ municipios, cuencas })
  } catch (error) {
    console.error("Error fetching form data:", error)
    return NextResponse.json(
      { error: "Error fetching form data" },
      { status: 500 }
    )
  }
} 