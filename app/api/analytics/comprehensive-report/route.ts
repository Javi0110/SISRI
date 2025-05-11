import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
    
// type PropiedadAfectada = {
//   propiedadId: number;
//   propiedad: {
//     tipo: string | null;
//   };
//   daños: string | null;
//   fecha: Date;
// };

// type Habitante = {
//   id: number;
//   nombre: string | null;
//   edad: number | null;
//   categoria: string | null;
//   limitacion: string | null;
//   condicion: string | null;
//   disposicion: string | null;
// };

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
}

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
              habitantes: {
                include: {
                  family: true
                } as any
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
      tipo: property.tipo,
      daños: prop.daños,
      fecha: prop.fecha,
      municipio: property.municipio?.nombre || 'N/A',
      barrio: property.barrio?.nombre || 'N/A',
      sector: property.sector?.nombre || 'N/A',
      usng: property.usngsquare?.usng || 'N/A',
      notificaciones: propertyNotifs,
      habitantes: property.habitantes.map((h: any) => ({
        id: h.id,
        nombre: h.nombre,
        edad: h.edad,
        categoria: h.categoria,
        limitacion: h.limitacion,
        condicion: h.condicion,
        disposicion: h.disposicion,
        propiedad_id: h.propiedad_id,
        family_id: h.family_id,
        family: h.family ? {
          id: h.family.id,
          apellidos: h.family.apellidos,
          description: h.family.description
        } : null
      }))
    };
  }) || [];

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
    habitantes: {
      include: {
        family: true
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
      tipo: property.tipo,
      daños: damageInfo.daños,
      fecha: damageInfo.fecha,
      municipio: property.municipio?.nombre || 'N/A',
      barrio: property.barrio?.nombre || 'N/A',
      sector: property.sector?.nombre || 'N/A',
      usng: property.usngsquare?.usng || 'N/A',
      habitantes: property.habitantes.map((h: any) => ({
        id: h.id,
        nombre: h.nombre,
        edad: h.edad,
        categoria: h.categoria,
        limitacion: h.limitacion,
        condicion: h.condicion,
        disposicion: h.disposicion,
        propiedad_id: h.propiedad_id,
        family_id: h.family_id,
        family: h.family ? {
          id: h.family.id,
          apellidos: h.family.apellidos,
          description: h.family.description
        } : null
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
    habitantes: {
      include: {
        family: true
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
      tipo: property.tipo,
      daños: damageInfo.daños,
      fecha: damageInfo.fecha,
      municipio: property.municipio?.nombre || 'N/A',
      barrio: property.barrio?.nombre || 'N/A',
      sector: property.sector?.nombre || 'N/A',
      usng: property.usngsquare?.usng || 'N/A',
      habitantes: property.habitantes.map((h: any) => ({
        id: h.id,
        nombre: h.nombre,
        edad: h.edad,
        categoria: h.categoria,
        limitacion: h.limitacion,
        condicion: h.condicion,
        disposicion: h.disposicion,
        propiedad_id: h.propiedad_id,
        family_id: h.family_id,
        family: h.family ? {
          id: h.family.id,
          apellidos: h.family.apellidos,
          description: h.family.description
        } : null
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

      if (filters.propertyType && property.tipo !== filters.propertyType) {
        matches = false;
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
      whereClause.condicion = {
        contains: filters.residentCondition,
        mode: 'insensitive'
      };
    }
    
    // Add limitation filter
    if (filters?.residentLimitation) {
      whereClause.limitacion = {
        contains: filters.residentLimitation,
        mode: 'insensitive'
      };
    }
    
    // Add disposition filter
    if (filters?.residentDisposition) {
      whereClause.disposicion = {
        contains: filters.residentDisposition,
        mode: 'insensitive'
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
            usngsquare: true
          }
        },
        family: true
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
    const processedResidents = await Promise.all(
      residents.map(async (resident: any) => {
        const property = resident.propiedad;
        const damageInfo = await getPropertyDamageInfo(resident.propiedad_id);

        return {
          id: resident.id,
          nombre: resident.nombre,
          edad: resident.edad,
          categoria: resident.categoria,
          limitacion: resident.limitacion,
          condicion: resident.condicion,
          disposicion: resident.disposicion,
          propiedad_id: resident.propiedad_id,
          family_id: resident.family_id,
          family: resident.family ? {
            id: resident.family.id,
            apellidos: resident.family.apellidos,
            description: resident.family.description
          } : null,
          property: property ? {
            id: property.id,
            tipo: property.tipo,
            daños: damageInfo.daños,
            fecha: damageInfo.fecha,
            municipio: property.municipio?.nombre || 'N/A',
            barrio: property.barrio?.nombre || 'N/A',
            sector: property.sector?.nombre || 'N/A',
            usng: property.usngsquare?.usng || 'N/A'
          } : null
        };
      })
    );

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