import { NextResponse } from 'next/server'
import prisma from '../../../lib/prisma'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { nombre, codigo_sector, id_barrio } = data

    // Use a transaction to ensure atomicity
    const newSector = await prisma.$transaction(async (tx) => {
      // Check if sector already exists within the transaction
      const existingSector = await tx.sector.findFirst({
        where: {
          nombre: nombre,
          id_barrio: parseInt(id_barrio)
        }
      })

      if (existingSector) {
        return existingSector
      }

      // Get all sectors ordered by ID and lock them to prevent concurrent access
      const sectors = await tx.$queryRaw`
        SELECT id_sector 
        FROM sisri.sector 
        ORDER BY id_sector DESC 
        LIMIT 1 
        FOR UPDATE
      ` as { id_sector: number }[];

      const newSectorId = sectors.length > 0 ? sectors[0].id_sector + 1 : 1;

      // Create new sector within the transaction
      return await tx.sector.create({
        data: {
          id_sector: newSectorId,
          nombre: nombre,
          codigo_sector: codigo_sector ? parseInt(codigo_sector) : null,
          id_barrio: parseInt(id_barrio)
        }
      })
    })

    return NextResponse.json(newSector)
  } catch (error) {
    console.error('Error creating sector:', error)
    return NextResponse.json(
      { error: 'Failed to create sector', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 