import { PrismaClient } from '@prisma/client';
import { NextResponse } from "next/server";

const prismaClient = new PrismaClient()

// Define types for the response data
interface USNGResponse {
  usng: string
  coordinates: [number, number]
  properties: {
    id: number
    property_type_id: number
    valor: number
    direccion?: string | null
    type?: string | null
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
  eventos: {
    id: number
    titulo: string | null
    tipo: string | null
    estado: string | null
    fecha: Date
    descripcion: string | null
  }[]
  habitantes: {
    id: number
    nombre: string | null
    apellido1: string | null
    apellido2: string | null
    categoria: string | null
    rol: string | null
    edad: number | null
  }[]
}

// Define type for USNG square with included relations
type USNGSquareWithRelations = {
  usng: string
  latitudes: string
  longitudes: string
  propiedades: {
    id: number
    property_type_id: number
    gridId: number
    direccion: string | null
    property_types: { type_name: string } | null
  }[]
  cuencas: {
    id: number
    nombre: string
    codigo_cuenca: string
  }[]
  eventos: {
    id: number
    titulo: string | null
    tipo: string | null
    estado: string | null
    fecha: Date
    descripcion: string | null
  }[]
  habitantes: {
    id: number
    nombre: string | null
    apellido1: string | null
    apellido2: string | null
    categoria: string | null
    rol: string | null
    edad: number | null
  }[]
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
    const usngSquare = await prismaClient.usngsquare.findFirst({
      where: { 
        usng: sanitizedUsng
      },
      select: {
        usng: true,
        latitudes: true,
        longitudes: true,
        propiedades: {
          select: {
            id: true,
            property_type_id: true,
            gridId: true,
            direccion: true,
            property_types: { select: { type_name: true } }
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
            id: true,
            titulo: true,
            tipo: true,
            estado: true,
            fecha: true,
            descripcion: true
          }
        },
        habitantes: {
          select: {
            id: true,
            nombre: true,
            apellido1: true,
            apellido2: true,
            categoria: true,
            rol: true,
            edad: true
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
      const latitudes = usngSquare.latitudes?.split(',') || [];
      const longitudes = usngSquare.longitudes?.split(',') || [];
      
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
      usng: usngSquare.usng || '',
      coordinates: [centerLon, centerLat],
      properties: usngSquare.propiedades.map(prop => ({
        id: prop.id,
        property_type_id: prop.property_type_id || 0,
        valor: prop.gridId || 0,
        direccion: prop.direccion ?? null,
        type: prop.property_types?.type_name ?? null
      })),
      cuencas: usngSquare.cuencas.map(cuenca => ({
        id: cuenca.id,
        nombre: cuenca.nombre || '',
        codigo_cuenca: cuenca.codigo_cuenca || ''
      })),
      tools: [],
      eventos: usngSquare.eventos.map(e => ({
        id: e.id,
        titulo: e.titulo,
        tipo: e.tipo,
        estado: e.estado,
        fecha: e.fecha,
        descripcion: e.descripcion
      })),
      habitantes: usngSquare.habitantes.map(h => ({
        id: h.id,
        nombre: h.nombre,
        apellido1: h.apellido1,
        apellido2: h.apellido2,
        categoria: h.categoria,
        rol: h.rol,
        edad: h.edad
      }))
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