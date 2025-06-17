import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
    
type SearchType = 'evento' | 'usng' | 'municipio' | 'residente';

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
  // Find the event by title
  const event = await prisma.eventos.findFirst({
    where: {
      titulo: {
        contains: eventQuery,
        mode: 'insensitive'
      },
      ...(filters?.incidentType ? {
        tipo: {
          equals: filters.incidentType,
          mode: 'insensitive'
        }
      } : {}),
      ...(filters?.dateRange ? {
        fecha: {
          gte: new Date(filters.dateRange.start),
          lte: new Date(filters.dateRange.end)
        }
      } : {})
    },
    include: {
      propiedades_afectadas: {
        include: {
          propiedad: {
            include: {
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
            }
          }
        }
      },
      notificaciones: true
    }
  }) as any; // Type assertion to handle complex include structure

  // Process the event data
  const propertyNotifications = new Map();
  event?.notificaciones?.forEach((notif: any) => {
    const propId = notif.propiedad_id;
    if (!propertyNotifications.has(propId)) {
      propertyNotifications.set(propId, []);
    }
    propertyNotifications.get(propId).push({
      id: notif.id,
      message: notif.mensaje,
      date: notif.fecha
    });
  });

  // Map properties with their data
  let properties = event?.propiedades_afectadas?.map((prop: any) => {
    const property = prop.propiedad;
    const propertyNotifs = propertyNotifications.get(property.id) || [];

    return {
      id: property.id,
      property_type_id: property.property_type_id,
      property_type_name: property.property_types?.type_name || 'N/A',
      daños: prop.daños,
      fecha: prop.fecha,
      municipio: property.municipio?.nombre || 'N/A',
      barrio: property.barrio?.nombre || 'N/A',
      sector: property.sector?.nombre || 'N/A',
      usng: property.usngsquare?.usng || 'N/A',
      direccion: property.direccion || 'N/A',
      notificaciones: propertyNotifs,
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
  }) || [];

  // Filter residents by condition, limitation, and disposition
  if (filters?.residentCondition || filters?.residentLimitation || filters?.residentDisposition) {
    properties = properties.map((property: any) => {
      let filteredHabitantes = property.habitantes;
      if (filters?.residentCondition) {
        const condFilter = filters.residentCondition?.toLowerCase() ?? '';
        filteredHabitantes = filteredHabitantes.filter(
          (h: any) =>
            h.condicion && h.condicion.toLowerCase().includes(condFilter)
        );
      }
      if (filters?.residentLimitation) {
        const limFilter = filters.residentLimitation?.toLowerCase() ?? '';
        filteredHabitantes = filteredHabitantes.filter(
          (h: any) =>
            h.limitacion && h.limitacion.toLowerCase().includes(limFilter)
        );
      }
      if (filters?.residentDisposition) {
        const dispFilter = filters.residentDisposition?.toLowerCase() ?? '';
        filteredHabitantes = filteredHabitantes.filter(
          (h: any) =>
            h.disposicion && h.disposicion.toLowerCase().includes(dispFilter)
        );
      }
      return { ...property, habitantes: filteredHabitantes };
    });
    // Remove properties with no residents left
    properties = properties.filter((property: any) => property.habitantes.length > 0);
  }

  // Filter properties based on the filters
  if (filters?.ageRange || filters?.propertyType) {
    properties = properties.filter((property: any) => {
      const habitantes = property.habitantes;
      if (!habitantes.length) return false;
      
      return habitantes.some((h: any) => {
        const ageMatch = filters?.ageRange ? 
          (!filters.ageRange.min || h.edad >= filters.ageRange.min) && 
          (!filters.ageRange.max || h.edad <= filters.ageRange.max) : 
          true;
        
        const categoryMatch = filters?.propertyType ? 
          h.categoria.toLowerCase() === filters.propertyType.toLowerCase() : 
          true;
        
        return ageMatch && categoryMatch;
      });
    });
  }

  return NextResponse.json({
    searchType: 'evento',
    evento: {
      id: event.id,
      titulo: event.titulo,
      descripcion: event.descripcion,
      fecha: event.fecha,
      tipo: event.tipo,
      estado: event.estado,
      usng: event.usngId ? (await prisma.usngsquare.findUnique({ where: { id: event.usngId } }))?.usng : null
    },
    notificaciones: event.notificaciones,
    propiedades: properties
  });
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

      if (filters.propertyType && property.property_type_name !== filters.propertyType) {
        // Use case-insensitive comparison with additional mapping
        const propertyType = property.property_type_name?.toLowerCase() || '';
        const filterType = filters.propertyType.toLowerCase();
        
        const residentialTerms = ['residencial', 'residential', 'residencia'];
        const commercialTerms = ['comercial', 'commercial', 'comercio'];
        const industrialTerms = ['industrial', 'industria'];
        const hospitalTerms = ['hospital', 'médico', 'medico', 'salud'];
        
        let typeMatches = propertyType === filterType;
        
        // Check for type mappings
        if (residentialTerms.includes(filterType)) {
          typeMatches = residentialTerms.includes(propertyType);
        } else if (commercialTerms.includes(filterType)) {
          typeMatches = commercialTerms.includes(propertyType);
        } else if (industrialTerms.includes(filterType)) {
          typeMatches = industrialTerms.includes(propertyType);
        } else if (hospitalTerms.includes(filterType)) {
          typeMatches = hospitalTerms.includes(propertyType);
        }
        
        if (!typeMatches) {
          matches = false;
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
    
    // Add condition filter
    if (filters?.residentCondition) {
      whereClause.habitantes_condiciones = {
        some: {
          condicion: {
            nombre: {
              contains: filters.residentCondition,
              mode: 'insensitive'
            }
          }
        }
      };
    }
    
    // Add limitation filter with special handling for diabetes
    if (filters?.residentLimitation) {
      // Special handling for diabetes
      if (filters.residentLimitation.toLowerCase() === 'diabetes') {
        whereClause.habitantes_limitaciones = {
          some: {
            limitacion: {
              nombre: {
                in: ['Diabetes', 'diabetes', 'diabetico', 'diabética', 'diabetica', 'diabetis', 'tipo 1', 'tipo 2', 'azucar'],
                mode: 'insensitive'
              }
            }
          }
        };
      } else {
        // For other limitations, use contains
        whereClause.habitantes_limitaciones = {
          some: {
            limitacion: {
              nombre: {
                contains: filters.residentLimitation,
                mode: 'insensitive'
              }
            }
          }
        };
      }
    }
    
    // Add disposition filter
    if (filters?.residentDisposition) {
      whereClause.habitantes_disposiciones = {
        some: {
          disposiciones: {
            nombre: {
              contains: filters.residentDisposition,
              mode: 'insensitive'
            }
          }
        }
      };
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
        condicion: resident.habitantes_condiciones?.[0]?.condicion?.nombre || 'N/A',
        condicion_descripcion: resident.habitantes_condiciones?.[0]?.condicion?.descripcion || null,
        condicion_observacion: resident.habitantes_condiciones?.[0]?.observacion || null,
        disposicion: resident.habitantes_disposiciones?.[0]?.disposiciones?.nombre || 'N/A',
        disposicion_descripcion: resident.habitantes_disposiciones?.[0]?.disposiciones?.descripcion || null,
        disposicion_observacion: resident.habitantes_disposiciones?.[0]?.observacion || null,
        contacto: resident.contacto,
        propiedad_id: resident.propiedad_id,
        family_id: resident.family_id,
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