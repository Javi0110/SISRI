import prisma from './prisma';

export type AnalyticsSearchFilters = {
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

export const HABITANTE_RELATIONS_INCLUDE = {
  family: true,
  habitantes_condiciones: { include: { condicion: true } },
  habitantes_limitaciones: { include: { limitacion: true } },
  habitantes_disposiciones: { include: { disposiciones: true } },
} as const;

export const PROPERTY_SEARCH_INCLUDE = {
  municipio: true,
  barrio: true,
  sector: true,
  usngsquare: true,
  property_types: true,
  habitantes: { include: HABITANTE_RELATIONS_INCLUDE },
} as const;

type DamageInfo = { daños: string | null; fecha: Date | null };

export async function getBulkPropertyDamageInfo(
  propertyIds: number[]
): Promise<Map<number, DamageInfo>> {
  const damageMap = new Map<number, DamageInfo>();
  propertyIds.forEach((id) => damageMap.set(id, { daños: null, fecha: null }));

  if (propertyIds.length === 0) {
    return damageMap;
  }

  try {
    const damageData = await prisma.propiedades_afectadas.findMany({
      where: { propiedadId: { in: propertyIds } },
      orderBy: [{ propiedadId: 'asc' }, { fecha: 'desc' }],
      select: { propiedadId: true, daños: true, fecha: true },
    });

    const seen = new Set<number>();
    for (const damage of damageData) {
      if (seen.has(damage.propiedadId)) continue;
      seen.add(damage.propiedadId);
      damageMap.set(damage.propiedadId, {
        daños: damage.daños,
        fecha: damage.fecha,
      });
    }
  } catch (error) {
    console.error('Error fetching bulk damage info:', error);
  }

  return damageMap;
}

export function mapHabitante(h: any, property: any) {
  return {
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
    family: h.family
      ? {
          id: h.family.id,
          apellidos: h.family.apellidos,
          description: h.family.description,
        }
      : null,
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
      sector_id: property.sector?.id_sector,
    },
  };
}

export function mapPropertyWithDamage(property: any, damageInfo: DamageInfo) {
  return {
    id: property.id,
    property_type_id: property.property_type_id,
    property_type_name: property.property_types?.type_name || 'N/A',
    daños: damageInfo.daños,
    fecha: damageInfo.fecha,
    municipio: property.municipio?.nombre || 'N/A',
    municipio_id: property.id_municipio ?? property.municipio?.id_municipio ?? null,
    barrio: property.barrio?.nombre || 'N/A',
    barrio_id: property.id_barrio ?? property.barrio?.id_barrio ?? null,
    sector: property.sector?.nombre || 'N/A',
    sector_id: property.id_sector ?? property.sector?.id_sector ?? null,
    usng: property.usngsquare?.usng || 'N/A',
    direccion: property.direccion || 'N/A',
    habitantes: (property.habitantes ?? []).map((h: any) => mapHabitante(h, property)),
  };
}

export function applyPropertyFilters(properties: any[], filters?: AnalyticsSearchFilters) {
  if (!filters) return properties;

  return properties.filter((property) => {
    if (filters.propertyType) {
      const propertyTypeId = parseInt(filters.propertyType, 10);
      if (!Number.isNaN(propertyTypeId) && property.property_type_id !== propertyTypeId) {
        return false;
      }
    }

    if (
      filters.municipio &&
      !property.municipio.toLowerCase().includes(filters.municipio.toLowerCase())
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
      const hasResidentInRange = property.habitantes.some((resident: any) => {
        const age = resident.edad ?? 0;
        return (
          (!filters.ageRange?.min || age >= filters.ageRange.min) &&
          (!filters.ageRange?.max || age <= filters.ageRange.max)
        );
      });
      if (!hasResidentInRange) return false;
    }

    if (filters.residentCategory) {
      const category = filters.residentCategory.toLowerCase();
      const hasCategory = property.habitantes.some(
        (resident: any) => resident.categoria?.toLowerCase() === category
      );
      if (!hasCategory) return false;
    }

    if (filters.residentCondition) {
      const condition = filters.residentCondition.toLowerCase();
      const hasCondition = property.habitantes.some(
        (resident: any) =>
          resident.condicion?.toLowerCase() === condition ||
          (resident.habitantes_condiciones ?? []).some(
            (entry: any) => entry.condicion?.nombre?.toLowerCase() === condition
          )
      );
      if (!hasCondition) return false;
    }

    if (filters.residentLimitation) {
      const limitation = filters.residentLimitation.toLowerCase();
      const hasLimitation = property.habitantes.some(
        (resident: any) =>
          resident.limitacion?.toLowerCase() === limitation ||
          (resident.habitantes_limitaciones ?? []).some(
            (entry: any) => entry.limitacion?.nombre?.toLowerCase() === limitation
          )
      );
      if (!hasLimitation) return false;
    }

    if (filters.residentDisposition) {
      const disposition = filters.residentDisposition.toLowerCase();
      const hasDisposition = property.habitantes.some(
        (resident: any) =>
          resident.disposicion?.toLowerCase() === disposition ||
          (resident.habitantes_disposiciones ?? []).some(
            (entry: any) => entry.disposiciones?.nombre?.toLowerCase() === disposition
          )
      );
      if (!hasDisposition) return false;
    }

    if (filters.sex) {
      const sex = filters.sex.toLowerCase();
      const hasSex = property.habitantes.some(
        (resident: any) => resident.sex?.toLowerCase() === sex
      );
      if (!hasSex) return false;
    }

    return true;
  });
}

export function parseLocationCompositeQuery(
  query: string
): { municipioId: number; barrioId: number; sectorId: number } | null {
  const match = query.trim().match(/^(\d{1,3})-(\d{1,3})-(\d{1,3})$/);
  if (!match) return null;

  const municipioId = Number.parseInt(match[1], 10);
  const barrioId = Number.parseInt(match[2], 10);
  const sectorId = Number.parseInt(match[3], 10);

  if ([municipioId, barrioId, sectorId].some((id) => Number.isNaN(id))) {
    return null;
  }

  return { municipioId, barrioId, sectorId };
}

export async function searchPropertiesWithDamage(
  where: Record<string, unknown>,
  orderBy?: Record<string, 'asc' | 'desc'>[]
) {
  const properties = await prisma.propiedades_existentes.findMany({
    where,
    orderBy,
    include: PROPERTY_SEARCH_INCLUDE,
  });

  const damageMap = await getBulkPropertyDamageInfo(properties.map((p) => p.id));

  return properties.map((property) =>
    mapPropertyWithDamage(property, damageMap.get(property.id) ?? { daños: null, fecha: null })
  );
}
