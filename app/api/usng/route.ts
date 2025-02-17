import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const usngSquares = await prisma.uSNGSquare.findMany({
      select: {
        usng: true,
        geometry: true,
        latitudes: true,
        longitudes: true
      }
    })
    console.log('USNG squares count:', usngSquares.length)
    console.log('First USNG square sample:', usngSquares[0])
    return NextResponse.json(usngSquares)
  } catch (error) {
    console.error('Error fetching USNG squares:', error)
    return NextResponse.json({ error: 'Failed to fetch USNG squares' }, { status: 500 })
  }
} 