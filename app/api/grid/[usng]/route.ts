import { PrismaClient } from '@prisma/client'
import { NextResponse } from "next/server"

const prisma = new PrismaClient()


export async function GET(
  request: Request,
  { params }: { params: { usng: string } }
) {
  try {
    const grid = await prisma.kilometerGrid.findUnique({
      where: {
        usngCode: params.usng,
      },
      include: {
        propiedades: {
          select: {
            id: true,
            tipo: true,
            valor: true
          }
        },
        cuencas: {
          select: {
            id: true,
            nombre: true,
            codigo_cuenca: true
          }
        }
      }
    })

    if (!grid) {
      return NextResponse.json({ error: "Grid not found" }, { status: 404 })
    }

    return NextResponse.json(grid)
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 