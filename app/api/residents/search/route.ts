import { NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const propertyId = searchParams.get('propertyId');

    console.log(`Searching residents with query: "${query}", limit: ${limit}${propertyId ? `, propertyId: ${propertyId}` : ''}`);

    if (!query && !propertyId) {
      return NextResponse.json([]);
    }

    // Build the query conditions
    const whereConditions: any = {};

    if (propertyId) {
      whereConditions.propiedad_id = parseInt(propertyId);
    }

    if (query) {
      whereConditions.OR = [
        { nombre: { contains: query, mode: 'insensitive' } },
        { apellido1: { contains: query, mode: 'insensitive' } },
        { apellido2: { contains: query, mode: 'insensitive' } },
        { contacto: { contains: query, mode: 'insensitive' } }
      ];
    }

    const residents = await prisma.habitantes.findMany({
      where: whereConditions,
      include: {
        propiedad: {
          select: {
            direccion: true,
            tipo: true,
            municipio: { select: { nombre: true } },
            barrio: { select: { nombre: true } },
            sector: { select: { nombre: true } }
          }
        },
        family: {
          select: {
            id: true,
            apellidos: true,
            description: true
          }
        }
      },
      take: limit,
      orderBy: [
        { apellido1: 'asc' },
        { apellido2: 'asc' },
        { nombre: 'asc' }
      ]
    });

    // Format the results to be more user-friendly
    const formattedResidents = residents.map((resident: any) => ({
      id: resident.id,
      name: resident.nombre,
      apellido1: resident.apellido1,
      apellido2: resident.apellido2 || '',
      fullName: `${resident.nombre} ${resident.apellido1} ${resident.apellido2 || ''}`.trim(),
      contacto: resident.contacto,
      sex: resident.sex,
      categoria: resident.categoria,
      rol: resident.rol,
      age: resident.edad,
      property: resident.propiedad ? {
        id: resident.propiedad_id,
        direccion: resident.propiedad.direccion,
        tipo: resident.propiedad.tipo,
        municipio: resident.propiedad.municipio?.nombre || '',
        barrio: resident.propiedad.barrio?.nombre || '',
        sector: resident.propiedad.sector?.nombre || ''
      } : null,
      family: resident.family ? {
        id: resident.family.id,
        apellidos: resident.family.apellidos,
        description: resident.family.description
      } : null
    }));

    return NextResponse.json(formattedResidents);
  } catch (error) {
    console.error('Error searching residents:', error);
    return NextResponse.json(
      { error: 'Failed to search residents', details: String(error) }, 
      { status: 500 }
    );
  }
} 