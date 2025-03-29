import { NextResponse } from 'next/server'

const ARCGIS_URL = 'https://services1.arcgis.com/yXQCTDG9T4v54pUr/arcgis/rest/services/Cuerpos_de_Agua_PR/FeatureServer/0/query'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Forward the request to ArcGIS
    const response = await fetch(`${ARCGIS_URL}?${searchParams.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`ArcGIS API responded with status: ${response.status}`)
    }

    const data = await response.json()
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Error proxying water bodies request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch water bodies data' },
      { status: 500 }
    )
  }
} 