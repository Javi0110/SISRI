import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import {
  applyPropertyFilters,
  HABITANTE_RELATIONS_INCLUDE,
  parseLocationCompositeQuery,
  searchPropertiesWithDamage,
  type AnalyticsSearchFilters,
} from "../../../../lib/analytics-search";

type SearchType = 'evento' | 'usng' | 'municipio' | 'residente';

interface Habitante {
  id: number;
  edad: number;
  sex?: string;
  categoria: string;
  habitantes_condiciones: { condicion: { nombre: string } }[];
  habitantes_limitaciones: { limitacion: { nombre: string } }[];
  habitantes_disposiciones: { disposiciones: { nombre: string } }[];
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
  filters?: AnalyticsSearchFilters;
}

export async function POST(req: Request) {
  try {
    const { searchType, searchQuery, filters }: SearchRequest = await req.json();

    if (!searchQuery && searchType !== 'residente' && searchType !== 'municipio') {
      return NextResponse.json(
        { error: "El término de búsqueda es requerido" },
        { status: 400 }
      );
    }

    switch (searchType) {
      case 'evento':
        return await handleEventSearch(searchQuery, filters);
      case 'usng':
        return await handleUSNGSearch(searchQuery, filters);
      case 'municipio':
        return await handleMunicipioSearch(searchQuery, filters);
      case 'residente':
        return await handleResidentSearch(searchQuery, filters);
      default:
        return NextResponse.json(
          { error: "Tipo de búsqueda no válido" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing search:", error);
    return NextResponse.json(
      { error: "Error al procesar la búsqueda" },
      { status: 500 }
    );
  }
}

async function handleEventSearch(eventQuery: string, filters?: AnalyticsSearchFilters) {
  try {
    const event = await prisma.eventos.findFirst({
      where: {
        OR: [
          { titulo: { contains: eventQuery, mode: 'insensitive' } },
          { descripcion: { contains: eventQuery, mode: 'insensitive' } },
        ],
      },
      include: {
        usngsquare: true,
        notificaciones: {
          include: {
            propiedades_existentes: {
              include: {
                property_types: true,
                habitantes: { include: HABITANTE_RELATIONS_INCLUDE },
                municipio: true,
                barrio: true,
                sector: true,
                usngsquare: true,
              },
            },
          },
        },
        propiedades_afectadas: {
          include: {
            propiedad: {
              include: {
                property_types: true,
                habitantes: { include: HABITANTE_RELATIONS_INCLUDE },
                municipio: true,
                barrio: true,
                sector: true,
                usngsquare: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({
        searchType: 'evento',
        searchQuery: eventQuery,
        evento: null,
        propiedades: [],
      });
    }

    let properties: any[] = [];

    for (const notification of event.notificaciones) {
      const property = notification.propiedades_existentes;
      if (!property) continue;

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
        habitantes: property.habitantes || [],
      });
    }

    for (const afectada of event.propiedades_afectadas) {
      const property = afectada.propiedad;
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
        habitantes: property.habitantes || [],
      });
    }

    properties = properties.filter(
      (property, index, self) => index === self.findIndex((p) => p.id === property.id)
    );

    if (filters) {
      properties = applyEventPropertyFilters(properties, filters);
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
        usng: event.usngsquare?.usng ?? null,
      },
      notificaciones: event.notificaciones.map((notification) => ({
        id: notification.id,
        tipo: notification.tipo,
        mensaje: notification.mensaje,
        fecha_creacion: notification.fecha_creacion,
        estado: notification.estado,
        numero_notificacion: notification.numero_notificacion,
      })),
      propiedades: properties,
    });
  } catch (error) {
    console.error('Error in handleEventSearch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function applyEventPropertyFilters(properties: Property[], filters: AnalyticsSearchFilters) {
  return properties.filter((property) => {
    if (filters.propertyType) {
      const propertyTypeId = parseInt(filters.propertyType, 10);
      if (!Number.isNaN(propertyTypeId) && property.property_type_id !== propertyTypeId) {
        return false;
      }
    }

    if (
      filters.municipio &&
      property.municipio.toLowerCase() !== filters.municipio.toLowerCase()
    ) {
      return false;
    }

    if (filters.barrio && property.barrio.toLowerCase() !== filters.barrio.toLowerCase()) {
      return false;
    }

    if (filters.sector && property.sector.toLowerCase() !== filters.sector.toLowerCase()) {
      return false;
    }

    if (filters.usng && !property.usng.toLowerCase().includes(filters.usng.toLowerCase())) {
      return false;
    }

    if (filters.ageRange) {
      if (
        !property.habitantes.some(
          (habitante) =>
            (!filters.ageRange?.min || habitante.edad >= filters.ageRange.min) &&
            (!filters.ageRange?.max || habitante.edad <= filters.ageRange.max)
        )
      ) {
        return false;
      }
    }

    if (filters.residentCategory) {
      const category = filters.residentCategory.toLowerCase();
      if (
        !property.habitantes.some(
          (habitante) => habitante.categoria.toLowerCase() === category
        )
      ) {
        return false;
      }
    }

    if (filters.residentCondition) {
      const condition = filters.residentCondition.toLowerCase();
      if (
        !property.habitantes.some((habitante) =>
          habitante.habitantes_condiciones.some(
            (entry) => entry.condicion.nombre.toLowerCase() === condition
          )
        )
      ) {
        return false;
      }
    }

    if (filters.residentLimitation) {
      const limitation = filters.residentLimitation.toLowerCase();
      if (
        !property.habitantes.some((habitante) =>
          habitante.habitantes_limitaciones.some(
            (entry) => entry.limitacion.nombre.toLowerCase() === limitation
          )
        )
      ) {
        return false;
      }
    }

    if (filters.residentDisposition) {
      const disposition = filters.residentDisposition.toLowerCase();
      if (
        !property.habitantes.some((habitante) =>
          habitante.habitantes_disposiciones.some(
            (entry) => entry.disposiciones.nombre.toLowerCase() === disposition
          )
        )
      ) {
        return false;
      }
    }

    if (filters.sex) {
      const sex = filters.sex.toLowerCase();
      if (!property.habitantes.some((habitante) => habitante.sex?.toLowerCase() === sex)) {
        return false;
      }
    }

    return true;
  });
}

async function handleUSNGSearch(usngQuery: string, filters?: AnalyticsSearchFilters) {
  const propertiesWithDamage = await searchPropertiesWithDamage(
    {
      usngsquare: {
        usng: { contains: usngQuery, mode: 'insensitive' },
      },
    },
    [{ id_municipio: 'asc' }, { id_barrio: 'asc' }, { id_sector: 'asc' }]
  );

  return NextResponse.json({
    searchType: 'usng',
    usngQuery,
    propiedades: applyPropertyFilters(propertiesWithDamage, filters),
  });
}

async function handleMunicipioSearch(municipioQuery: string, filters?: AnalyticsSearchFilters) {
  const locationComposite = parseLocationCompositeQuery(municipioQuery);
  const where = locationComposite
    ? {
        id_municipio: locationComposite.municipioId,
        id_barrio: locationComposite.barrioId,
        id_sector: locationComposite.sectorId,
      }
    : {
        municipio: {
          nombre: { contains: municipioQuery, mode: 'insensitive' as const },
        },
      };

  const propertiesWithDamage = await searchPropertiesWithDamage(where);

  return NextResponse.json({
    searchType: 'municipio',
    municipioQuery,
    propiedades: applyPropertyFilters(propertiesWithDamage, filters),
  });
}

async function handleResidentSearch(residentQuery: string, filters?: AnalyticsSearchFilters) {
  try {
    const whereClause: Record<string, unknown> = {};

    if (residentQuery) {
      whereClause.nombre = { contains: residentQuery, mode: 'insensitive' };
    }

    if (filters?.residentCategory && filters.residentCategory !== 'all') {
      whereClause.categoria = filters.residentCategory;
    }

    if (filters?.residentCondition) {
      const conditionId = parseInt(filters.residentCondition, 10);
      if (!Number.isNaN(conditionId)) {
        whereClause.habitantes_condiciones = {
          some: { condicion: { id: conditionId } },
        };
      }
    }

    if (filters?.residentLimitation) {
      const limitationId = parseInt(filters.residentLimitation, 10);
      if (!Number.isNaN(limitationId)) {
        whereClause.habitantes_limitaciones = {
          some: { limitacion: { id: limitationId } },
        };
      }
    }

    if (filters?.residentDisposition) {
      const dispositionId = parseInt(filters.residentDisposition, 10);
      if (!Number.isNaN(dispositionId)) {
        whereClause.habitantes_disposiciones = {
          some: { disposiciones: { id: dispositionId } },
        };
      }
    }

    if (filters?.ageRange) {
      whereClause.edad = {
        gte: filters.ageRange.min,
        lte: filters.ageRange.max,
      };
    }

    if (filters?.familyName) {
      whereClause.family = {
        apellidos: { contains: filters.familyName, mode: 'insensitive' },
      };
    }

    if (filters?.sex) {
      whereClause.sex = { equals: filters.sex, mode: 'insensitive' };
    }

    const residents = await prisma.habitantes.findMany({
      where: whereClause,
      include: {
        propiedad: {
          include: {
            municipio: true,
            barrio: true,
            sector: true,
            usngsquare: true,
            property_types: true,
          },
        },
        ...HABITANTE_RELATIONS_INCLUDE,
      },
    });

    const processedResidents = residents.map((resident: any) => ({
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
      habitantes_condiciones: resident.habitantes_condiciones || [],
      habitantes_limitaciones: resident.habitantes_limitaciones || [],
      habitantes_disposiciones: resident.habitantes_disposiciones || [],
      id_municipio: resident.propiedad?.municipio?.id_municipio || null,
      id_barrio: resident.propiedad?.barrio?.id_barrio || null,
      id_sector: resident.propiedad?.sector?.id_sector || null,
      family: resident.family
        ? {
            id: resident.family.id,
            apellidos: resident.family.apellidos,
            description: resident.family.description,
          }
        : null,
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
        sector_id: resident.propiedad?.sector?.id_sector,
      },
    }));

    return NextResponse.json({
      searchType: 'residente',
      residentQuery,
      residentes: processedResidents,
    });
  } catch (error) {
    console.error("Error in handleResidentSearch:", error);
    return NextResponse.json({ error: "Error al buscar residentes" }, { status: 500 });
  }
}
