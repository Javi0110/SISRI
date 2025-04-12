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
    const { searchType, searchQuery }: SearchRequest = await req.json();

    if (!searchQuery) {
      return NextResponse.json(
        { error: "El término de búsqueda es requerido" },
        { status: 400 }
      );
    }

    switch (searchType) {
      case 'evento': {
        return await handleEventoSearch(searchQuery);
      }
      case 'usng': {
        return await handleUSNGSearch(searchQuery);
      }
      case 'municipio': {
        return await handleMunicipioSearch(searchQuery);
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

async function handleEventoSearch(eventTitle: string) {
  // Find the event with its location
  const evento = await prisma.eventos.findFirst({
    where: {
      titulo: {
        contains: eventTitle,
        mode: 'insensitive'
      }
    },
    include: {
      usngsquare: true
    }
  });

  if (!evento) {
    return NextResponse.json(
      { error: "Evento no encontrado" },
      { status: 404 }
    );
  }

  // Get affected properties with their damage details and location info
  const propiedadesAfectadas = await prisma.propiedades_afectadas.findMany({
    where: {
      eventoId: evento.id
    },
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
  });

  return NextResponse.json({
    searchType: 'evento',
    evento: {
      id: evento.id,
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      fecha: evento.fecha,
      tipo: evento.tipo,
      estado: evento.estado,
      usng: evento.usngsquare?.usng || null
    },
    propiedades: propiedadesAfectadas.map(pa => ({
      id: pa.propiedadId,
      tipo: pa.propiedad.tipo,
      daños: pa.daños,
      fecha: pa.fecha,
      municipio: pa.propiedad.municipio?.nombre || 'N/A',
      barrio: pa.propiedad.barrio?.nombre || 'N/A',
      sector: pa.propiedad.sector?.nombre || 'N/A',
      usng: pa.propiedad.usngsquare?.usng || 'N/A',
      habitantes: pa.propiedad.habitantes.map(h => ({
        id: h.id,
        nombre: h.nombre,
        edad: h.edad,
        categoria: h.categoria,
        limitacion: h.limitacion,
        condicion: h.condicion,
        disposicion: h.disposicion,
        propiedad_id: h.propiedad_id
      }))
    }))
  });
}

async function handleUSNGSearch(usngQuery: string) {
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

  return NextResponse.json({
    searchType: 'usng',
    usngQuery,
    propiedades: propertiesWithDamage
  });
}

async function handleMunicipioSearch(municipioQuery: string) {
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

  return NextResponse.json({
    searchType: 'municipio',
    municipioQuery,
    propiedades: propertiesWithDamage
  });
} 