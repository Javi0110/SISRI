import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get("term");

    // Allow empty searches to show all families
    if (term && term.trim() !== '') {
      // Use $queryRaw with proper parameter binding to prevent SQL injection
      const families = await prisma.$queryRaw`
        SELECT id, apellidos, description, created_at, updated_at 
        FROM sisri.families 
        WHERE apellidos ILIKE ${`%${term}%`}
        ORDER BY apellidos ASC
        LIMIT 30
      `;
      return NextResponse.json(families);
    } else {
      // No term provided, return all families
      const families = await prisma.$queryRaw`
        SELECT id, apellidos, description, created_at, updated_at 
        FROM sisri.families 
        ORDER BY apellidos ASC
        LIMIT 30
      `;
      return NextResponse.json(families);
    }
  } catch (error) {
    console.error("Error searching families:", error);
    return NextResponse.json(
      { error: "Error searching families" },
      { status: 500 }
    );
  }
} 