import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Get USNG grid reference first
    const grid = await prisma.uSNGSquare.findFirst({
      where: { usng: data.usngCode }
    })

    if (!grid) {
      return NextResponse.json(
        { message: 'Invalid USNG code' },
        { status: 400 }
      )
    }

    // Create the report
    const report = await prisma.eventos.create({
      data: {
        notificacionId: parseInt(data.notificationNumber.split('-')[2]),
        titulo: data.eventName,
        descripcion: data.incidents[0].description, // Using first incident description
        fecha: new Date(data.date),
        gridId: grid.id,
        // Create incidents with cuenca relationships
        incidentes: {
          create: data.incidents.map((incident: any) => ({
            tipo: incident.type,
            descripcion: incident.description,
            cuencaId: data.cuencaIds.length > 0 ? 
              parseInt(data.cuencaIds[0]) : // Use first cuenca if available
              1, // Default cuenca ID
          })),
        },
        // Create property relationships
        propiedades_afectadas: {
          create: data.properties.map((property: any) => ({
            daños: property.value,
            propiedad: {
              create: {
                tipo: property.type,
                valor: property.value ? parseFloat(property.value) : 0,
                id_municipio: parseInt(property.municipioId),
                id_barrio: property.barrioId ? parseInt(property.barrioId) : null,
                id_sector: property.sectorId ? parseInt(property.sectorId) : null,
                gridId: grid.id,
                geometria: property.location || {}, // Default empty object if no location
              }
            }
          }))
        }
      },
      include: {
        incidentes: {
          include: {
            cuenca: true
          }
        },
        propiedades_afectadas: {
          include: {
            propiedad: true
          }
        }
      }
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Error creating report:', error)
    return NextResponse.json(
      { message: 'Failed to create report', error: String(error) },
      { status: 500 }
    )
  }
} 