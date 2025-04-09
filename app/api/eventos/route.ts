import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Get USNG grid reference first
    const grid = await prisma.usngsquare.findFirst({
      where: { usng: data.usngId }
    })

    if (!grid) {
      throw new Error('Invalid USNG grid reference')
    }

    // Create the event first to get its ID
    const evento = await prisma.eventos.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        fecha: new Date(data.fecha),
        tipo: data.tipo,
        estado: data.estado,
        usngId: grid.id,
        // Create notification
        notificaciones: {
          create: {
            tipo: data.tipo,
            mensaje: `${data.titulo} - ${data.descripcion}`,
            estado: data.estado,
            fecha_creacion: new Date()
          }
        },
        // Create properties with habitantes
        propiedades_afectadas: {
          create: data.propiedades_afectadas.map((prop: any) => {
            // Ensure we have valid IDs for required fields
            const municipioId = parseInt(prop.propiedad.create.id_municipio);
            const barrioId = prop.propiedad.create.id_barrio ? 
              parseInt(prop.propiedad.create.id_barrio) : 
              undefined;
            const sectorId = prop.propiedad.create.id_sector ? 
              parseInt(prop.propiedad.create.id_sector) : 
              undefined;

            return {
              daños: prop.daños || "No damage reported",
              propiedad: {
                create: {
                  tipo: prop.propiedad.create.tipo,
                  id_municipio: municipioId,
                  id_barrio: barrioId,
                  id_sector: sectorId,
                  gridId: grid.id,
                  geometria: prop.propiedad.create.geometria || null,
                  habitantes: prop.propiedad.create.habitantes?.create?.length > 0 ? {
                    create: prop.propiedad.create.habitantes.create
                  } : undefined
                }
              }
            };
          })
        }
      }
    });

    // Create incidents separately since they're not directly related in the schema
    if (data.incidentes?.length > 0) {
      // Get the last incident ID
      const lastIncident = await prisma.incidentes.findFirst({
        orderBy: { id: 'desc' }
      });
      const lastId = lastIncident?.id || 0;

      await prisma.incidentes.createMany({
        data: data.incidentes.map((incidente: any, index: number) => ({
          id: lastId + index + 1, // Generate sequential IDs
          eventoid: evento.id,
          tipo: incidente.tipo,
          descripcion: incidente.descripcion,
          cuencaid: incidente.cuencaId,
          createdat: new Date().toISOString(),
          updatedat: new Date().toISOString()
        }))
      })
    }

    return NextResponse.json(evento, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json(
      { message: 'Failed to create event', error: String(error) },
      { status: 500 }
    )
  }
} 