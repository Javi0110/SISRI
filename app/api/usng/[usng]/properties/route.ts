import { NextResponse } from "next/server"

export async function GET(
  _: Request,
  { params }: { params: { usng: string } }
) {
  try {
    const { usng } = params
    
    if (!usng) {
      return NextResponse.json(
        { error: "USNG parameter is required" },
        { status: 400 }
      )
    }

    const properties = await prisma.propiedad.findMany({
      where: {
        usng_code: usng
      }
    })

    return NextResponse.json(properties)
  } catch (error) {
    console.error("Error fetching properties:", error)
    return NextResponse.json(
      { error: "Failed to fetch properties" },
      { status: 500 }
    )
  }
} 