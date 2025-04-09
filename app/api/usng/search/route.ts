import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const term = searchParams.get('term');
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  if (!term) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    // Search for USNG codes that contain the search term
    const usngCodes = await prisma.usngsquare.findMany({
      where: {
        usng: {
          contains: term,
        },
      },
      select: {
        id: true,
        usng: true,
      },
      take: limit,
      orderBy: {
        usng: 'asc',
      },
    });

    return NextResponse.json(usngCodes, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error searching USNG codes:', error);
    return NextResponse.json(
      { error: 'Failed to search USNG codes' },
      { status: 500 }
    );
  }
} 