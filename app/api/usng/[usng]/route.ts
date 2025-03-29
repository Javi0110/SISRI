import { Cuenca, Eventos, Incidentes, PrismaClient, Propiedades_Existentes } from '@prisma/client'
import { NextResponse } from "next/server"

const prismaClient = new PrismaClient()

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
  _: Request,
  { params }: { params: { usng: string } }
): Promise<NextResponse<USNGResponse | { error: string }>> {
  try {
    const { usng } = params
    
    if (!usng) {
      return NextResponse.json(
        { error: "USNG parameter is required" },
        { status: 400 }
      )
    }

    // Decode and sanitize the USNG parameter
    const sanitizedUsng = decodeURIComponent(usng).trim();
    
    // Use a more efficient query with specific field selection
    const usngSquare = await prismaClient.uSNGSquare.findFirst({
      where: { 
        usng: sanitizedUsng
      },
      select: {
        usng: true,
        latitudes: true,
        longitudes: true,
        properties: {
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
        },
        eventos: {
          select: {
            incidentes: {
              select: {
                id: true,
                tipo: true,
                descripcion: true
              }
            }
          }
        }
      }
    }) as unknown as USNGSquareWithRelations | null

    if (!usngSquare) {
      return NextResponse.json(
        { error: "USNG square not found" }, 
        { status: 404 }
      )
    }

    // Parse coordinates more safely
    let centerLat = 0, centerLon = 0;
    try {
      const latitudes = usngSquare.latitudes.split(',');
      const longitudes = usngSquare.longitudes.split(',');
      
      if (latitudes.length > 0 && longitudes.length > 0) {
        centerLat = parseFloat(latitudes[0]);
        centerLon = parseFloat(longitudes[0]);
      }
      
      // Validate coordinates
      if (isNaN(centerLat) || isNaN(centerLon)) {
        throw new Error("Invalid coordinates");
      }
    } catch (error) {
      console.error("Error parsing coordinates:", error);
      // Fallback to Puerto Rico center if coordinates are invalid
      centerLat = 18.2208;
      centerLon = -66.5901;
    }

    const response: USNGResponse = {
      usng: usngSquare.usng,
      coordinates: [centerLon, centerLat],
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

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    })
  } catch (error) {
    console.error("Error fetching USNG data:", error)
    return NextResponse.json(
      { error: "Failed to fetch USNG data" },
      { status: 500 }
    )
  } finally {
    await prismaClient.$disconnect()
  }
} 