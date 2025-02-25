import { PrismaClient } from '@prisma/client'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import mgrs from 'mgrs'
import { seedProperties } from './seeds/properties.mjs'
import { seedCuencas } from './seeds/cuencas.mjs'
import { seedIncidentes } from './seeds/incidentes.mjs'
import { seedTools } from './seeds/tools.mjs'

const prisma = new PrismaClient()

// Sample data for required relations
const municipios = [
  { nombre: "San Juan", codigo_municipio: "127" },
  { nombre: "Ponce", codigo_municipio: "113" },
  { nombre: "Mayagüez", codigo_municipio: "097" },
  // Add more as needed
]

const barrios = [
  { nombre: "Santurce", codigo_barrio: "001" },
  { nombre: "Hato Rey", codigo_barrio: "002" },
  { nombre: "Río Piedras", codigo_barrio: "003" },
  // Add more as needed
]

const sectores = [
  { nombre: "Sector 1", codigo_sector: "001" },
  { nombre: "Sector 2", codigo_sector: "002" },
  { nombre: "Sector 3", codigo_sector: "003" },
  // Add more as needed
]

async function seedBaseData() {
  console.log('Seeding required reference data...')
  
  // Create Municipios
  for (const municipio of municipios) {
    await prisma.municipio.upsert({
      where: { codigo_municipio: municipio.codigo_municipio },
      update: {},
      create: {
        ...municipio,
        latitud: 0,
        longitud: 0
      }
    })
  }

  // Create Barrios
  for (const barrio of barrios) {
    await prisma.barrio.create({
      data: {
        nombre: barrio.nombre,
        codigo_barrio: barrio.codigo_barrio,
        municipio: {
          connect: { codigo_municipio: "127" } // Connecting to San Juan for now
        }
      }
    })
  }

  // Create Sectores
  for (const sector of sectores) {
    await prisma.sector.create({
      data: {
        nombre: sector.nombre,
        codigo_sector: sector.codigo_sector,
        barrio: {
          connect: { id_barrio: 1 } // Connecting to first barrio
        }
      }
    })
  }

  console.log('Required reference data seeded successfully')
}

// Add retry logic
async function fetchWithRetry(url: string, retries = 3, delay = 5000): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return await response.json()
    } catch (error) {
      if (i === retries - 1) throw error
      console.log(`Attempt ${i + 1} failed, retrying in ${delay/1000} seconds...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

async function fetchUSNGFeatures(offset = 0) {
  const url = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/ArcGIS/rest/services/US_National_Grid_HFL_V/FeatureServer/3/query?' +
    'f=json&' +
    'returnGeometry=true&' +
    'spatialRel=esriSpatialRelIntersects&' +
    'where=1=1&' +
    'outFields=USNG&' +
    'outSR=4326&' +
    'resultOffset=' + offset + '&' +
    'resultRecordCount=100&' +
    'geometry=' + encodeURIComponent(JSON.stringify({
      xmin: -67.5,
      ymin: 17.8,
      xmax: -65.5,
      ymax: 18.5,
      spatialReference: { wkid: 4326 }
    }))

  return await fetchWithRetry(url)
}

async function seedUSNGSquares() {
  try {
    console.log('Starting USNG squares seeding...')

    // Clear existing USNG data
    await prisma.$transaction([
      prisma.uSNGSquare.deleteMany(),
    ])

    console.log('Fetching USNG grid data...')
    let offset = 0
    let hasMoreFeatures = true
    const processedUSNG = new Set()

    while (hasMoreFeatures) {
      try {
        const data = await fetchUSNGFeatures(offset)
        
        if (!data.features?.length) {
          hasMoreFeatures = false
          continue
        }

        for (const feature of data.features) {
          try {
            const usng = feature.attributes.USNG
            if (processedUSNG.has(usng)) continue

            const rings = feature.geometry.rings[0]
            const latitudes = rings.map((coord: number[]) => coord[1])
            const longitudes = rings.map((coord: number[]) => coord[0])

            // Create only USNG square
            await prisma.uSNGSquare.create({
              data: {
                usng,
                geometry: feature.geometry,
                latitudes: latitudes.join(','),
                longitudes: longitudes.join(',')
              }
            })

            processedUSNG.add(usng)
            
            if (processedUSNG.size % 10 === 0) {
              console.log(`Processed ${processedUSNG.size} USNG squares`)
            }
          } catch (error) {
            console.error('Error processing USNG feature:', error)
            continue
          }
        }

        offset += data.features.length
        hasMoreFeatures = data.exceededTransferLimit
        console.log(`Processed batch of ${data.features.length} features. Total: ${processedUSNG.size}`)
        
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('Error processing batch:', error)
        console.log(`Progress saved at offset: ${offset}`)
        process.exit(1)
      }
    }

    console.log(`Completed seeding ${processedUSNG.size} USNG squares`)
  } catch (error) {
    console.error('Error seeding USNG squares:', error)
    throw error
  }
}

async function main() {
  try {
    console.log('🌱 Starting database seeding...')

    // First seed base data
    console.log('📍 Seeding base data...')
    await seedBaseData()

    // Then seed USNG squares
    console.log('🗺️ Seeding USNG squares...')
    await seedUSNGSquares()
    
    // Now seed all related data
    console.log('🏠 Seeding properties...')
    await seedProperties()
    
    console.log('💧 Seeding cuencas...')
    await seedCuencas()
    
    console.log('⚠️ Seeding incidentes...')
    await seedIncidentes()
    
    console.log('🔧 Seeding tools...')
    await seedTools()

    console.log('✨ All seeding completed successfully')
  } catch (error) {
    console.error('❌ Error in seed process:', error)
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
