import { PrismaClient, Propiedades_Existentes, Cuenca, Eventos, Incidentes } from '@prisma/client'
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

// Define types for the response data
interface USNGResponse {
  usng: string
  coordinates: [number, number]
  properties: {
    id: number
    tipo: string
    valor: number
  }[]
  cuencas: {
    id: number
    nombre: string
    codigo_cuenca: string
  }[]
  tools: {
    id: number
    tipo: string
    estado: string
  }[]
}

// Define type for USNG square with included relations
type USNGSquareWithRelations = {
  usng: string
  latitudes: string
  longitudes: string
  properties: Propiedades_Existentes[]
  cuencas: Cuenca[]
  eventos: (Eventos & {
    incidentes: Incidentes[]
  })[]
}

export async function GET(
  request: Request, 
  { params }: { params: { usng: string } }
): Promise<NextResponse<USNGResponse | { error: string }>> {
  try {
    const usngSquare = await prisma.uSNGSquare.findFirst({
      where: { 
        usng: decodeURIComponent(params.usng)
      },
      include: {
        properties: true,
        cuencas: true,
        eventos: {
          include: {
            incidentes: true
          }
        }
      }
    }) as USNGSquareWithRelations | null

    if (!usngSquare) {
      return NextResponse.json(
        { error: "USNG square not found" }, 
        { status: 404 }
      )
    }

    // Get first value from coordinates
    const firstLat = usngSquare.latitudes.split(',')[0]
    const firstLon = usngSquare.longitudes.split(',')[0]

    // Convert to numbers
    const centerLat = parseFloat(firstLat)
    const centerLon = parseFloat(firstLon)

    const response: USNGResponse = {
      usng: usngSquare.usng,
      coordinates: [centerLon, centerLat], // Use first coordinates
      properties: usngSquare.properties.map(prop => ({
        id: prop.id,
        tipo: prop.tipo,
        valor: prop.valor
      })),
      cuencas: usngSquare.cuencas.map(cuenca => ({
        id: cuenca.id,
        nombre: cuenca.nombre,
        codigo_cuenca: cuenca.codigo_cuenca
      })),
      tools: usngSquare.eventos.flatMap(evento => 
        evento.incidentes.map(incidente => ({
          id: incidente.id,
          tipo: incidente.tipo,
          estado: incidente.descripcion
        }))
      )
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error fetching USNG details:", error)
    return NextResponse.json(
      { error: "Failed to fetch USNG details" }, 
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
} 