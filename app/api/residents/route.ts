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
            contacto: habitante.contacto || null,
            family_id: familyId,
            propiedad_id: data.propertyId
          }
        });

        // Handle limitaciones, condiciones, and disposiciones using junction tables
        if (habitante.limitation) {
          await (prisma as any).habitantes_limitaciones.create({
            data: {
              habitante_id: newResident.id,
              limitacion_id: await getLimitacionId(habitante.limitation)
            }
          });
        }

        if (habitante.condition) {
          await (prisma as any).habitantes_condiciones.create({
            data: {
              habitante_id: newResident.id,
              condicion_id: await getCondicionId(habitante.condition)
            }
          });
        }

        if (habitante.disposition) {
          await (prisma as any).habitantes_disposiciones.create({
            data: {
              habitante_id: newResident.id,
              disposicion_id: await getDisposicionId(habitante.disposition)
            }
          });
        }
        
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

// Helper functions to get IDs from names
async function getLimitacionId(nombre: string): Promise<number> {
  const limitacion = await prisma.limitacion.findUnique({
    where: { nombre }
  });
  if (!limitacion) {
    throw new Error(`Limitacion '${nombre}' not found`);
  }
  return limitacion.id;
}

async function getCondicionId(nombre: string): Promise<number> {
  const condicion = await prisma.condicion.findUnique({
    where: { nombre }
  });
  if (!condicion) {
    throw new Error(`Condicion '${nombre}' not found`);
  }
  return condicion.id;
}

async function getDisposicionId(nombre: string): Promise<number> {
  const disposicion = await prisma.disposiciones.findUnique({
    where: { nombre }
  });
  if (!disposicion) {
    throw new Error(`Disposicion '${nombre}' not found`);
  }
  return disposicion.id;
} 