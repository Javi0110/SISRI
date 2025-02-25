import { PrismaClient } from '@prisma/client'
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const usngSquares = await prisma.uSNGSquare.findMany({
      select: { usng: true },
      orderBy: { usng: 'asc' }
    })
    
    return NextResponse.json(usngSquares.map((square: { usng: string }) => square.usng))
  } catch (error) {
    console.error("Error fetching USNG list:", error)
    return NextResponse.json({ error: "Failed to fetch USNG list" }, { status: 500 })
  }
} 