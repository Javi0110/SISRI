import { PrismaClient } from '@prisma/client'
import { NextResponse } from "next/server"

const prisma = new PrismaClient()


export async function GET() {
  try {
    const grids = await prisma.kilometerGrid.findMany({
      select: {
        id: true,
        usngCode: true,
        geometria: true,
        _count: {
          select: {
            propiedades: true,
            cuencas: true
          }
        }
      },
      orderBy: {
        usngCode: 'asc'
      },
      take: 100
    })

    return NextResponse.json(grids)
  } catch (error) {
    console.error("Error fetching grids:", error)
    return NextResponse.json(
      { error: "Error fetching grids" },
      { status: 500 }
    )
  }
} 