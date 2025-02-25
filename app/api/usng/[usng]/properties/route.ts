import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: Request,
  { params }: { params: { usng: string } }
) {
  try {
    const properties = await prisma.propiedades_Existentes.findMany({
      where: {
        grid: {
          usng: params.usng
        }
      },
      include: {
        municipio: true,
        barrio: true,
        sector: true,
        grid: true
      }
    })
    
    return NextResponse.json(properties)
  } catch (error) {
    console.error('Error fetching properties for USNG:', error)
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 })
  }
} 