import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    console.log('=== DEBUG: API Received Data ===');
    console.log('Raw request data:', JSON.stringify(data, null, 2));
    
    // Get USNG grid reference first
    console.log('=== DEBUG: Looking for USNG grid ===');
    console.log('Searching for USNG:', data.usngId);
    const grid = await prisma.usngsquare.findFirst({
      where: { usng: data.usngId }
    })
    console.log('Found grid:', grid);

    if (!grid) {
      return NextResponse.json(
        { message: 'Invalid USNG grid reference', error: 'USNG grid not found' },
        { status: 400 }
      )
    }

    // Create the event
    console.log('=== DEBUG: Creating Event ===');
    const eventData: Prisma.eventosCreateInput = {
      titulo: data.titulo,
      descripcion: data.descripcion,
      fecha: new Date(data.fecha),
      tipo: data.tipo,
      estado: data.estado || "pending",
      usngsquare: {
        connect: {
          id: grid.id
        }
      },
      notificaciones: {
        create: {
          tipo: data.tipo,
          mensaje: `${data.titulo} - ${data.descripcion}`,
          estado: data.estado || "pending",
          fecha_creacion: new Date()
        }
      }
    };

    // Only add propiedades_afectadas if there are properties
    if (data.propiedades_afectadas && data.propiedades_afectadas.length > 0) {
      eventData.propiedades_afectadas = {
        create: data.propiedades_afectadas.map((prop: any) => ({
          daños: prop.daños || "No damage reported",
          propiedad: {
            create: {
              tipo: prop.tipo || "Residential",
              gridId: grid.id,
              usngsquare: {
                connect: {
                  id: grid.id
                }
              }
            }
          }
        }))
      };
    }

    console.log('Event data to create:', JSON.stringify(eventData, null, 2));

    try {
      const evento = await prisma.eventos.create({
        data: eventData
      });
      console.log('Created event:', evento);

      // Create incidents separately since they're not directly related in the schema
      if (data.incidentes?.length > 0) {
        console.log('=== DEBUG: Creating Incidents ===');
        for (const incidente of data.incidentes) {
          await prisma.incidentes.create({
            data: {
              id: await getNextIncidentId(),
              tipo: incidente.tipo,
              descripcion: incidente.descripcion,
              cuencaid: incidente.cuencaId ? parseInt(incidente.cuencaId) : null,
              eventoid: evento.id,
              createdat: new Date().toISOString(),
              updatedat: new Date().toISOString()
            }
          });
        }
      }

      return NextResponse.json(evento, { status: 201 })
    } catch (error) {
      console.error('=== DEBUG: Error in API ===');
      console.error('Error details:', error);
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return NextResponse.json(
        { message: 'Failed to create event', error: String(error) },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('=== DEBUG: Error in API ===');
    console.error('Error details:', error);
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { message: 'Failed to create event', error: String(error) },
      { status: 500 }
    )
  }
}

// Helper function to get next incident ID
async function getNextIncidentId(): Promise<number> {
  const lastIncident = await prisma.incidentes.findFirst({
    orderBy: { id: 'desc' }
  });
  return (lastIncident?.id || 0) + 1;
} 