import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Simple in-memory cache
let cachedUsngCodes: any = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '100');
  const offset = parseInt(searchParams.get('offset') || '0');
  const search = searchParams.get('search') || '';

  try {
    const now = Date.now();
    
    // Return cached data if available, not expired, and no search term
    if (!search && cachedUsngCodes && (now - cacheTimestamp) < CACHE_DURATION) {
      const paginatedResults = cachedUsngCodes.slice(offset, offset + limit);
      
      return NextResponse.json(paginatedResults, { 
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'HIT'
        }
      });
    }
    
    // Build the query
    const whereClause = search 
      ? { usng_code: { contains: search } }
      : {};
    
    // Get USNG codes from the database
    const usngCodes = await prisma.uSNGSquare.findMany({
      where: whereClause as any, // Type assertion to fix type error
      select: {
        id: true,
        usng: true
      },
      orderBy: {
        usng: 'asc'
      },
      skip: offset,
      take: limit
    });
    
    // Update cache if no search term
    if (!search) {
      cachedUsngCodes = usngCodes;
      cacheTimestamp = now;
    }
    
    return NextResponse.json(usngCodes, { 
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': search ? 'BYPASS' : 'MISS'
      }
    });
  } catch (error) {
    console.error('Error fetching USNG codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch USNG codes' },
      { status: 500 }
    );
  }
} 