import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const term = searchParams.get('term')
    const municipioId = searchParams.get('municipioId')

    if (!term || !municipioId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const barrios = await prisma.barrio.findMany({
      where: {
        AND: [
          {
            id_municipio: parseInt(municipioId)
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
                codigo_barrio: Number(term)
              }])
            ]
          }
        ]
      },
      select: {
        id_barrio: true,
        nombre: true,
        codigo_barrio: true,
        id_municipio: true
      },
      take: 10
    })

    return NextResponse.json(barrios)
  } catch (error) {
    console.error('Error searching barrios:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 