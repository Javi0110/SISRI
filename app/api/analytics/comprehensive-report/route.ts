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

export async function POST(req: Request) {
  try {
    const { eventTitle } = await req.json();

    if (!eventTitle) {
      return NextResponse.json(
        { error: "El título del evento es requerido" },
        { status: 400 }
      );
    }

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

    // Format the response
    const formattedResponse = {
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
    };

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error("Error processing comprehensive report:", error);
    return NextResponse.json(
      { error: "Error al procesar el reporte" },
      { status: 500 }
    );
  }
} 