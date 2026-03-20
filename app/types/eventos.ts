export interface EventoCreateInput {
  notificacionId: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  gridId: string;
  incidentes: Array<{
    tipo: string;
    descripcion: string;
    cuencaId: number;
  }>;
  propiedades_afectadas: Array<{
    daños?: string;
    propiedad: {
      create: {
        tipo: string;
        valor: number;
        id_municipio: number;
        id_barrio: number | null;
        id_sector: number | null;
        nombre?: string | null;
        direccion: string;
        property_number?: string | null;
      };
    };
  }>;
} 