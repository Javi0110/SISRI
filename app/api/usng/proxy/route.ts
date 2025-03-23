import { NextResponse } from 'next/server';

// Improved cache with better key generation and management
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Better cache key generator with more precise chunking
const generateCacheKey = (geometry: string): string => {
  try {
    const { xmin, ymin, xmax, ymax } = JSON.parse(geometry);
    // Round to 2 decimal places for better cache hits while maintaining precision
    return `${xmin.toFixed(2)},${ymin.toFixed(2)},${xmax.toFixed(2)},${ymax.toFixed(2)}`;
  } catch {
    return geometry;
  }
};

// Clean expired cache entries periodically
const cleanCache = () => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_DURATION) {
      cache.delete(key);
    }
  }
};

// The actual USNG service URL from your configuration
const USNG_SERVICE_URL = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/US_National_Grid_HFL_V/FeatureServer/3/query';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  
  try {
    // Clean cache periodically
    if (Math.random() < 0.1) { // 10% chance on each request
      cleanCache();
    }
    
    // Get geometry for cache key
    const geometry = params.get('geometry');
    if (!geometry) {
      return new NextResponse(JSON.stringify({ 
        error: 'Missing geometry parameter' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check cache first
    const cacheKey = generateCacheKey(geometry);
    const cachedData = cache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
      console.log('Cache hit for:', cacheKey);
      return new NextResponse(JSON.stringify(cachedData.data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
          'X-Cache': 'HIT'
        }
      });
    }
    
    // Ensure all required parameters are present
    const requiredParams = {
      f: 'json',
      returnGeometry: 'true',
      spatialRel: 'esriSpatialRelIntersects',
      outSR: '102100',
      geometryType: 'esriGeometryEnvelope',
      where: '1=1',
      resultRecordCount: '8000',
      outFields: 'USNG,OBJECTID,UTM_Zone,GRID1MIL',
    };

    // Add any missing required parameters
    for (const [key, value] of Object.entries(requiredParams)) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }

    const serviceUrl = `${USNG_SERVICE_URL}?${params.toString()}`;
    
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const response = await fetch(serviceUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error('Service error:', {
        status: response.status,
        statusText: response.statusText,
        url: serviceUrl
      });
      throw new Error(`Service responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Store in cache
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'MISS'
      }
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Failed to fetch USNG data',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
} 