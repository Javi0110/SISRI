import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // First, get or create the notification
    let notificacion = await prisma.notificacion.upsert({
      where: { id: data.notificacionId },
      update: {},
      create: { id: data.notificacionId }
    })

    // Get USNG grid reference
    const grid = await prisma.uSNGSquare.findFirst({
      where: { usng: data.gridId }
    })

    if (!grid) {
      throw new Error('Invalid USNG grid reference')
    }

    // Create the event
    const evento = await prisma.eventos.create({
      data: {
        notificacionId: notificacion.id,
        titulo: data.titulo,
        descripcion: data.descripcion,
        fecha: new Date(data.fecha),
        gridId: grid.id,
        // Create incidents
        incidentes: {
          create: data.incidentes.map((incidente: any) => ({
            tipo: incidente.tipo,
            descripcion: incidente.descripcion,
            cuencaId: incidente.cuencaId
          }))
        },
        // Create properties
        propiedades_afectadas: {
          create: data.propiedades_afectadas.map((prop: any) => {
            // Ensure we have valid IDs for required fields
            const municipioId = parseInt(prop.propiedad.create.id_municipio);
            const barrioId = prop.propiedad.create.id_barrio ? 
              parseInt(prop.propiedad.create.id_barrio) : 
              1; // Default barrio ID
            const sectorId = prop.propiedad.create.id_sector ? 
              parseInt(prop.propiedad.create.id_sector) : 
              1; // Default sector ID

            return {
              daños: prop.daños || "No damage reported",
              propiedad: {
                create: {
                  tipo: prop.propiedad.create.tipo,
                  valor: prop.propiedad.create.valor || 0,
                  id_municipio: municipioId,
                  id_barrio: barrioId,
                  id_sector: sectorId,
                  gridId: grid.id,
                  geometria: {} // Default empty geometry
                }
              }
            };
          })
        }
      }
    });

    return NextResponse.json(evento, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { message: 'Failed to create event', error: String(error) },
      { status: 500 }
    )
  }
} 