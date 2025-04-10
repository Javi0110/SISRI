import { NextResponse } from "next/server";
import prisma from '../../../../lib/prisma'

export async function POST(request: Request) {
  try {
    const { baseTable, selectedFields, conditions } = await request.json();

    const query = {
      select: selectedFields.reduce((acc: any, field: string) => {
        acc[field] = true;
        return acc;
      }, {}),
      where: conditions.length > 0 ? {
        [conditions[0].field]: {
          [conditions[0].operator]: conditions[0].value
        }
      } : {}
    };

    const results = await (prisma as any)[baseTable].findMany(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Analytics query error:", error);
    return NextResponse.json(
      { error: "Failed to execute query" },
      { status: 500 }
    );
  }
} 