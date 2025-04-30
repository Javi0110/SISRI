import { NextResponse } from 'next/server';

// This is a mock implementation using hardcoded data
// In a real application, this would fetch from a database

interface Cuenca {
  id: number;
  nombre: string;
  descripcion: string;
  usngCoords: string[];
  geom: string;
}

// Simulated database of cuencas
const cuencasData: Cuenca[] = [
  {
    id: 1,
    nombre: "Rio La Plata",
    descripcion: "Cuenca hidrográfica del Río La Plata en el norte de Puerto Rico",
    geom: "POLYGON((-66.52 18.42, -66.24 18.42, -66.24 18.12, -66.52 18.12, -66.52 18.42))",
    usngCoords: [
      "19Q GA 8942", "19Q GA 8941", "19Q GA 8940", "19Q GA 8939", "19Q GA 8938",
      "19Q GA 8937", "19Q GA 9036", "19Q GA 9035", "19Q GA 9034", "19Q GA 9033",
      "19Q GA 9132", "19Q GA 9230", "19Q GA 9229", "19Q GA 9328", "19Q GA 9427",
      "19Q GA 9426", "19Q GA 9525", "19Q GA 9524", "19Q GA 9623", "19Q GA 9622",
      "19Q GA 9621", "19Q GA 9519", "19Q GA 9418", "19Q GA 9417", "19Q GA 9316",
      "19Q GA 9215", "19Q GA 9114", "19Q GA 9013", "19Q GA 9112", "19Q GA 9211",
      "19Q GA 9310", "19Q GA 9309", "19Q GA 9408", "19Q GA 9507", "19Q GA 9606",
      "19Q GA 9705", "19Q GA 9807", "19Q GA 9806", "19Q GA 9907", "19Q GA 10007",
      "19Q GA 10108", "19Q GA 10207", "19Q GA 10307", "19Q GA 10406", "19Q GA 10405",
      "19Q GA 10504", "19Q GA 10503", "19Q GA 10402", "19Q GA 10401", "19Q GA 10501",
      "19Q GA 10702", "19Q GA 10803", "19Q GA 10903", "19Q GA 11004", "19Q GA 9327",
      "19Q GA 9325", "19Q GA 9125", "19Q GA 8925", "19Q GA 8926", "19Q GA 8927",
      "19Q GA 8922", "19Q GA 8921", "19Q GA 9010", "19Q GA 8811", "19Q GA 8711",
      "19Q GA 8610", "19Q GA 8510", "19Q GA 8509", "19Q GA 8409"
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

export async function GET(request: Request) {
  try {
    // Get search parameter if it exists
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase();
    
    let result = cuencasData;
    
    // Filter by search term if provided
    if (search) {
      result = cuencasData.filter(cuenca => 
        cuenca.nombre.toLowerCase().includes(search) || 
        cuenca.descripcion.toLowerCase().includes(search)
      );
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching cuencas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cuencas data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    
    if (id) {
      const cuenca = cuencasData.find(c => c.id === parseInt(id));
      
      if (cuenca) {
        return NextResponse.json(cuenca);
      } else {
        return NextResponse.json(
          { error: 'Cuenca not found' },
          { status: 404 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'ID parameter is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error fetching cuenca details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cuenca data' },
      { status: 500 }
    );
  }
} 