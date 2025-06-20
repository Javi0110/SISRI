import { NextResponse } from "next/server";
import prisma from '../../../lib/prisma';

export async function GET() {
  try {
    const propertyTypes = await prisma.property_types.findMany({
      orderBy: {
        id: 'asc'
      }
    });

    return NextResponse.json(propertyTypes);
  } catch (error) {
    console.error('Error fetching property types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch property types' },
      { status: 500 }
    );
  }
} 