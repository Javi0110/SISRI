import { PrismaClient } from '@prisma/client';
const { EsriJSON } = require('ol/format')
const proj4 = require('proj4')
const fetch = require('node-fetch')

const prisma = new PrismaClient()
const format = new EsriJSON()


// Define projections
proj4.defs([
  ['EPSG:3857', '+proj=merc +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs'],
  ['EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs']
])

const PUERTO_RICO_EXTENT = {
  xmin: -7526593.264043136,
  ymin: 1941281.9702659545,
  xmax: -7250000.369888829,
  ymax: 2213831.9532818417,
  spatialReference: { wkid: 3857 }
}

async function fetchAndStoreUSNGSquares(resultOffset = 0) {
  const url = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/ArcGIS/rest/services/US_National_Grid_HFL_V/FeatureServer/3/query?' +
    'f=json&' +
    'returnGeometry=true&' +
    'spatialRel=esriSpatialRelIntersects&' +
    'where=1=1&' +
    'outFields=USNG&' +
    'outSR=102100&' +
    'inSR=102100&' +
    'resultOffset=' + resultOffset + '&' +
    'resultRecordCount=2000&' +
    'geometry=' + encodeURIComponent(JSON.stringify(PUERTO_RICO_EXTENT))

  try {
    const response = await fetch(url)
    const data = await response.json() as {
      exceededTransferLimit: boolean;
      features?: { geometry: any; attributes: any }[];
    }
    if (data.features && data.features.length > 0) {
      // Process features in batches to avoid memory issues
      const batchSize = 100
      for (let i = 0; i < data.features.length; i += batchSize) {
        const batch = data.features.slice(i, i + batchSize)
        
        const squares = batch.map(feature => {
          // Convert to GeoJSON
          const geoJSON = format.writeFeatureObject(format.readFeature(feature))
          
          // Extract coordinates and convert to lat/lon
          const coordinates = feature.geometry.rings[0]
          const convertedCoords = coordinates.map(([x, y]: [number, number]) => 
            proj4('EPSG:3857', 'EPSG:4326', [x, y])
          )
          
          // Separate into latitudes and longitudes
          const latitudes = convertedCoords.map(([_lon, lat]: [number, number]) => lat)
          const longitudes = convertedCoords.map(([lon, _lat]: [number, number]) => lon)
          
          return {
            usng: feature.attributes.USNG,
            geometry: geoJSON.geometry,
            latitudes,
            longitudes
          }
        })

        // Batch upsert to database
        await prisma.$transaction(
          squares.map(square =>
            prisma.uSNGSquare.upsert({
              where: { usng: square.usng },
              update: {
                geometry: square.geometry,
                latitudes: square.latitudes,
                longitudes: square.longitudes
              },
              create: {
                usng: square.usng,
                geometry: square.geometry,
                latitudes: square.latitudes,
                longitudes: square.longitudes
              }
            })
          )
        )

        console.log(`Processed batch of ${squares.length} USNG squares`)
      }

      // If there are more features, fetch the next batch
      if (data.exceededTransferLimit) {
        await fetchAndStoreUSNGSquares(resultOffset + 2000)
      }
    }
  } catch (error) {
    console.error('Error fetching/storing USNG squares:', error)
  }
}

// Run the script
async function main() {
  console.log('Starting USNG square import...')
  await fetchAndStoreUSNGSquares()
  console.log('USNG square import completed')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 