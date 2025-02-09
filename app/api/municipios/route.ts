import { PrismaClient } from '@prisma/client'
import { NextResponse } from "next/server"

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
      }
    })

    return NextResponse.json(municipios)
  } catch (error) {
    console.error("Error fetching municipios:", error)
    return NextResponse.json(
      { error: "Error fetching municipios" },
      { status: 500 }
    )
  }
}

