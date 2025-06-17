import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Creating property with data:', data);

    // Create the property directly using Prisma's structure
    const createdProperty = await prisma.propiedades_existentes.create({
      data: {
        property_type_id: data.tipo,
        direccion: data.direccion,
        id_municipio: data.id_municipio,
        id_barrio: data.id_barrio || null,
        id_sector: data.id_sector || null
      }
    });

    console.log('Successfully created property with ID:', createdProperty.id);

    return NextResponse.json({
      message: 'Property created successfully',
      id: createdProperty.id,
      property: createdProperty
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { error: 'Failed to create property', details: String(error) },
      { status: 500 }
    );
  }
} 