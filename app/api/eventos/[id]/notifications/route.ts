import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = parseInt(params.id)
    const data = await request.json()
    
    // Verify the event exists
    const existingEvent = await prisma.eventos.findUnique({
      where: { id: eventId }
    })

    if (!existingEvent) {
      return NextResponse.json(
        { message: 'Event not found', error: 'Event does not exist' },
        { status: 404 }
      )
    }

    // Create new notification for the event
    const notification = await prisma.notificacion.create({
      data: {
        eventoId: eventId,
        tipo: data.tipo,
        mensaje: data.notificacion.create.mensaje,
        estado: data.notificacion.create.estado,
        fecha_creacion: new Date()
      }
    })

    // Add new properties if any
    if (data.propiedades_afectadas?.length > 0) {
      for (const prop of data.propiedades_afectadas) {
        // First create the property
        const newProperty = await prisma.propiedades_existentes.create({
          data: {
            property_type_id: prop.propiedad.create.property_type_id,
            id_municipio: prop.propiedad.create.id_municipio,
            id_barrio: prop.propiedad.create.id_barrio,
            id_sector: prop.propiedad.create.id_sector,
            geometria: prop.propiedad.create.geometria,
            habitantes: {
              create: prop.propiedad.create.habitantes.create
            }
          }
        })

        // Then create the property affectation
        await prisma.propiedades_afectadas.create({
          data: {
            eventoId: eventId,
            propiedadId: newProperty.id,
            daños: prop.daños
          }
        })
      }
    }

    // Add new incidents if any
    if (data.incidentes?.length > 0) {
      for (const incident of data.incidentes) {
        await prisma.incidentes.create({
          data: {
            id: await getNextIncidentId(),
            tipo: incident.tipo,
            descripcion: incident.descripcion,
            cuencaid: incident.cuencaId,
            eventoid: eventId,
            createdat: new Date().toISOString(),
            updatedat: new Date().toISOString()
          }
        })
      }
    }

    return NextResponse.json(
      { message: 'Notification added successfully', notification },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error adding notification:', error)
    return NextResponse.json(
      { message: 'Failed to add notification', error: String(error) },
      { status: 500 }
    )
  }
}

// Helper function to get next incident ID
async function getNextIncidentId(): Promise<number> {
  const lastIncident = await prisma.incidentes.findFirst({
    orderBy: { id: 'desc' }
  })
  return (lastIncident?.id || 0) + 1
} 