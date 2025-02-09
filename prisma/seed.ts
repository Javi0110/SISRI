const { PrismaClient } = require('@prisma/client')
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

async function createBarriosAndSectores(municipioId: number) {
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

function generateRandomProperties(gridId: number, municipioId: number, barrioId: number, sectorId: number) {
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
  try {
    console.log('Starting seed process...')

    // KilometerGrid Population
    if (SEED_CONFIG.TABLES.KILOMETER_GRID) {
      console.log('Seeding KilometerGrid...')
      const gridDataPath = path.join(__dirname, 'grid_Ksquares.json')
      const gridData = JSON.parse(fs.readFileSync(gridDataPath, 'utf8'))

      for (const grid of gridData) {
        await prisma.kilometerGrid.upsert({
          where: { usngCode: grid.usng },
          update: {
            geometria: {
              type: "Point",
              coordinates: [grid.longitud, grid.latitud]
            }
          },
          create: {
            usngCode: grid.usng,
            geometria: {
              type: "Point",
              coordinates: [grid.longitud, grid.latitud]
            }
          }
        })
      }
      console.log('KilometerGrid seeding completed')
    }

    // Get existing grids for properties and cuencas
    const grids = await prisma.kilometerGrid.findMany({
      select: {
        id: true,
        usngCode: true,
        geometria: true
      },
      take: Math.ceil(SEED_CONFIG.LIMITS.MAX_TOTAL_PROPERTIES / SEED_CONFIG.LIMITS.PROPERTIES_PER_GRID)
    })

    if (grids.length === 0) {
      throw new Error('No KilometerGrid records found. Please populate KilometerGrid first.')
    }

    // Properties Population
    if (SEED_CONFIG.TABLES.PROPERTIES) {
      if (SEED_CONFIG.CLEAR_BEFORE_SEED.PROPERTIES) {
        console.log('Clearing existing properties...')
        await prisma.propiedades_Existentes.deleteMany({})
      }

      console.log(`Creating properties for ${grids.length} grids...`)
      let propertyCount = 0

      for (const grid of grids) {
        if (propertyCount >= SEED_CONFIG.LIMITS.MAX_TOTAL_PROPERTIES) break

        const randomMunicipio = await prisma.municipio.findFirst({
          select: {
            id_municipio: true,
            barrios: {
              select: {
                id_barrio: true,
                sectores: {
                  select: {
                    id_sector: true
                  }
                }
              }
            }
          },
          orderBy: {
            id_municipio: 'asc'
          }
        })

        if (!randomMunicipio || !randomMunicipio.barrios[0]) continue

        const barrio = randomMunicipio.barrios[0]
        const sector = barrio.sectores[0]

        for (let i = 0; i < SEED_CONFIG.LIMITS.PROPERTIES_PER_GRID; i++) {
          if (propertyCount >= SEED_CONFIG.LIMITS.MAX_TOTAL_PROPERTIES) break

          try {
            await prisma.propiedades_Existentes.create({
              data: {
                valor: Math.floor(Math.random() * 450000) + 50000,
                tipo: SEED_CONFIG.PROPERTY_TYPES[Math.floor(Math.random() * SEED_CONFIG.PROPERTY_TYPES.length)],
                id_municipio: randomMunicipio.id_municipio,
                id_barrio: barrio.id_barrio,
                id_sector: sector.id_sector,
                gridId: grid.id,
                geometria: {
                  type: "Point",
                  coordinates: [
                    Number(grid.geometria.coordinates[0]),
                    Number(grid.geometria.coordinates[1])
                  ]
                }
              }
            })
            propertyCount++
            
            if (propertyCount % 10 === 0) {
              console.log(`Created ${propertyCount} properties...`)
            }
          } catch (error) {
            console.error(`Error creating property for grid ${grid.usngCode}:`, error)
            continue
          }
        }
      }
      console.log(`Finished creating ${propertyCount} properties.`)
    }

    // Cuencas Population
    if (SEED_CONFIG.TABLES.CUENCAS) {
      if (SEED_CONFIG.CLEAR_BEFORE_SEED.CUENCAS) {
        console.log('Clearing existing cuencas...')
        await prisma.cuenca.deleteMany({})
      }

      console.log('Start seeding cuencas...')
      for (const grid of grids) {
        const numCuencas = Math.floor(Math.random() * SEED_CONFIG.LIMITS.MAX_CUENCAS_PER_GRID) + 1
        
        for (let i = 0; i < numCuencas; i++) {
          const randomCuencaName = cuencaNames[Math.floor(Math.random() * cuencaNames.length)]
          
          try {
            await prisma.cuenca.create({
              data: {
                nombre: randomCuencaName,
                codigo_cuenca: `CUE-${grid.usngCode}-${i + 1}`,
                gridId: grid.id,
                geometria: {
                  type: "Point",
                  coordinates: [
                    Number(grid.geometria.coordinates[0]),
                    Number(grid.geometria.coordinates[1])
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

    console.log('Seeding process finished.')
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