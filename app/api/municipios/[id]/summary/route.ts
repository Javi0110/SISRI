import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid municipality ID' }, { status: 400 })
    }

    const [municipio, propiedades, habitantes, eventos, barrios] = await Promise.all([
      prisma.municipio.findUnique({
        where: { id_municipio: id },
        select: { id_municipio: true, nombre: true, latitud: true, longitud: true },
      }),
      prisma.propiedades_existentes.findMany({
        where: { id_municipio: id },
        select: {
          id: true,
          direccion: true,
          property_number: true,
          property_types: { select: { type_name: true } },
        },
        take: 20,
      }),
      prisma.habitantes.findMany({
        where: { id_municipio: id },
        select: {
          id: true,
          nombre: true,
          apellido1: true,
          apellido2: true,
          categoria: true,
          rol: true,
          edad: true,
        },
        take: 20,
      }),
      prisma.eventos.findMany({
        where: { cuenca: { id_municipio: id } },
        select: {
          id: true,
          titulo: true,
          tipo: true,
          estado: true,
          fecha: true,
          descripcion: true,
        },
        orderBy: { fecha: 'desc' },
        take: 15,
      }),
      prisma.barrio.findMany({
        where: { id_municipio: id },
        select: { id_barrio: true, nombre: true },
      }),
    ])

    if (!municipio) {
      return NextResponse.json({ error: 'Municipality not found' }, { status: 404 })
    }

    const [propiedadesCount, habitantesCount] = await Promise.all([
      prisma.propiedades_existentes.count({ where: { id_municipio: id } }),
      prisma.habitantes.count({ where: { id_municipio: id } }),
    ])

    const eventosCount = await prisma.eventos.count({
      where: { cuenca: { id_municipio: id } },
    })

    return NextResponse.json({
      municipio: {
        id_municipio: municipio.id_municipio,
        nombre: municipio.nombre,
        latitud: municipio.latitud,
        longitud: municipio.longitud,
      },
      summary: {
        properties: propiedadesCount,
        residents: habitantesCount,
        events: eventosCount,
        barrios: barrios.length,
      },
      properties: propiedades.map((p) => ({
        id: p.id,
        direccion: p.direccion,
        property_number: p.property_number,
        type: p.property_types?.type_name,
      })),
      residents: habitantes.map((h) => ({
        id: h.id,
        nombre: [h.nombre, h.apellido1, h.apellido2].filter(Boolean).join(' '),
        categoria: h.categoria,
        rol: h.rol,
        edad: h.edad,
      })),
      events: eventos.map((e) => ({
        id: e.id,
        titulo: e.titulo,
        tipo: e.tipo,
        estado: e.estado,
        fecha: e.fecha,
        descripcion: e.descripcion,
      })),
      barrios: barrios.map((b) => ({ id: b.id_barrio, nombre: b.nombre })),
    })
  } catch (error) {
    console.error('Error fetching municipality summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch municipality summary' },
      { status: 500 }
    )
  }
}
