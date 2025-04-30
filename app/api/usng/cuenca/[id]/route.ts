import { NextResponse } from 'next/server';

// Simulated database of cuencas - this matches the data in app/api/cuencas/route.ts
const cuencasData = [
  {
    id: 1,
    nombre: "Rio La Plata",
    descripcion: "Cuenca hidrográfica del Río La Plata en el norte de Puerto Rico",
    geom: "POLYGON((-66.52 18.42, -66.24 18.42, -66.24 18.12, -66.52 18.12, -66.52 18.42))",
    usngCoords: [
        "19Q GA 8945", "19Q GA 8944", "19Q GA 8943", "19Q GA 8942", "19Q GA 8941", "19Q GA 8940",
        "19Q GA 8939", "19Q GA 8938", "19Q GA 8937", "19Q GA 8936", "19Q GA 9036", "19Q GA 9135",
        "19Q GA 9034", "19Q GA 9033", "19Q GA 9133", "19Q GA 9132", "19Q GA 9131", "19Q GA 9130",
        "19Q GA 9230", "19Q GA 9229", "19Q GA 9129", "19Q GA 9228", "19Q GA 9328", "19Q GA 9329",
        "19Q GA 9429", "19Q GA 9428", "19Q GA 9528", "19Q GA 9527", "19Q GA 9526", "19Q GA 9426",
        "19Q GA 9425", "19Q GA 9525", "19Q GA 9424", "19Q GA 9524", "19Q GA 9523", "19Q GA 9522",
        "19Q GA 9521", "19Q GA 9520", "19Q GA 9519", "19Q GA 9418", "19Q GA 9417", "19Q GA 9317",
        "19Q GA 9316", "19Q GA 9216", "19Q GA 9215", "19Q GA 9214", "19Q GA 9114", "19Q GA 9213",
        "19Q GA 9113", "19Q GA 9112", "19Q GA 9212", "19Q GA 9211", "19Q GA 9311", "19Q GA 9310",
        "19Q GA 9309", "19Q GA 9308", "19Q GA 9408", "19Q GA 9508", "19Q GA 9507", "19Q GA 9607",
        "19Q GA 9608", "19Q GA 9708", "19Q GA 9707", "19Q GA 9808", "19Q GA 9807", "19Q GA 9907",
        "19Q GA 10007", "19Q GA 10008", "19Q GA 10108", "19Q GA 10107", "19Q GA 10207", "19Q GA 10307",
        "19Q GA 10306", "19Q GA 10406", "19Q GA 10405", "19Q GA 10404", "19Q GA 10504", "19Q GA 10503",
        "19Q GA 10403", "19Q GA 10402", "19Q GA 10501", "19Q GA 10601", "19Q GA 10701", "19Q GA 10702",
        "19Q GA 10802", "19Q GA 10803", "19Q GA 10903", "19Q GA 11003", "19Q GA 11004", "19Q GA 9227",
        "19Q GA 9327", "19Q GA 9326", "19Q GA 9325", "19Q GA 9225", "19Q GA 9125", "19Q GA 9025",
        "19Q GA 8925", "19Q GA 8924", "19Q GA 9024", "19Q GA 9023", "19Q GA 8923", "19Q GA 8922",
        "19Q GA 9022", "19Q GA 9021", "19Q GA 9020", "19Q GA 9111", "19Q GA 9110", "19Q GA 9010",
        "19Q GA 9011", "19Q GA 8911", "19Q GA 8811", "19Q GA 8711", "19Q GA 8611", "19Q GA 8610",
        "19Q GA 8510", "19Q GA 8410", "19Q GA 8409", "19Q GA 8408", "19Q GA 8508", "19Q GA 8507"
      ]
  },
  {
    id: 2,
    nombre: "Rio Grande de Loíza",
    descripcion: "Cuenca hidrográfica del Río Grande de Loíza en el este de Puerto Rico",
    geom: "POLYGON((-66.10 18.38, -65.85 18.38, -65.85 18.15, -66.10 18.15, -66.10 18.38))",
    usngCoords: ["19Q GA 12045", "19Q GA 12146", "19Q GA 12247"]
  },
  {
    id: 3,
    nombre: "Rio Cibuco",
    descripcion: "Cuenca hidrográfica del Río Cibuco en el norte de Puerto Rico",
    geom: "POLYGON((-66.70 18.45, -66.40 18.45, -66.40 18.20, -66.70 18.20, -66.70 18.45))",
    usngCoords: ["19Q GA 7540", "19Q GA 7641", "19Q GA 7742"]
  },
  {
    id: 4,
    nombre: "Rio Grande de Arecibo",
    descripcion: "Cuenca hidrográfica del Río Grande de Arecibo en el norte de Puerto Rico",
    geom: "POLYGON((-66.95 18.40, -66.65 18.40, -66.65 18.15, -66.95 18.15, -66.95 18.40))",
    usngCoords: ["19Q GA 5535", "19Q GA 5636", "19Q GA 5737"]
  },
  {
    id: 5,
    nombre: "Rio Guajataca",
    descripcion: "Cuenca hidrográfica del Río Guajataca en el noroeste de Puerto Rico",
    geom: "POLYGON((-67.20 18.45, -66.95 18.45, -66.95 18.20, -67.20 18.20, -67.20 18.45))",
    usngCoords: ["19Q GA 3040", "19Q GA 3141", "19Q GA 3242"]
  }
];

export async function GET(
  _: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Cuenca ID is required" },
        { status: 400 }
      );
    }
    
    const cuencaId = parseInt(id);
    const cuenca = cuencasData.find(c => c.id === cuencaId);
    
    if (!cuenca) {
      return NextResponse.json(
        { error: "Cuenca not found" },
        { status: 404 }
      );
    }
    
    // Return the USNG coordinates for the cuenca
    return NextResponse.json({
      id: cuenca.id,
      nombre: cuenca.nombre,
      data: cuenca.usngCoords
    });
    
  } catch (error) {
    console.error("Error fetching cuenca USNG data:", error);
    return NextResponse.json(
      { error: "Failed to fetch cuenca USNG data" },
      { status: 500 }
    );
  }
} 