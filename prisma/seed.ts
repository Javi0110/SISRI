// import { PrismaClient } from '@prisma/client'
// import mgrs from 'mgrs'
// import fetch from 'node-fetch'
// import { municipios } from './data/municipios'

// const prisma = new PrismaClient()

// const property_types = ["Residential", "Commercial", "Industrial", "Agricultural"]

// // Configuration for seeding control
// const SEED_CONFIG = {
//   TABLES: {
//     USNG_GRID: true,        // Set to true to populate USNGSquare
//     KILOMETER_GRID: true,    // Set to true to populate KilometerGrid
//     MUNICIPIOS: true,        // Set to true to populate Municipios
//     PROPERTIES: true,        // Set to true to populate Properties
//     CUENCAS: true,          // Set to true to populate Cuencas
//   },
//   CLEAR_BEFORE_SEED: {
//     PROPERTIES: false,        // Set to true to clear properties before seeding
//     CUENCAS: false,          // Set to true to clear cuencas before seeding
//   },
//   LIMITS: {
//     MAX_PROPERTIES_PER_GRID: 5,
//     MAX_CUENCAS_PER_GRID: 2
//   },
//   PROPERTY_TYPES: ["Residential", "Commercial", "Industrial", "Agricultural"]
// }

// // const cuencaNames = [
// //   "Río Grande de Loíza",
// //   "Río de la Plata",
// //   "Río Cibuco",
// //   "Río Guajataca",
// //   "Río Grande de Arecibo",
// //   "Río Bayamón",
// //   "Río Humacao",
// //   "Río Añasco",
// //   "Río Guanajibo",
// //   "Río Portugués"
// // ]

// // Function to convert lat/lon to USNG
// // function convertLatLngToUSNG(lat: number, lon: number) {
// //   try {
// //     const usng = mgrs.forward([lon, lat], 4) // 4-digit precision for 1000m grid
// //     return usng.replace(/\s/g, '') // Remove spaces

// //   } catch (error) {
// //     console.error(`Error converting coordinates (${lat}, ${lon}) to USNG:`, error)
// //     throw error
// //   }
// // }

// // Use native fetch since it's available in Node.js now
// async function fetchUSNGFeatures(offset = 0) {
//   const url = 'https://services2.arcgis.com/FiaPA4ga0iQKduv3/ArcGIS/rest/services/US_National_Grid_HFL_V/FeatureServer/3/query?' +
//     'f=json&' +
//     'returnGeometry=true&' +
//     'spatialRel=esriSpatialRelIntersects&' +
//     'where=1=1&' +
//     'outFields=USNG&' +
//     'outSR=4326&' + // Use geographic coordinates
//     'resultOffset=' + offset + '&' +
//     'resultRecordCount=100&' +
//     'geometry=' + encodeURIComponent(JSON.stringify({
//       xmin: -67.5,
//       ymin: 17.8,
//       xmax: -65.5,
//       ymax: 18.5,
//       spatialReference: { wkid: 4326 }
//     }))

//   try {
//     const response = await fetch(url)
//     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
//     return await response.json()
//   } catch (error) {
//     console.error('Error fetching USNG features:', error)
//     throw error
//   }
// }

// // async function createBarriosAndSectores(municipioId: number) {
// //   // Create a barrio
// //   const barrio = await prisma.barrio.create({
// //     data: {
// //       nombre: `Barrio ${municipioId}-1`,
// //       codigo_barrio: `${municipioId}01`,
// //       id_municipio: municipioId,
// //       sectores: {
// //         create: {
// //           nombre: `Sector ${municipioId}-1`,
// //           codigo_sector: `${municipioId}01`
// //         }
// //       }
// //     },
// //     include: {
// //       sectores: true
// //     }
// //   })
  
// //   return {
// //     barrioId: barrio.id_barrio,
// //     sectorId: barrio.sectores[0].id_sector
// //   }
// // }

// function generateRandomProperties(gridId: number, municipioId: number, barrioId: number, sectorId: number) {
//   const numProperties = Math.floor(Math.random() * 5) + 1
//   const properties = []

//   for (let i = 0; i < numProperties; i++) {
//     properties.push({
//       valor: Math.floor(Math.random() * 450000) + 50000,
//       tipo: property_types[Math.floor(Math.random() * property_types.length)],
//       id_municipio: municipioId,
//       id_barrio: barrioId,
//       id_sector: sectorId,
//       gridId: gridId,
//       geometria: {
//         type: "Point",
//         coordinates: [0, 0]
//       }
//     })
//   }
//   return properties
// }

// // List of all 78 Puerto Rico municipios
// const municipiosList = [
//   'Adjuntas', 'Aguada', 'Aguadilla', 'Aguas Buenas', 'Aibonito', 'Añasco', 'Arecibo', 'Arroyo',
//   'Barceloneta', 'Barranquitas', 'Bayamón', 'Cabo Rojo', 'Caguas', 'Camuy', 'Canóvanas', 'Carolina',
//   'Cataño', 'Cayey', 'Ceiba', 'Ciales', 'Cidra', 'Coamo', 'Comerío', 'Corozal',
//   'Culebra', 'Dorado', 'Fajardo', 'Florida', 'Guánica', 'Guayama', 'Guayanilla', 'Guaynabo',
//   'Gurabo', 'Hatillo', 'Hormigueros', 'Humacao', 'Isabela', 'Jayuya', 'Juana Díaz', 'Juncos',
//   'Lajas', 'Lares', 'Las Marías', 'Las Piedras', 'Loíza', 'Luquillo', 'Manatí', 'Maricao',
//   'Maunabo', 'Mayagüez', 'Moca', 'Morovis', 'Naguabo', 'Naranjito', 'Orocovis', 'Patillas',
//   'Peñuelas', 'Ponce', 'Quebradillas', 'Rincón', 'Río Grande', 'Sabana Grande', 'Salinas', 'San Germán',
//   'San Juan', 'San Lorenzo', 'San Sebastián', 'Santa Isabel', 'Toa Alta', 'Toa Baja', 'Trujillo Alto',
//   'Utuado', 'Vega Alta', 'Vega Baja', 'Vieques', 'Villalba', 'Yabucoa', 'Yauco'
// ];

// async function main() {
//   try {
//     console.log('Starting database seeding...')

//     // First, clear only the USNG and KilometerGrid data
//     // Don't delete Propiedades_Existentes as it depends on other tables
//     await prisma.$transaction([
//       prisma.uSNGSquare.deleteMany(),
//       prisma.kilometerGrid.deleteMany(),
//     ])

//     console.log('Fetching USNG grid data...')
//     let offset = 0
//     let hasMoreFeatures = true
//     const processedUSNG = new Set()

//     while (hasMoreFeatures) {
//       const data = await fetchUSNGFeatures(offset) as { features?: { attributes: any; geometry: any }[]; exceededTransferLimit?: boolean }
      
//       if (!data.features?.length) {
//         hasMoreFeatures = false
//         continue
//       }

//       for (const feature of data.features) {
//         try {
//           const usng = feature.attributes.USNG
//           if (processedUSNG.has(usng)) continue

//           // Extract coordinates from the geometry
//           const rings = feature.geometry.rings[0]
//           const latitudes = rings.map((coord: number[]) => coord[1])
//           const longitudes = rings.map((coord: number[]) => coord[0])

//           // Calculate center point
//           const centerLat = latitudes.reduce((a: number, b: number) => a + b) / latitudes.length
//           const centerLon = longitudes.reduce((a: number, b: number) => a + b) / longitudes.length

//           // Create USNG square
//           await prisma.uSNGSquare.create({
//             data: {
//               usng,
//               geometry: feature.geometry,
//               latitudes: latitudes.join(','),
//               longitudes: longitudes.join(',')
//             }
//           })

        

//           processedUSNG.add(usng)
          
//           if (processedUSNG.size % 10 === 0) {
//             console.log(`Processed ${processedUSNG.size} USNG squares`)
//           }
//         } catch (error) {
//           console.error('Error processing USNG feature:', error)
//           console.error('Feature data:', feature)
//           continue // Continue with next feature even if one fails
//         }
//       }
//       offset += data.features.length
//       hasMoreFeatures = data.exceededTransferLimit ?? false
//       console.log(`Processed batch of ${data.features.length} features. Total: ${processedUSNG.size}`)
//     }

//     console.log(`Completed seeding ${processedUSNG.size} USNG squares`)

//     // Create properties and cuencas for each grid
//     const grids = await prisma.uSNGSquare.findMany()

//     for (const grid of grids) {
//       // Create properties
//       if (SEED_CONFIG.TABLES.PROPERTIES) {
//         const numProperties = Math.floor(Math.random() * SEED_CONFIG.LIMITS.MAX_PROPERTIES_PER_GRID) + 1
        
//         for (let i = 0; i < numProperties; i++) {
//           await prisma.propiedades_Existentes.create({
//             data: {
//               valor: Math.floor(Math.random() * 450000) + 50000,
//               tipo: SEED_CONFIG.PROPERTY_TYPES[Math.floor(Math.random() * SEED_CONFIG.PROPERTY_TYPES.length)],
//               id_municipio: 1, // You'll need to create municipalities first
//               id_barrio: 1,   // You'll need to create barrios first
//               id_sector: 1,   // You'll need to create sectors first
//               gridId: grid.id,
//               geometria: {
//                 type: "Point",
//                 coordinates: [
//                   (grid.geometria as any)?.coordinates?.[0] ?? 0,
//                   (grid.geometria as any)?.coordinates?.[1] ?? 0
//                 ]
//               }
//             }
//           })
//         }
//       }

//       // Create cuencas
//       if (SEED_CONFIG.TABLES.CUENCAS) {
//         const numCuencas = Math.floor(Math.random() * SEED_CONFIG.LIMITS.MAX_CUENCAS_PER_GRID) + 1
        
//         for (let i = 0; i < numCuencas; i++) {
//           await prisma.cuenca.create({
//             data: {
//               nombre: `Cuenca ${i + 1}`,
//               codigo_cuenca: `CUE-${grid.usngCode}-${i + 1}`,
//               gridId: grid.id,
//               geometria: {
//                 type: "Polygon",
//                 coordinates: (grid.geometria as any)?.coordinates ?? []
//               }
//             }
//           })
//         }
//       }
//     }

//     console.log('Starting to seed municipios...')
    
//     // Clear existing municipios if needed
//     await prisma.municipio.deleteMany({})
    
//     // Add all municipios
//     const created = await prisma.municipio.createMany({
//       data: municipios,
//       skipDuplicates: true, // Skip if nombre already exists
//     })
    
//     console.log(`Successfully added ${created.count} municipios`)
//   } catch (error) {
//     console.error('Error seeding database:', error)
//     throw error
//   } finally {
//     await prisma.$disconnect()
//   }
// }

// main()
//   .catch((e) => {
//     console.error(e)
//     process.exit(1)
//   }) 