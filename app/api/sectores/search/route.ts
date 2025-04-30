import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')
    const barrioId = searchParams.get('barrioId')

    if (!term || !barrioId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const sectores = await prisma.sector.findMany({
      where: {
        AND: [
          {
            id_barrio: parseInt(barrioId)
          },
          {
            OR: [
              {
                nombre: {
                  contains: term,
                  mode: 'insensitive'
                }
              },
              // Only search by code if the term is a number
              ...(isNaN(Number(term)) ? [] : [{
                codigo_sector: Number(term)
              }])
            ]
          }
        ]
      },
      select: {
        id_sector: true,
        nombre: true,
        codigo_sector: true,
        id_barrio: true
      },
      take: 10
    })

    return NextResponse.json(sectores)
  } catch (error) {
    console.error('Error searching sectores:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 