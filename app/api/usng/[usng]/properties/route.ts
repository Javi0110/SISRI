import { PrismaClient } from '@prisma/client'
import { NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function GET(
  { params }: { params: { usng: string } }
) {
  const usng = params.usng

  if (!usng) {
    return NextResponse.json(
      { error: 'USNG parameter is required' }, 
      { status: 400 }
    )
  }

  try {
    const properties = await prisma.propiedades_Existentes.findMany({
      where: {
        grid: {
          usng: usng
        }
      },
      select: {
        id: true,
        tipo: true,
        valor: true,
        municipio: {
          select: {
            nombre: true
          }
        }
      }
    })

    return NextResponse.json(properties)
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    )
  }
} 