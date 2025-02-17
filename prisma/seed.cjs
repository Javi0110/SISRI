const { PrismaClient } = require('@prisma/client')
const mgrs = require('mgrs')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

const municipios = [
  {
    nombre: "Adjuntas",
    latitud: 18.1627,
    longitud: -66.7222,
    codigo_municipio: "001"
  },
  {
    nombre: "Aguada",
    latitud: 18.3788,
    longitud: -67.1883,
    codigo_municipio: "003"
  },
  {
    nombre: "Aguadilla",
    latitud: 18.4277,
    longitud: -67.1547,
    codigo_municipio: "005"
  },
  {
    nombre: "Aguas Buenas",
    latitud: 18.2569,
    longitud: -66.1019,
    codigo_municipio: "007"
  },
  {
    nombre: "Aibonito",
    latitud: 18.1400,
    longitud: -66.2663,
    codigo_municipio: "009"
  },
  {
    nombre: "Añasco",
    latitud: 18.2827,
    longitud: -67.1396,
    codigo_municipio: "011"
  },
  {
    nombre: "Arecibo",
    latitud: 18.4725,
    longitud: -66.7156,
    codigo_municipio: "013"
  },
  {
    nombre: "Arroyo",
    latitud: 17.9666,
    longitud: -66.0613,
    codigo_municipio: "015"
  },
  // ... Add all other municipalities
]

const property_types = ["Residential", "Commercial", "Industrial", "Agricultural"]

// Configuration for seeding control
const SEED_CONFIG = {
  TABLES: {
    KILOMETER_GRID: false,    // Set to true to populate KilometerGrid
    MUNICIPIOS: false,        // Set to true to populate Municipios
    PROPERTIES: false,         // Set to true to populate Properties
    CUENCAS: true,           // Set to true to populate Cuencas

  },
  CLEAR_BEFORE_SEED: {
    PROPERTIES: false,        // Set to true to clear properties before seeding
    CUENCAS: false,          // Set to true to clear cuencas before seeding
  },
  LIMITS: {
    MAX_TOTAL_PROPERTIES: 200,
    PROPERTIES_PER_GRID: 2,
    MAX_CUENCAS_PER_GRID: 3
  },
  PROPERTY_TYPES: ["Residential", "Commercial", "Industrial", "Agricultural"]
}

const cuencaNames = [
  "Río Grande de Loíza",
  "Río de la Plata",
  "Río Cibuco",
  "Río Guajataca",
  "Río Grande de Arecibo",
  "Río Bayamón",
  "Río Humacao",
  "Río Añasco",
  "Río Guanajibo",
  "Río Portugués"
]

// Remove type definitions and replace with JSDoc comments
/**
 * @typedef {Object} JsonPoint
 * @property {'Point'} type
 * @property {[number, number]} coordinates
 */

/**
 * @typedef {Object} Ring
 * @property {number[][][]} rings
 */

/**
 * @typedef {Object} Feature
 * @property {Object} attributes
 * @property {string} attributes.USNG
 * @property {Ring} geometry
 */

/**
 * @typedef {Object} FeatureResponse
 * @property {Feature[]} features
 * @property {boolean} [exceededTransferLimit]
 */

/**
 * @typedef {Object} GridFeature
 * @property {Object|null} geometria
 * @property {number} id
 */
// Function to convert lat/lon to USNG with 1000m precision
function convertLatLngToUSNG(lat, lon) {
  try {
    const usng1000m = mgrs.forward([lon, lat], 4) // 4-digit precision for 1000m grid
    return usng1000m.replace(/\s/g, '') // Remove spaces
  } catch (error) {
    console.error(`Error converting coordinates (${lat}, ${lon}) to USNG:`, error)
    throw error
  }
}
// Function to calculate centroid and USNG code
/**
 * Calculates the centroid coordinates and USNG code for a set of polygon rings
 * @param {number[][][]} rings Array of rings containing coordinate pairs
 * @returns {{centroid: Object, usngCode: string}} Object with centroid point and USNG code
 */
function calculateCentroidAndUSNG(rings) {
  try {
    const firstRing = rings[0]
    let sumX = 0
    let sumY = 0
    
    firstRing.forEach(point => {
      sumX += point[0]
      sumY += point[1]
    })

    const centerLon = sumX / firstRing.length
    const centerLat = sumY / firstRing.length

    return {
      centroid: {
        type: "Point",
        coordinates: [centerLon, centerLat]
      },
      usngCode: convertLatLngToUSNG(centerLat, centerLon)
    }
  } catch (error) {
    console.error('Error calculating centroid and USNG:', error)
    throw error
  }
}

// Function to fetch USNG grid features with pagination and retry logic
async function fetchUSNGFeatures(offset = 0, retryCount = 3) {
  const url = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/ArcGIS/rest/services/US_National_Grid_HFL_V/FeatureServer/3/query?' +
    'f=json&' +
    'returnGeometry=true&' +
    'spatialRel=esriSpatialRelIntersects&' +
    'where=1=1&' +
    'outFields=USNG&' +
    'outSR=4326&' +
    'inSR=102100&' +
    'resultOffset=' + offset + '&' +
    'resultRecordCount=2000&' +
    'geometry=' + encodeURIComponent(JSON.stringify({
      xmin: -7526593.264043136,
      ymin: 1941281.9702659545,
      xmax: -7250000.369888829,
      ymax: 2213831.9532818417,
      spatialReference: { wkid: 3857 }
    }))

  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    if (retryCount > 0) {
      console.warn(`Retrying fetch (${retryCount} attempts remaining)...`)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second before retry
      return fetchUSNGFeatures(offset, retryCount - 1)
    }
    console.error('Error fetching USNG features:', error)
    throw error
  }
}

async function createBarriosAndSectores(municipioId) {
  // Create a barrio
  const barrio = await prisma.barrio.create({
    data: {
      nombre: `Barrio ${municipioId}-1`,
      codigo_barrio: `${municipioId}01`,
      id_municipio: municipioId,
      sectores: {
        create: {
          nombre: `Sector ${municipioId}-1`,
          codigo_sector: `${municipioId}01`
        }
      }
    },
    include: {
      sectores: true
    }
  })
  
  return {
    barrioId: barrio.id_barrio,
    sectorId: barrio.sectores[0].id_sector
  }
}

function generateRandomProperties(gridId, municipioId, barrioId, sectorId) {
  const numProperties = Math.floor(Math.random() * 5) + 1
  const properties = []

  for (let i = 0; i < numProperties; i++) {
    properties.push({
      valor: Math.floor(Math.random() * 450000) + 50000,
      tipo: property_types[Math.floor(Math.random() * property_types.length)],
      id_municipio: municipioId,
      id_barrio: barrioId,
      id_sector: sectorId,
      gridId: gridId,
      geometria: {
        type: "Point",
        coordinates: [0, 0]
      }
    })
  }
  return properties
}

async function main() {
  console.log('Starting seed process...')
  
  try {
    // First clear all dependent tables
    console.log('Clearing existing data...')
    
    // Clear Cuencas first
    await prisma.cuenca.deleteMany()
    
    // Clear Properties next
    await prisma.propiedades_Existentes.updateMany({
      data: {
        gridId: undefined
      }
    })
    await prisma.propiedades_Existentes.deleteMany()
    // Finally clear KilometerGrid
    await prisma.kilometerGrid.deleteMany()

    console.log('Successfully cleared existing data')

    // Fetch and populate USNG grid data
    console.log('Fetching USNG grid data...')
    let offset = 0
    let totalFeatures = 0
    let hasMoreFeatures = true
    const processedUSNG = new Set()

    while (hasMoreFeatures) {
      const data = await fetchUSNGFeatures(offset)
      if (data.features && data.features.length > 0) {
        console.log(`Processing batch of ${data.features.length} features...`)
        
        for (const feature of data.features) {
          try {
            const { centroid, usngCode } = calculateCentroidAndUSNG(feature.geometry.rings)

            // Skip if we've already processed this USNG code
            if (processedUSNG.has(usngCode)) {
              console.warn(`Duplicate USNG code found: ${usngCode}`)
              continue
            }

            await prisma.kilometerGrid.create({
              data: {
                usngCode: usngCode,
                geometria: centroid
              }
            })
            processedUSNG.add(usngCode)
            totalFeatures++

            if (totalFeatures % 100 === 0) {
              console.log(`Processed ${totalFeatures} features...`)
            }
          } catch (error) {
            console.error(`Error processing feature:`, error)
            continue
          }
        }

        if (data.exceededTransferLimit) {
          offset += data.features.length
        } else {
          hasMoreFeatures = false
        }
      } else {
        hasMoreFeatures = false
      }
    }

    console.log(`Successfully populated KilometerGrid with ${totalFeatures} USNG grid cells`)

    // Update existing properties with new grid references
    console.log('Updating property references...')
    const properties = await prisma.propiedades_Existentes.findMany({
      select: {
        id: true,
        geometria: true
      }
    })
    
    let updatedProperties = 0
    for (const property of properties) {
      try {
        const geom = property.geometria
        
        if (geom?.coordinates) {
          const [lon, lat] = geom.coordinates
          const usngCode = convertLatLngToUSNG(lat, lon)

          const grid = await prisma.kilometerGrid.findFirst({
            where: { usngCode }
          })

          if (grid) {
            await prisma.propiedades_Existentes.update({
              where: { id: property.id },
              data: { gridId: grid.id }
            })
            updatedProperties++
          }
        }
      } catch (error) {
        console.error(`Error updating property ${property.id}:`, error)
        continue
      }
    }

    console.log(`Updated ${updatedProperties} properties with grid references`)

    // Cuencas Population
    if (SEED_CONFIG.TABLES.CUENCAS) {
      if (SEED_CONFIG.CLEAR_BEFORE_SEED.CUENCAS) {
        console.log('Clearing existing cuencas...')
        await prisma.cuenca.deleteMany({})
      }

      console.log('Start seeding cuencas...')
      for (const grid of await prisma.kilometerGrid.findMany()) {
        const numCuencas = Math.floor(Math.random() * SEED_CONFIG.LIMITS.MAX_CUENCAS_PER_GRID) + 1
        
        for (let i = 0; i < numCuencas; i++) {
          const randomCuencaName = cuencaNames[Math.floor(Math.random() * cuencaNames.length)]
          
          try {
            const coordinates = grid.geometria?.coordinates ?? [0, 0]

            await prisma.cuenca.create({
              data: {
                nombre: randomCuencaName,
                codigo_cuenca: `CUE-${grid.usngCode}-${i + 1}`,
                gridId: grid.id,
                geometria: {
                  type: "Point",
                  coordinates: [
                    Number(coordinates[0]),
                    Number(coordinates[1])
                  ]
                }
              }
            })
          } catch (error) {
            console.error(`Error creating cuenca for grid ${grid.usngCode}:`, error)
            continue
          }
        }
      }
      console.log('Cuencas seeding completed')
    }

    console.log('Seeding process completed successfully')
  } catch (error) {
    console.error('Error in main:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })