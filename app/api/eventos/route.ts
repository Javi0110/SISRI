import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const data = await request.json()
    console.log('=== DEBUG: API Received Data ===');
    console.log('Raw request data:', JSON.stringify(data, null, 2));

    // Reset sequences for known problematic tables using reliable method
    try {
      await prisma.$executeRaw`SELECT setval('sisri.propiedades_existentes_id_seq', COALESCE((SELECT MAX(id) FROM sisri.propiedades_existentes), 0) + 1, false)`;
      await prisma.$executeRaw`SELECT setval('sisri.habitantes_id_seq', COALESCE((SELECT MAX(id) FROM sisri.habitantes), 0) + 1, false)`;
    } catch (seqError) {
      // Just log the error, but continue - our fallback methods will handle issues
      console.warn('Sequence reset warning:', seqError);
    }

    let eventoId = data.eventoId;
    let eventoData = null;

    // If using an existing event, fetch its data
    if (eventoId) {
      eventoData = await prisma.eventos.findUnique({
        where: { id: eventoId },
        select: {
          id: true,
          titulo: true,
          descripcion: true,
          fecha: true,
          tipo: true,
          estado: true,
          usngId: true,
        }
      });
      if (!eventoData) {
        return NextResponse.json(
          { message: 'Event not found', error: 'Invalid eventoId' },
          { status: 400 }
        );
      }
    }

    // If creating a new event, use the data.evento.create object
    if (!eventoId && data.evento && data.evento.create) {
      const newEvento = data.evento.create;
      const created = await prisma.eventos.create({
        data: {
          titulo: newEvento.titulo,
          descripcion: newEvento.descripcion,
          fecha: new Date(newEvento.fecha),
          tipo: newEvento.tipo,
          estado: newEvento.estado || "pending",
        }
      });
      eventoId = created.id;
      eventoData = created;
    }

    if (!eventoId || !eventoData) {
      return NextResponse.json(
        { message: 'Missing or invalid event data' },
        { status: 400 }
      );
    }

    // Create notification
    if (data.notificacion) {
      // Check for duplicate notification number
      const existingNotif = await prisma.notificacion.findUnique({
        where: { numero_notificacion: data.notificacion.numero_notificacion }
      });
      if (existingNotif) {
        return NextResponse.json(
          { message: 'Notification number already exists. Please refresh and try again.', error: 'DUPLICATE_NOTIFICATION' },
          { status: 400 }
        );
      }
      await prisma.notificacion.create({
        data: {
          eventoId: eventoId,
          numero_notificacion: data.notificacion.numero_notificacion,
          tipo: data.notificacion.tipo || eventoData.tipo,
          mensaje: data.notificacion.mensaje || eventoData.descripcion || '',
          estado: data.notificacion.estado || eventoData.estado || 'pending',
          fecha: data.notificacion.fecha ? new Date(data.notificacion.fecha) : eventoData.fecha,
        }
      });
    }

    // Create incidents
    if (data.incidentes?.length > 0) {
      for (const incidente of data.incidentes) {
        await prisma.incidentes.create({
          data: {
            id: await getNextIncidentId(),
            tipo: incidente.tipo,
            descripcion: incidente.descripcion,
            cuencaid: incidente.cuencaId ? parseInt(incidente.cuencaId) : null,
            eventoid: eventoId,
            createdat: new Date().toISOString(),
            updatedat: new Date().toISOString()
          }
        });
      }
    }

    // Create affected properties - using the approach that works reliably
    if (data.propiedades_afectadas?.length > 0) {
      for (const prop of data.propiedades_afectadas) {
        // Get property data
        const propertyData = prop.propiedad.create;
        console.log('Property data to create:', JSON.stringify(propertyData, null, 2));
        
        let propiedad;
        try {
          // Handle creation of new barrio if needed
          if (propertyData.newBarrio) {
            console.log('Creating new barrio:', propertyData.newBarrio);
            
            // Create the new barrio
            const newBarrio = await prisma.barrio.create({
              data: {
                id_barrio: await getNextBarrioId(), // Generate a new ID
                nombre: propertyData.newBarrio.nombre,
                codigo_barrio: propertyData.newBarrio.codigo_barrio 
                  ? parseInt(propertyData.newBarrio.codigo_barrio) 
                  : null,
                id_municipio: propertyData.newBarrio.id_municipio
              }
            });
            
            console.log('Created new barrio with ID:', newBarrio.id_barrio);
            
            // Update property data with new barrio ID
            propertyData.id_barrio = newBarrio.id_barrio;
            // Remove the newBarrio object so it's not sent to create call
            delete propertyData.newBarrio;
          }
          
          // Handle creation of new sector if needed
          if (propertyData.newSector) {
            console.log('Creating new sector:', propertyData.newSector);
            
            // Create the new sector
            const newSector = await prisma.sector.create({
              data: {
                id_sector: await getNextSectorId(), // Generate a new ID
                nombre: propertyData.newSector.nombre,
                codigo_sector: propertyData.newSector.codigo_sector 
                  ? parseInt(propertyData.newSector.codigo_sector) 
                  : null,
                id_barrio: propertyData.id_barrio // Use the barrio ID (either existing or newly created)
              }
            });
            
            console.log('Created new sector with ID:', newSector.id_sector);
            
            // Update property data with new sector ID
            propertyData.id_sector = newSector.id_sector;
            // Remove the newSector object so it's not sent to create call
            delete propertyData.newSector;
          }
          
          // Try standard Prisma create with updated data
          // Convert propertyData to propiedadData for create call
          const propiedadData = {
            tipo: propertyData.tipo,
            direccion: propertyData.direccion,
            ...(propertyData.geometria ? { geometria: propertyData.geometria } : {}),
            municipio: propertyData.id_municipio ? {
              connect: { id_municipio: propertyData.id_municipio }
            } : undefined,
            barrio: propertyData.id_barrio ? {
              connect: { id_barrio: propertyData.id_barrio }
            } : undefined,
            sector: propertyData.id_sector ? {
              connect: { id_sector: propertyData.id_sector }
            } : undefined,
            usngsquare: propertyData.gridId ? {
              connect: { id: propertyData.gridId }
            } : undefined
          };
          
          console.log('Creating property with final data:', JSON.stringify(propiedadData, null, 2));
          
          // Try standard Prisma create
          propiedad = await prisma.propiedades_existentes.create({
            data: propiedadData
          });
          console.log('Successfully created property with ID:', propiedad.id);
        } catch (createError) {
          // If Prisma create fails, use raw SQL insertion as fallback
          console.log('Falling back to raw SQL insertion...');
          
          // Create a base property with minimal info
          const result = await prisma.$queryRaw`
            INSERT INTO sisri.propiedades_existentes (tipo, direccion) 
            VALUES (${propertyData.tipo}, ${propertyData.direccion || ''})
            RETURNING id
          `;
          
          const newId = Array.isArray(result) && result.length > 0 ? result[0].id : null;
          
          if (!newId) {
            throw new Error('Failed to create property with raw SQL');
          }
          
          console.log('Created property with raw SQL, ID:', newId);
          
          // Set propiedad object for use in next steps
          propiedad = { id: newId };
          
          // Now establish relationships separately
          if (propertyData.id_municipio) {
            await prisma.$executeRaw`
              UPDATE sisri.propiedades_existentes 
              SET id_municipio = ${propertyData.id_municipio}
              WHERE id = ${newId}
            `;
          }
          
          if (propertyData.id_barrio) {
            await prisma.$executeRaw`
              UPDATE sisri.propiedades_existentes 
              SET id_barrio = ${propertyData.id_barrio}
              WHERE id = ${newId}
            `;
          }
          
          if (propertyData.id_sector) {
            await prisma.$executeRaw`
              UPDATE sisri.propiedades_existentes 
              SET id_sector = ${propertyData.id_sector}
              WHERE id = ${newId}
            `;
          }
          
          if (propertyData.gridId) {
            await prisma.$executeRaw`
              UPDATE sisri.propiedades_existentes 
              SET "gridId" = ${propertyData.gridId}
              WHERE id = ${newId}
            `;
          }
        }
        
        // Create habitantes separately to avoid ID conflicts
        if (propertyData.habitantes?.create?.length > 0) {
          for (const h of propertyData.habitantes.create) {
            try {
              await handleHabitante(h, propiedad.id);
            } catch (habitanteError) {
              console.error('Error creating habitante:', habitanteError);
            }
          }
        }
        
        // Link property to event as affected
        await prisma.propiedades_afectadas.create({
          data: {
            eventoId: eventoId,
            propiedadId: propiedad.id,
            daños: prop.daños || "No damage reported",
            fecha: new Date()
          }
        });
        
        console.log('Successfully linked property to event');
      }
    }

    return NextResponse.json({ message: 'Event processed successfully', eventoId }, { status: 201 });
  } catch (error) {
    console.error('=== DEBUG: Error in API ===');
    console.error('Error details:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error('Meta:', error.meta);
    }
    
    return NextResponse.json(
      { message: 'Failed to process event', error: String(error) },
      { status: 500 }
    );
  }
}

// Helper function to get next incident ID
async function getNextIncidentId(): Promise<number> {
  const lastIncident = await prisma.incidentes.findFirst({
    orderBy: { id: 'desc' }
  });
  return (lastIncident?.id || 0) + 1;
}

// Helper function to get next barrio ID
async function getNextBarrioId(): Promise<number> {
  const lastBarrio = await prisma.barrio.findFirst({
    orderBy: { id_barrio: 'desc' }
  });
  return (lastBarrio?.id_barrio || 0) + 1;
}

// Helper function to get next sector ID
async function getNextSectorId(): Promise<number> {
  const lastSector = await prisma.sector.findFirst({
    orderBy: { id_sector: 'desc' }
  });
  return (lastSector?.id_sector || 0) + 1;
}

// In the POST function, modify the handleHabitante helper function to handle families
const handleHabitante = async (habitante: any, propiedadId: number) => {
  // Check if there's a family relationship to create/connect
  let family_id = null;
  
  try {
    if (habitante.newFamily) {
      // Create a new family using raw SQL
      const familyResult = await prisma.$queryRaw`
        INSERT INTO sisri.families (apellidos, description, created_at, updated_at)
        VALUES (${habitante.newFamily.apellidos}, ${habitante.newFamily.description || ''}, NOW(), NOW())
        RETURNING id
      `;
      family_id = Array.isArray(familyResult) && familyResult.length > 0 ? familyResult[0].id : null;
    } else if (habitante.family_id) {
      // Use existing family ID
      family_id = habitante.family_id;
    }

    // Map fields accounting for both English and Spanish field names
    const nombre = habitante.name || habitante.nombre || '';
    const categoria = habitante.category || habitante.categoria || '';
    const rol = habitante.role || habitante.rol || '';
    const edad = habitante.age || habitante.edad || null;
    const limitacion = habitante.limitation || habitante.limitacion || null;
    const condicion = habitante.condition || habitante.condicion || null;
    const disposicion = habitante.disposition || habitante.disposicion || null;

    // Create the habitante with family data included
    const habitanteResult = await prisma.$queryRaw`
      INSERT INTO sisri.habitantes 
      (nombre, categoria, rol, edad, limitacion, condicion, disposicion, propiedad_id, family_id)
      VALUES (
        ${nombre}, 
        ${categoria}, 
        ${rol}, 
        ${edad}, 
        ${limitacion}, 
        ${condicion}, 
        ${disposicion}, 
        ${propiedadId},
        ${family_id}
      )
      RETURNING id
    `;
    
    return {
      id: Array.isArray(habitanteResult) && habitanteResult.length > 0 ? habitanteResult[0].id : null
    };
  } catch (error) {
    console.error('Error creating habitante with family:', error);
    
    // Map fields for fallback too
    const nombre = habitante.name || habitante.nombre || '';
    const categoria = habitante.category || habitante.categoria || '';
    const rol = habitante.role || habitante.rol || '';
    const edad = habitante.age || habitante.edad || null;
    const limitacion = habitante.limitation || habitante.limitacion || null;
    const condicion = habitante.condition || habitante.condicion || null;
    const disposicion = habitante.disposition || habitante.disposicion || null;
    
    // Fallback to basic insert without family if error occurs
    const fallbackResult = await prisma.$queryRaw`
      INSERT INTO sisri.habitantes 
      (nombre, categoria, rol, edad, limitacion, condicion, disposicion, propiedad_id)
      VALUES (
        ${nombre}, 
        ${categoria}, 
        ${rol}, 
        ${edad}, 
        ${limitacion}, 
        ${condicion}, 
        ${disposicion}, 
        ${propiedadId}
      )
      RETURNING id
    `;
    
    return {
      id: Array.isArray(fallbackResult) && fallbackResult.length > 0 ? fallbackResult[0].id : null
    };
  }
}; 