import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: "Search query is required" }, { status: 400 })
  }

  try {
    const properties = await prisma.propiedades_existentes.findMany({
      where: {
        OR: [
          { property_types: { type_name: { contains: query } } },
          { direccion: { contains: query } },
        ],
      },
      include: {
        property_types: true,
        barrio: {
          include: {
            municipio: true,
          },
        },
        municipio: true,
        sector: true,
      },
      take: 10,
    })

    return NextResponse.json(properties)
  } catch (error) {
    console.error("Error searching properties:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

