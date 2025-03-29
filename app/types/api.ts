export interface EventoCreateInput {
  id_notificacion: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  hora: string;
  grid_id: string;
  cuencas: {
    create: Array<{
      cuenca_id: number;
    }>;
  };
  incidentes: {
    create: Array<{
      tipo: string;
      descripcion: string;
    }>;
  };
  propiedades_afectadas: {
    create: Array<{
      tipo: string;
      municipio_id: number;
      barrio_id: number | null;
      sector_id: number | null;
      direccion: string;
    }>;
  };
} 