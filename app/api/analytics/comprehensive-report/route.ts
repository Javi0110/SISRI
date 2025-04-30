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

type SearchType = 'evento' | 'usng' | 'municipio';

interface SearchRequest {
  searchType: SearchType;
  searchQuery: string;
  filters?: {
    usng?: string;
    municipio?: string;
    ageRange?: { min: number; max: number };
    propertyType?: string;
    incidentType?: string;
    damageType?: string;
    residentCategory?: string;
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

    if (!searchQuery) {
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
              habitantes: true
            }
          }
        }
      },
      notificaciones: true
    }
  });

  if (!event) {
    return NextResponse.json(
      { error: "Evento no encontrado" },
      { status: 404 }
    );
  }

  // Get all notifications for this event
  const notifications = await prisma.notificacion.findMany({
    where: {
      eventoId: event.id
    },
    orderBy: {
      fecha_creacion: 'desc'
    }
  });

  // Create a map of property IDs to their associated notifications
  const propertyNotifications = new Map();
  for (const notification of notifications) {
    if (notification.propiedad_id) {
      if (!propertyNotifications.has(notification.propiedad_id)) {
        propertyNotifications.set(notification.propiedad_id, []);
      }
      propertyNotifications.get(notification.propiedad_id).push({
        id: notification.id,
        numero_notificacion: notification.numero_notificacion,
        tipo: notification.tipo,
        estado: notification.estado,
        fecha_creacion: notification.fecha_creacion
      });
    }
  }

  // Apply filters to properties
  let properties = event.propiedades_afectadas
    .map(prop => {
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
        habitantes: property.habitantes.map(h => ({
          id: h.id,
          nombre: h.nombre,
          edad: h.edad,
          categoria: h.categoria,
          limitacion: h.limitacion,
          condicion: h.condicion,
          disposicion: h.disposicion,
          propiedad_id: h.propiedad_id
        }))
      };
    });

  // Apply additional filters
  if (filters) {
    properties = properties.filter(property => {
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
          resident => {
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
          resident => resident.categoria === filters.residentCategory
        );
        if (!hasResidentOfCategory) {
          matches = false;
        }
      }

      return matches;
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
    notificaciones: notifications,
    propiedades: properties
  });
}

async function handleUSNGSearch(usngQuery: string, filters?: SearchRequest['filters']) {
  const properties = await prisma.propiedades_existentes.findMany({
    where: {
      usngsquare: {
        usng: {
          contains: usngQuery,
          mode: 'insensitive'
        }
      }
    },
    include: {
      municipio: true,
      barrio: true,
      sector: true,
      usngsquare: true,
      habitantes: true
    }
  });

  if (properties.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron propiedades en esta coordenada USNG" },
      { status: 404 }
    );
  }

  // Get damage information for each property
  const propertiesWithDamage = await Promise.all(
    properties.map(async (prop) => {
      const damageInfo = await getPropertyDamageInfo(prop.id);
      return {
        id: prop.id,
        tipo: prop.tipo,
        daños: damageInfo.daños,
        fecha: damageInfo.fecha,
        municipio: prop.municipio?.nombre || 'N/A',
        barrio: prop.barrio?.nombre || 'N/A',
        sector: prop.sector?.nombre || 'N/A',
        usng: prop.usngsquare?.usng || 'N/A',
        habitantes: prop.habitantes.map(h => ({
          id: h.id,
          nombre: h.nombre,
          edad: h.edad,
          categoria: h.categoria,
          limitacion: h.limitacion,
          condicion: h.condicion,
          disposicion: h.disposicion,
          propiedad_id: h.propiedad_id
        }))
      };
    })
  );

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
          resident => {
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
          resident => resident.categoria === filters.residentCategory
        );
        if (!hasResidentOfCategory) {
          matches = false;
        }
      }

      return matches;
    });

    return NextResponse.json({
      searchType: 'usng',
      usngQuery,
      propiedades: filteredProperties
    });
  }

  return NextResponse.json({
    searchType: 'usng',
    usngQuery,
    propiedades: propertiesWithDamage
  });
}

async function handleMunicipioSearch(municipioQuery: string, filters?: SearchRequest['filters']) {
  const properties = await prisma.propiedades_existentes.findMany({
    where: {
      municipio: {
        nombre: {
          contains: municipioQuery,
          mode: 'insensitive'
        }
      }
    },
    include: {
      municipio: true,
      barrio: true,
      sector: true,
      usngsquare: true,
      habitantes: true
    }
  });

  if (properties.length === 0) {
    return NextResponse.json(
      { error: "No se encontraron propiedades en este municipio" },
      { status: 404 }
    );
  }

  // Get damage information for each property
  const propertiesWithDamage = await Promise.all(
    properties.map(async (prop) => {
      const damageInfo = await getPropertyDamageInfo(prop.id);
      return {
        id: prop.id,
        tipo: prop.tipo,
        daños: damageInfo.daños,
        fecha: damageInfo.fecha,
        municipio: prop.municipio?.nombre || 'N/A',
        barrio: prop.barrio?.nombre || 'N/A',
        sector: prop.sector?.nombre || 'N/A',
        usng: prop.usngsquare?.usng || 'N/A',
        habitantes: prop.habitantes.map(h => ({
          id: h.id,
          nombre: h.nombre,
          edad: h.edad,
          categoria: h.categoria,
          limitacion: h.limitacion,
          condicion: h.condicion,
          disposicion: h.disposicion,
          propiedad_id: h.propiedad_id
        }))
      };
    })
  );

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
          resident => {
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
          resident => resident.categoria === filters.residentCategory
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