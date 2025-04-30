import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    const eventId = parseInt(params.eventId)

    // Validate event ID
    if (isNaN(eventId)) {
      return NextResponse.json(
        { message: 'Invalid event ID', error: 'EVENT_ID_INVALID' },
        { status: 400 }
      )
    }

    // Fetch notifications for the event with their related properties
    const notifications = await prisma.notificacion.findMany({
      where: { eventoId: eventId },
      orderBy: { fecha_creacion: 'desc' },
      include: {
        propiedades_existentes: {
          include: {
            municipio: true,
            barrio: true,
            sector: true,
            usngsquare: true,
            habitantes: true
          }
        }
      }
    })

    // Also fetch all affected properties for this event
    const affectedProperties = await prisma.propiedades_afectadas.findMany({
      where: { eventoId: eventId },
      include: {
        propiedad: {
          include: {
            municipio: true,
            barrio: true,
            sector: true,
            usngsquare: true,
            habitantes: true
          }
        }
      }
    })

    // Create a mapping of notification IDs to properties
    const notificationProperties = new Map()
    
    // First, add directly related properties through propiedad_id
    notifications.forEach(notification => {
      if (notification.propiedad_id && notification.propiedades_existentes) {
        const propId = notification.propiedad_id
        if (!notificationProperties.has(notification.id)) {
          notificationProperties.set(notification.id, [])
        }
        notificationProperties.get(notification.id).push({
          id: propId,
          tipo: notification.propiedades_existentes.tipo,
          municipio: notification.propiedades_existentes.municipio?.nombre || 'N/A',
          barrio: notification.propiedades_existentes.barrio?.nombre || 'N/A',
          sector: notification.propiedades_existentes.sector?.nombre || 'N/A',
          usng: notification.propiedades_existentes.usngsquare?.usng || 'N/A',
          daños: null, // We don't have damage info in this relation
          fecha: null,
          habitantes: notification.propiedades_existentes.habitantes || []
        })
      }
    })
    
    // Next, look for properties affected in the same event
    // This is a common scenario - notifications are tied to the event but need to show all affected properties
    notifications.forEach(notification => {
      if (!notificationProperties.has(notification.id)) {
        notificationProperties.set(notification.id, [])
      }
      
      // Add all affected properties from the event to each notification
      affectedProperties.forEach(affected => {
        if (affected.propiedad) {
          const prop = affected.propiedad
          notificationProperties.get(notification.id).push({
            id: prop.id,
            tipo: prop.tipo,
            municipio: prop.municipio?.nombre || 'N/A',
            barrio: prop.barrio?.nombre || 'N/A',
            sector: prop.sector?.nombre || 'N/A',
            usng: prop.usngsquare?.usng || 'N/A',
            daños: affected.daños,
            fecha: affected.fecha,
            habitantes: prop.habitantes.map(h => ({
              id: h.id,
              nombre: h.nombre,
              edad: h.edad,
              categoria: h.categoria,
              limitacion: h.limitacion,
              condicion: h.condicion,
              disposicion: h.disposicion,
              propiedad_id: h.propiedad_id
            }))
          })
        }
      })
    })
    
    // Format the notifications with their properties
    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      eventoId: notification.eventoId,
      tipo: notification.tipo,
      mensaje: notification.mensaje,
      fecha_creacion: notification.fecha_creacion,
      estado: notification.estado,
      numero_notificacion: notification.numero_notificacion,
      propiedades: notificationProperties.get(notification.id) || []
    }))

    return NextResponse.json(
      { notifications: formattedNotifications },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error fetching event notifications:', error)
    return NextResponse.json(
      { message: 'Failed to fetch notifications', error: String(error) },
      { status: 500 }
    )
  }
} 