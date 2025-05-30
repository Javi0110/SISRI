import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Resident creation payload:', data);

    // Check if we're adding to an existing property or creating a new one
    if (data.propertyId) {
      // Adding residents to an existing property
      console.log(`Adding residents to existing property ID: ${data.propertyId}`);
      
      // Validate the property exists
      const existingProperty = await prisma.propiedades_existentes.findUnique({
        where: { id: data.propertyId }
      });
      
      if (!existingProperty) {
        return NextResponse.json(
          { error: 'Property not found' },
          { status: 404 }
        );
      }
      
      // Process each habitante
      const createdResidents = [];
      
      for (const habitante of data.habitantes) {
        // Handle family creation or association
        let familyId = habitante.family_id;
        
        if (habitante.newFamily) {
          // Create a new family
          const newFamily = await prisma.families.create({
            data: {
              apellidos: habitante.newFamily.apellidos,
              description: habitante.newFamily.description
            }
          });
          familyId = newFamily.id;
        }
        
        // Create the resident
        const newResident = await prisma.habitantes.create({
          data: {
            nombre: habitante.name,
            apellido1: habitante.apellido1,
            apellido2: habitante.apellido2 || "",
            sex: habitante.sex,
            categoria: habitante.categoria,
            rol: habitante.rol,
            edad: parseInt(habitante.age),
            limitacion: habitante.limitation || null,
            condicion: habitante.condition || null,
            disposicion: habitante.disposition || null,
            contacto: habitante.contacto || null,
            family_id: familyId,
            propiedad_id: data.propertyId
          }
        });
        
        createdResidents.push(newResident);
      }
      
      return NextResponse.json({
        message: `Successfully added ${createdResidents.length} residents to property ID ${data.propertyId}`,
        residents: createdResidents
      });
      
    } else if (data.newProperty) {
      // The new property approach is no longer used - we now use a 2-step process
      return NextResponse.json(
        { error: 'Please use the 2-step process: first create property, then add residents' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid request. Must provide propertyId for adding residents' },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('Error in resident creation:', error);
    return NextResponse.json(
      { error: 'Failed to process resident creation', details: String(error) },
      { status: 500 }
    );
  }
} 