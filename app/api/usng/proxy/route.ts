import { NextResponse } from 'next/server';

// Simpler cache with fixed expiry
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Simple cache key generator
const generateCacheKey = (geometry: string): string => {
  try {
    const { xmin, ymin, xmax, ymax } = JSON.parse(geometry);
    // Round to larger grid cells for better cache hits
    return `${Math.round(xmin/10000)},${Math.round(ymin/10000)},${Math.round(xmax/10000)},${Math.round(ymax/10000)}`;
  } catch {
    return geometry;
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const geometry = searchParams.get('geometry');
  
  if (!geometry) {
    return NextResponse.json({ error: 'Missing geometry parameter' }, { status: 400 });
  }

  // Simple cache check
  const cacheKey = generateCacheKey(geometry);
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return NextResponse.json(cached.data);
  }

  const url = `https://services2.arcgis.com/FiaPA4ga0iQKduv3/ArcGIS/rest/services/US_National_Grid_HFL_V/FeatureServer/3/query?${searchParams}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept-Encoding': 'gzip',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Only cache if we have features
    if (data.features?.length > 0) {
      cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching USNG data:', error);
    
    // Return cached data on error, even if expired
    const staleData = cache.get(cacheKey);
    if (staleData) {
      return NextResponse.json(staleData.data);
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch USNG data' 
    }, { status: 500 });
  }
} 