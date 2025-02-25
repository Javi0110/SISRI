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

// The actual USNG service URL from your configuration
const USNG_SERVICE_URL = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/US_National_Grid_HFL_V/FeatureServer/3/query';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  
  try {
    // Ensure all required parameters are present
    const requiredParams = {
      f: 'json',
      returnGeometry: 'true',
      spatialRel: 'esriSpatialRelIntersects',
      outSR: '102100',
      geometryType: 'esriGeometryEnvelope',
      where: '1=1',
      resultRecordCount: '8000',
      orderByFields: 'OBJECTID',
      outFields: 'USNG,OBJECTID',
    };

    // Add any missing required parameters
    for (const [key, value] of Object.entries(requiredParams)) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }

    const serviceUrl = `${USNG_SERVICE_URL}?${params.toString()}`;
    console.log('Requesting from:', serviceUrl);

    const response = await fetch(serviceUrl, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Service error:', {
        status: response.status,
        statusText: response.statusText,
        url: serviceUrl
      });
      throw new Error(`Service responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Service response:', {
      featureCount: data.features?.length || 0,
      extent: data.extent,
      exceededTransferLimit: data.exceededTransferLimit
    });

    return new NextResponse(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
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