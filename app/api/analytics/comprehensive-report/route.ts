import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
    
type SearchType = 'evento' | 'usng' | 'municipio' | 'residente';

interface Habitante {
  id: number;
  edad: number;
  sex?: string;
  categoria: string;
  habitantes_condiciones: {
    condicion: {
      nombre: string;
    };
  }[];
  habitantes_limitaciones: {
    limitacion: {
      nombre: string;
    };
  }[];
  habitantes_disposiciones: {
    disposiciones: {
      nombre: string;
    };
  }[];
}

interface Property {
  id: number;
  property_type_id: number;
  property_type_name: string;
  municipio: string;
  barrio: string;
  sector: string;
  usng: string;
  habitantes: Habitante[];
}

interface SearchRequest {
  searchType: SearchType;
  searchQuery: string;
  filters?: {
    usng?: string;
    municipio?: string;
    barrio?: string;
    sector?: string;
    ageRange?: { min: number; max: number };
    propertyType?: string;
    incidentType?: string;
    damageType?: string;
    residentCategory?: string;
    residentCondition?: string;
    residentLimitation?: string;
    residentDisposition?: string;
    residentName?: string;
    familyName?: string;
    dateRange?: { start: string; end: string };
    sex?: string;
  };
}

// Helper function to get the latest damage report for a property
async function getPropertyDamageInfo(propertyId: number) {
  try {
    const latestDamage = await prisma.propiedades_afectadas.findFirst({
      where: {
        propiedadId: propertyId
      },
      orderBy: {
        fecha: 'desc'
      },
      include: {
        evento: true
      }
    });

    return latestDamage ? {
      daños: latestDamage.daños,
      fecha: latestDamage.fecha
    } : {
      daños: null,
      fecha: null
    };
  } catch (error) {
    console.error(`Error fetching damage info for property ${propertyId}:`, error);
    return {
      daños: null,
      fecha: null
    };
  }
}

// New helper function to get property damage info in bulk

export async function POST(req: Request) {
  try {
    const { searchType, searchQuery, filters }: SearchRequest = await req.json();

    // Allow empty search queries for resident searches
    if (!searchQuery && searchType !== 'residente') {
      return NextResponse.json(
        { error: "El término de búsqueda es requerido" },
        { status: 400 }
      );
    }

    switch (searchType) {
      case 'evento': {
        return await handleEventSearch(searchQuery, filters);
      }
      case 'usng': {
        return await handleUSNGSearch(searchQuery, filters);
      }
      case 'municipio': {
        return await handleMunicipioSearch(searchQuery, filters);
      }
      case 'residente': {
        return await handleResidentSearch(searchQuery, filters);
      }
      default: {
        return NextResponse.json(
          { error: "Tipo de búsqueda no válido" },
          { status: 400 }
        );
      }
    }
  } catch (error) {
    console.error("Error processing search:", error);
    return NextResponse.json(
      { error: "Error al procesar la búsqueda" },
      { status: 500 }
    );
  }
}

async function handleEventSearch(eventQuery: string, filters?: SearchRequest['filters']) {
  try {
    // Find matching events
    const event = await prisma.eventos.findFirst({
      where: {
        OR: [
          { titulo: { contains: eventQuery, mode: 'insensitive' } },
          { descripcion: { contains: eventQuery, mode: 'insensitive' } }
        ]
      },
      include: {
        notificaciones: {
          include: {
            propiedades_existentes: {
              include: {
                property_types: true,
                habitantes: {
                  include: {
                    family: true,
                    habitantes_condiciones: {
                      include: {
                        condicion: true
                      }
                    },
                    habitantes_limitaciones: {
                      include: {
                        limitacion: true
                      }
                    },
                    habitantes_disposiciones: {
                      include: {
                        disposiciones: true
                      }
                    }
                  }
                },
                municipio: true,
                barrio: true,
                sector: true,
                usngsquare: true
              }
            }
          }
        },
        propiedades_afectadas: {
          include: {
            propiedad: {
              include: {
                property_types: true,
                habitantes: {
                  include: {
                    family: true,
                    habitantes_condiciones: {
                      include: {
                        condicion: true
                      }
                    },
                    habitantes_limitaciones: {
                      include: {
                        limitacion: true
                      }
                    },
                    habitantes_disposiciones: {
                      include: {
                        disposiciones: true
                      }
                    }
                  }
                },
                municipio: true,
                barrio: true,
                sector: true,
                usngsquare: true
              }
            }
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({
        searchType: 'evento',
        searchQuery: eventQuery,
        evento: null,
        propiedades: []
      });
    }

    // Collect all properties from both notifications and affected properties
    let properties: any[] = [];

    // Add properties from notifications
    event.notificaciones.forEach(notification => {
      if (notification.propiedades_existentes) {
        const property = notification.propiedades_existentes;
        console.log('Processing notification property:', {
          id: property.id,
          type_id: property.property_type_id,
          type_name: property.property_types?.type_name
        });
        properties.push({
          id: property.id,
          property_type_id: property.property_type_id || 0,
          property_type_name: property.property_types?.type_name || 'N/A',
          daños: null,
          fecha: notification.fecha_creacion,
          municipio: property.municipio?.nombre || 'N/A',
          municipio_id: property.id_municipio,
          barrio: property.barrio?.nombre || 'N/A',
          barrio_id: property.id_barrio,
          sector: property.sector?.nombre || 'N/A',
          sector_id: property.id_sector,
          usng: property.usngsquare?.usng || 'N/A',
          direccion: property.direccion,
          habitantes: property.habitantes || []
        });
      }
    });

    // Add properties from propiedades_afectadas
    event.propiedades_afectadas.forEach(afectada => {
      const property = afectada.propiedad;
      console.log('Processing affected property:', {
        id: property.id,
        type_id: property.property_type_id,
        type_name: property.property_types?.type_name
      });
      properties.push({
        id: property.id,
        property_type_id: property.property_type_id || 0,
        property_type_name: property.property_types?.type_name || 'N/A',
        daños: afectada.daños,
        fecha: afectada.fecha,
        municipio: property.municipio?.nombre || 'N/A',
        municipio_id: property.id_municipio,
        barrio: property.barrio?.nombre || 'N/A',
        barrio_id: property.id_barrio,
        sector: property.sector?.nombre || 'N/A',
        sector_id: property.id_sector,
        usng: property.usngsquare?.usng || 'N/A',
        direccion: property.direccion,
        habitantes: property.habitantes || []
      });
    });

    // Remove duplicates based on property ID
    properties = properties.filter((property, index, self) =>
      index === self.findIndex((p) => p.id === property.id)
    );

    // Apply filters
    if (filters) {
      // Property type filter
      if (filters.propertyType) {
        const propertyTypeId = parseInt(filters.propertyType);
        if (!isNaN(propertyTypeId)) {
          console.log('Filtering by property type ID:', propertyTypeId);
          properties = properties.filter(property => {
            console.log('Property:', property.id, 'Type ID:', property.property_type_id);
            const matches = property.property_type_id === propertyTypeId;
            if (matches) {
              console.log('Property matches filter:', property.id);
            }
            return matches;
          });
          console.log('Properties after filter:', properties.length);
        }
      }

      // Municipality filter
      if (filters.municipio) {
        properties = properties.filter(property => 
          property.municipio.toLowerCase() === filters.municipio?.toLowerCase()
        );
      }

      // Barrio filter
      if (filters.barrio) {
        properties = properties.filter(property => 
          property.barrio.toLowerCase() === filters.barrio?.toLowerCase()
        );
      }

      // Sector filter
      if (filters.sector) {
        properties = properties.filter(property => 
          property.sector.toLowerCase() === filters.sector?.toLowerCase()
        );
      }

      // USNG filter
      if (filters.usng) {
        properties = properties.filter(property => 
          property.usng.toLowerCase().includes(filters.usng?.toLowerCase() || '')
        );
      }

      // Age range filter
      if (filters.ageRange) {
        properties = properties.filter((property: Property) => 
          property.habitantes.some((habitante: Habitante) => 
            (!filters.ageRange?.min || habitante.edad >= filters.ageRange.min) &&
            (!filters.ageRange?.max || habitante.edad <= filters.ageRange.max)
          )
        );
      }

      // Resident category filter
      if (filters.residentCategory) {
        properties = properties.filter((property: Property) => 
          property.habitantes.some((habitante: Habitante) => 
            habitante.categoria.toLowerCase() === filters.residentCategory?.toLowerCase()
          )
        );
      }

      // Resident condition filter
      if (filters.residentCondition) {
        properties = properties.filter((property: Property) => 
          property.habitantes.some((habitante: Habitante) => 
            habitante.habitantes_condiciones.some(condition => 
              condition.condicion.nombre.toLowerCase() === filters.residentCondition?.toLowerCase()
            )
          )
        );
      }

      // Resident limitation filter
      if (filters.residentLimitation) {
        properties = properties.filter((property: Property) => 
          property.habitantes.some((habitante: Habitante) => 
            habitante.habitantes_limitaciones.some(limitation => 
              limitation.limitacion.nombre.toLowerCase() === filters.residentLimitation?.toLowerCase()
            )
          )
        );
      }

      // Resident disposition filter
      if (filters.residentDisposition) {
        properties = properties.filter((property: Property) => 
          property.habitantes.some((habitante: Habitante) => 
            habitante.habitantes_disposiciones.some(disposition => 
              disposition.disposiciones.nombre.toLowerCase() === filters.residentDisposition?.toLowerCase()
            )
          )
        );
      }

      // Sex filter
      if (filters.sex) {
        properties = properties.filter((property: Property) => 
          property.habitantes.some((habitante: Habitante) => 
            habitante.sex?.toLowerCase() === filters.sex?.toLowerCase()
          )
        );
      }
    }

    return NextResponse.json({
      searchType: 'evento',
      searchQuery: eventQuery,
      evento: {
        id: event.id,
        titulo: event.titulo,
        descripcion: event.descripcion,
        fecha: event.fecha,
        tipo: event.tipo,
        estado: event.estado,
        usng: event.usngId ? (await prisma.usngsquare.findUnique({ where: { id: event.usngId } }))?.usng : null
      },
      notificaciones: event.notificaciones.map(notification => ({
        id: notification.id,
        tipo: notification.tipo,
        mensaje: notification.mensaje,
        fecha_creacion: notification.fecha_creacion,
        estado: notification.estado,
        numero_notificacion: notification.numero_notificacion
      })),
      propiedades: properties
    });
  } catch (error) {
    console.error('Error in handleEventSearch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleUSNGSearch(usngQuery: string, filters?: SearchRequest['filters']) {
  const includeClause = {
    municipio: true,
    barrio: true,
    sector: true,
    usngsquare: true,
    property_types: true,
    habitantes: {
      include: {
        family: true,
        ...(prisma as any).habitantes_condiciones ? {
          habitantes_condiciones: {
            include: { condicion: true }
          }
        } : {},
        ...(prisma as any).habitantes_limitaciones ? {
          habitantes_limitaciones: {
            include: { limitacion: true }
          }
        } : {},
        ...(prisma as any).habitantes_disposiciones ? {
          habitantes_disposiciones: {
            include: { disposiciones: true }
          }
        } : {}
      }
    }
  } as any; // Use any type assertion to bypass Prisma typing limitations

  const properties = await prisma.propiedades_existentes.findMany({
    where: {
      usngsquare: {
        usng: {
          contains: usngQuery,
          mode: 'insensitive'
        }
      }
    },
    include: includeClause
  });

  // Process properties with type assertions
  const propertiesWithDamage = await Promise.all(properties.map(async (property: any) => {
    const damageInfo = await getPropertyDamageInfo(property.id);
    return {
      id: property.id,
      property_type_id: property.property_type_id,
      property_type_name: property.property_types?.type_name || 'N/A',
      daños: damageInfo.daños,
      fecha: damageInfo.fecha,
      municipio: property.municipio?.nombre || 'N/A',
      barrio: property.barrio?.nombre || 'N/A',
      sector: property.sector?.nombre || 'N/A',
      usng: property.usngsquare?.usng || 'N/A',
      direccion: property.direccion || 'N/A',
      habitantes: property.habitantes.map((h: any) => ({
        id: h.id,
        nombre: h.nombre,
        apellido1: h.apellido1,
        apellido2: h.apellido2,
        edad: h.edad,
        sex: h.sex || h.sexo,
        sexo: h.sexo || h.sex,
        categoria: h.categoria,
        limitacion: h.habitantes_limitaciones?.[0]?.limitacion?.nombre || 'N/A',
        limitacion_descripcion: h.habitantes_limitaciones?.[0]?.limitacion?.descripcion || null,
        limitacion_observacion: h.habitantes_limitaciones?.[0]?.observacion || null,
        condicion: h.habitantes_condiciones?.[0]?.condicion?.nombre || 'N/A',
        condicion_descripcion: h.habitantes_condiciones?.[0]?.condicion?.descripcion || null,
        condicion_observacion: h.habitantes_condiciones?.[0]?.observacion || null,
        disposicion: h.habitantes_disposiciones?.[0]?.disposiciones?.nombre || 'N/A',
        disposicion_descripcion: h.habitantes_disposiciones?.[0]?.disposiciones?.descripcion || null,
        disposicion_observacion: h.habitantes_disposiciones?.[0]?.observacion || null,
        contacto: h.contacto,
        propiedad_id: h.propiedad_id,
        family_id: h.family_id,
        family: h.family ? {
          id: h.family.id,
          apellidos: h.family.apellidos,
          description: h.family.description
        } : null,
        propiedad_info: {
          id: property.id,
          property_type_id: property.property_type_id,
          property_type_name: property.property_types?.type_name || 'N/A',
          municipio: property.municipio?.nombre || 'N/A',
          barrio: property.barrio?.nombre || 'N/A',
          sector: property.sector?.nombre || 'N/A',
          usng: property.usngsquare?.usng || 'N/A',
          direccion: property.direccion || 'N/A',
          municipio_id: property.municipio?.id_municipio,
          barrio_id: property.barrio?.id_barrio,
          sector_id: property.sector?.id_sector
        }
      }))
    };
  }));

  // Apply filters if provided
  let filteredProperties = propertiesWithDamage;
  if (filters?.ageRange || filters?.residentCategory) {
    filteredProperties = propertiesWithDamage.filter((property: any) => {
      const habitantes = property.habitantes;
      if (!habitantes.length) return false;
      
      return habitantes.some((resident: any) => {
        const ageMatch = filters?.ageRange ? 
          (!filters.ageRange.min || resident.edad >= filters.ageRange.min) && 
          (!filters.ageRange.max || resident.edad <= filters.ageRange.max) : 
          true;
        
        const categoryMatch = filters?.residentCategory ? 
          resident.categoria.toLowerCase() === filters.residentCategory.toLowerCase() : 
          true;
        
        return ageMatch && categoryMatch;
      });
    });
  }

  return NextResponse.json({
    searchType: 'usng',
    usngQuery,
    propiedades: filteredProperties
  });
}

async function handleMunicipioSearch(municipioQuery: string, filters?: SearchRequest['filters']) {
  const includeClause = {
    municipio: true,
    barrio: true, 
    sector: true,
    usngsquare: true,
    property_types: true,
    habitantes: {
      include: {
        family: true,
        ...(prisma as any).habitantes_condiciones ? {
          habitantes_condiciones: {
            include: { condicion: true }
          }
        } : {},
        ...(prisma as any).habitantes_limitaciones ? {
          habitantes_limitaciones: {
            include: { limitacion: true }
          }
        } : {},
        ...(prisma as any).habitantes_disposiciones ? {
          habitantes_disposiciones: {
            include: { disposiciones: true }
          }
        } : {}
      }
    }
  } as any; // Use any type assertion to bypass Prisma typing limitations

  const properties = await prisma.propiedades_existentes.findMany({
    where: {
      municipio: {
        nombre: {
          contains: municipioQuery,
          mode: 'insensitive'
        }
      }
    },
    include: includeClause
  });

  // Process properties with type assertions
  const propertiesWithDamage = await Promise.all(properties.map(async (property: any) => {
    const damageInfo = await getPropertyDamageInfo(property.id);
    return {
      id: property.id,
      property_type_id: property.property_type_id,
      property_type_name: property.property_types?.type_name || 'N/A',
      daños: damageInfo.daños,
      fecha: damageInfo.fecha,
      municipio: property.municipio?.nombre || 'N/A',
      barrio: property.barrio?.nombre || 'N/A',
      sector: property.sector?.nombre || 'N/A',
      usng: property.usngsquare?.usng || 'N/A',
      direccion: property.direccion || 'N/A',
      habitantes: property.habitantes.map((h: any) => ({
        id: h.id,
        nombre: h.nombre,
        apellido1: h.apellido1,
        apellido2: h.apellido2,
        edad: h.edad,
        sex: h.sex || h.sexo,
        sexo: h.sexo || h.sex,
        categoria: h.categoria,
        limitacion: h.habitantes_limitaciones?.[0]?.limitacion?.nombre || 'N/A',
        limitacion_descripcion: h.habitantes_limitaciones?.[0]?.limitacion?.descripcion || null,
        limitacion_observacion: h.habitantes_limitaciones?.[0]?.observacion || null,
        condicion: h.habitantes_condiciones?.[0]?.condicion?.nombre || 'N/A',
        condicion_descripcion: h.habitantes_condiciones?.[0]?.condicion?.descripcion || null,
        condicion_observacion: h.habitantes_condiciones?.[0]?.observacion || null,
        disposicion: h.habitantes_disposiciones?.[0]?.disposiciones?.nombre || 'N/A',
        disposicion_descripcion: h.habitantes_disposiciones?.[0]?.disposiciones?.descripcion || null,
        disposicion_observacion: h.habitantes_disposiciones?.[0]?.observacion || null,
        contacto: h.contacto,
        propiedad_id: h.propiedad_id,
        family_id: h.family_id,
        family: h.family ? {
          id: h.family.id,
          apellidos: h.family.apellidos,
          description: h.family.description
        } : null,
        propiedad_info: {
          id: property.id,
          property_type_id: property.property_type_id,
          property_type_name: property.property_types?.type_name || 'N/A',
          municipio: property.municipio?.nombre || 'N/A',
          barrio: property.barrio?.nombre || 'N/A',
          sector: property.sector?.nombre || 'N/A',
          usng: property.usngsquare?.usng || 'N/A',
          direccion: property.direccion || 'N/A',
          municipio_id: property.municipio?.id_municipio,
          barrio_id: property.barrio?.id_barrio,
          sector_id: property.sector?.id_sector
        }
      }))
    };
  }));

  // Apply additional filters
  if (filters) {
    const filteredProperties = propertiesWithDamage.filter(property => {
      let matches = true;

      if (filters.usng && !property.usng.toLowerCase().includes(filters.usng.toLowerCase())) {
        matches = false;
      }

      if (filters.municipio && !property.municipio.toLowerCase().includes(filters.municipio.toLowerCase())) {
        matches = false;
      }

      if (filters.propertyType) {
        const propertyTypeId = parseInt(filters.propertyType);
        if (!isNaN(propertyTypeId)) {
          matches = property.property_type_id === propertyTypeId;
        }
      }

      if (filters.ageRange) {
        const hasResidentInRange = property.habitantes.some(
          (resident: any) => {
            const age = resident.edad || 0; // Default to 0 if null
            return age >= filters.ageRange!.min && age <= filters.ageRange!.max;
          }
        );
        if (!hasResidentInRange) {
          matches = false;
        }
      }

      if (filters.residentCategory) {
        const hasResidentOfCategory = property.habitantes.some(
          (resident: any) => resident.categoria === filters.residentCategory
        );
        if (!hasResidentOfCategory) {
          matches = false;
        }
      }

      return matches;
    });

    return NextResponse.json({
      searchType: 'municipio',
      municipioQuery,
      propiedades: filteredProperties
    });
  }

  return NextResponse.json({
    searchType: 'municipio',
    municipioQuery,
    propiedades: propertiesWithDamage
  });
}

async function handleResidentSearch(residentQuery: string, filters?: SearchRequest['filters']) {
  try {
    // Build the where clause for the query with family included
    const whereClause: any = {};
    
    // Add name filter if a query is provided
    if (residentQuery) {
      whereClause.nombre = {
        contains: residentQuery,
        mode: 'insensitive'
      };
    }
    
    // Add category filter
    if (filters?.residentCategory && filters.residentCategory !== 'all') {
      whereClause.categoria = filters.residentCategory;
    }
    
    // Add condition filter by ID
    if (filters?.residentCondition) {
      const conditionId = parseInt(filters.residentCondition);
      if (!isNaN(conditionId)) {
        whereClause.habitantes_condiciones = {
          some: {
            condicion: {
              id: conditionId
            }
          }
        };
      }
    }
    
    // Add limitation filter by ID
    if (filters?.residentLimitation) {
      const limitationId = parseInt(filters.residentLimitation);
      if (!isNaN(limitationId)) {
        whereClause.habitantes_limitaciones = {
          some: {
            limitacion: {
              id: limitationId
            }
          }
        };
      }
    }
    
    // Add disposition filter by ID
    if (filters?.residentDisposition) {
      const dispositionId = parseInt(filters.residentDisposition);
      if (!isNaN(dispositionId)) {
        whereClause.habitantes_disposiciones = {
          some: {
            disposiciones: {
              id: dispositionId
            }
          }
        };
      }
    }
    
    // Add age range filter
    if (filters?.ageRange) {
      whereClause.edad = {
        gte: filters.ageRange.min,
        lte: filters.ageRange.max
      };
    }
    
    // Add family name filter
    if (filters?.familyName) {
      whereClause.family = {
        apellidos: {
          contains: filters.familyName,
          mode: 'insensitive'
        }
      };
    }
    
    // Add sex filter
    if (filters?.sex) {
      whereClause.sex = {
        equals: filters.sex,
        mode: 'insensitive'
      };
    }

    // First find all residents that match the criteria - use any to bypass type checking
    const residents = await prisma.habitantes.findMany({
      where: whereClause,
      include: {
        propiedad: {
          include: {
            municipio: true,
            barrio: true,
            sector: true,
            usngsquare: true,
            property_types: true
          }
        },
        family: true,
        ...(prisma as any).habitantes_condiciones ? {
          habitantes_condiciones: {
            include: { condicion: true }
          }
        } : {},
        ...(prisma as any).habitantes_limitaciones ? {
          habitantes_limitaciones: {
            include: { limitacion: true }
          }
        } : {},
        ...(prisma as any).habitantes_disposiciones ? {
          habitantes_disposiciones: {
            include: { disposiciones: true }
          }
        } : {}
      }
    } as any);
    
    if (residents.length === 0) {
      return NextResponse.json({
        searchType: 'residente',
        residentQuery,
        residentes: []
      });
    }

    // Now process the residents to include property information
    const processedResidents = residents.map((resident: any) => {
      return {
        id: resident.id,
        nombre: resident.nombre,
        apellido1: resident.apellido1,
        apellido2: resident.apellido2,
        edad: resident.edad,
        sex: resident.sex || resident.sexo,
        sexo: resident.sexo || resident.sex,
        categoria: resident.categoria,
        limitacion: resident.habitantes_limitaciones?.[0]?.limitacion?.nombre || 'N/A',
        limitacion_descripcion: resident.habitantes_limitaciones?.[0]?.limitacion?.descripcion || null,
        limitacion_observacion: resident.habitantes_limitaciones?.[0]?.observacion || null,
        limitacion_id: resident.habitantes_limitaciones?.[0]?.limitacion?.id || null,
        condicion: resident.habitantes_condiciones?.[0]?.condicion?.nombre || 'N/A',
        condicion_descripcion: resident.habitantes_condiciones?.[0]?.condicion?.descripcion || null,
        condicion_observacion: resident.habitantes_condiciones?.[0]?.observacion || null,
        condicion_id: resident.habitantes_condiciones?.[0]?.condicion?.id || null,
        disposicion: resident.habitantes_disposiciones?.[0]?.disposiciones?.nombre || 'N/A',
        disposicion_descripcion: resident.habitantes_disposiciones?.[0]?.disposiciones?.descripcion || null,
        disposicion_observacion: resident.habitantes_disposiciones?.[0]?.observacion || null,
        disposicion_id: resident.habitantes_disposiciones?.[0]?.disposiciones?.id || null,
        contacto: resident.contacto,
        propiedad_id: resident.propiedad_id,
        family_id: resident.family_id,
        // Add the full array structures for frontend filtering and sorting
        habitantes_condiciones: resident.habitantes_condiciones || [],
        habitantes_limitaciones: resident.habitantes_limitaciones || [],
        habitantes_disposiciones: resident.habitantes_disposiciones || [],
        // Add location IDs for frontend filtering
        id_municipio: resident.propiedad?.municipio?.id_municipio || null,
        id_barrio: resident.propiedad?.barrio?.id_barrio || null,
        id_sector: resident.propiedad?.sector?.id_sector || null,
        family: resident.family ? {
          id: resident.family.id,
          apellidos: resident.family.apellidos,
          description: resident.family.description
        } : null,
        propiedad_info: {
          id: resident.propiedad?.id || null,
          property_type_id: resident.propiedad?.property_type_id,
          property_type_name: resident.propiedad?.property_types?.type_name || 'N/A',
          municipio: resident.propiedad?.municipio?.nombre || 'N/A',
          barrio: resident.propiedad?.barrio?.nombre || 'N/A',
          sector: resident.propiedad?.sector?.nombre || 'N/A',
          usng: resident.propiedad?.usngsquare?.usng || 'N/A',
          direccion: resident.propiedad?.direccion || 'N/A',
          municipio_id: resident.propiedad?.municipio?.id_municipio,
          barrio_id: resident.propiedad?.barrio?.id_barrio,
          sector_id: resident.propiedad?.sector?.id_sector
        }
      };
    });

    return NextResponse.json({
      searchType: 'residente',
      residentQuery,
      residentes: processedResidents
    });
  } catch (error) {
    console.error("Error in handleResidentSearch:", error);
    return NextResponse.json(
      { error: "Error al buscar residentes" },
      { status: 500 }
    );
  }
} 