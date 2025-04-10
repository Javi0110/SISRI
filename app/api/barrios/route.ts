import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { nombre, codigo_barrio, id_municipio } = data

    // Check if barrio already exists
    const existingBarrio = await prisma.barrio.findFirst({
      where: {
        nombre: nombre,
        id_municipio: parseInt(id_municipio)
      }
    })

    if (existingBarrio) {
      return NextResponse.json(existingBarrio)
    }

    // Get the last barrio ID to generate a new one
    const lastBarrio = await prisma.barrio.findFirst({
      orderBy: {
        id_barrio: 'desc'
      }
    })

    const newBarrioId = (lastBarrio?.id_barrio || 0) + 1

    // Create new barrio
    const newBarrio = await prisma.barrio.create({
      data: {
        id_barrio: newBarrioId,
        nombre: nombre,
        codigo_barrio: codigo_barrio ? parseInt(codigo_barrio) : null,
        id_municipio: parseInt(id_municipio)
      }
    })

    return NextResponse.json(newBarrio)
  } catch (error) {
    console.error('Error creating barrio:', error)
    return NextResponse.json(
      { error: 'Failed to create barrio' },
      { status: 500 }
    )
  }
} 