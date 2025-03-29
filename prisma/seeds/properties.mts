// import { PrismaClient } from '@prisma/client'
// import { fileURLToPath } from 'url'
// import * as url from 'url'

// const prisma = new PrismaClient()

// // Sample data for required relations
// const municipios = [
//   { 
//     nombre: "San Juan", 
//     codigo_municipio: "127", 
//     latitud: 18.4655, 
//     longitud: -66.1057 
//   },
//   { 
//     nombre: "Ponce", 
//     codigo_municipio: "113", 
//     latitud: 18.0111, 
//     longitud: -66.6140 
//   },
//   { 
//     nombre: "Mayagüez", 
//     codigo_municipio: "097", 
//     latitud: 18.2011, 
//     longitud: -67.1397 
//   },
// ]

// async function seedProperties() {
//   try {
//     console.log('Starting properties seeding...')

//     // Create Municipios first
//     for (const municipio of municipios) {
//       await prisma.municipio.upsert({
//         where: { codigo_municipio: municipio.codigo_municipio },
//         update: {},
//         create: municipio
//       })
//     }

//     // Create one Barrio for each Municipio
//     const barrios = await Promise.all(municipios.map(async (municipio, index) => {
//       const barrio = await prisma.barrio.create({
//         data: {
//           nombre: `Barrio Principal ${municipio.nombre}`,
//           codigo_barrio: `${municipio.codigo_municipio}01`,
//           municipio: {
//             connect: { codigo_municipio: municipio.codigo_municipio }
//           }
//         }
//       })
//       return barrio
//     }))

//     // Create Sectores for each Barrio
//     await Promise.all(barrios.map(async (barrio) => {
//       await prisma.sector.create({
//         data: {
//           nombre: `Sector Principal ${barrio.nombre}`,
//           codigo_sector: `${barrio.codigo_barrio}01`,
//           barrio: {
//             connect: { id_barrio: barrio.id_barrio }
//           }
//         }
//       })
//     }))

//     // Get all USNG squares and create properties
//     const usngSquares = await prisma.uSNGSquare.findMany()
//     console.log(`Creating properties for ${usngSquares.length} USNG squares...`)
    
//     // Process in batches to avoid memory issues
//     const batchSize = 100
//     for (let i = 0; i < usngSquares.length; i += batchSize) {
//       const batch = usngSquares.slice(i, i + batchSize)
//       await Promise.all(batch.map(async (square) => {
//         const numProperties = Math.floor(Math.random() * 3) + 1 // 1-3 properties per square
        
//         for (let j = 0; j < numProperties; j++) {
//           // Randomly select a municipio
//           const randomMunicipio = municipios[Math.floor(Math.random() * municipios.length)]
          
//           // Get corresponding barrio
//           const barrio = await prisma.barrio.findFirst({
//             where: { 
//               municipio: { codigo_municipio: randomMunicipio.codigo_municipio }
//             }
//           })

//           if (!barrio) continue

//           // Get corresponding sector
//           const sector = await prisma.sector.findFirst({
//             where: { barrio: { id_barrio: barrio.id_barrio } }
//           })

//           if (!sector) continue

//           await prisma.propiedades_Existentes.create({
//             data: {
//               tipo: ["Residencial", "Comercial", "Industrial"][Math.floor(Math.random() * 3)],
//               valor: Math.floor(Math.random() * 1000000) + 50000,
//               geometria: {
//                 type: "Point",
//                 coordinates: [
//                   parseFloat(square.longitudes.split(',')[0]),
//                   parseFloat(square.latitudes.split(',')[0])
//                 ]
//               },
//               grid: {
//                 connect: { id: square.id }
//               },
//               municipio: {
//                 connect: { codigo_municipio: randomMunicipio.codigo_municipio }
//               },
//               barrio: {
//                 connect: { id_barrio: barrio.id_barrio }
//               },
//               sector: {
//                 connect: { id_sector: sector.id_sector }
//               }
//             }
//           })
//         }
//       }))
//       console.log(`Processed ${i + batch.length} of ${usngSquares.length} USNG squares`)
//     }

//     console.log('Properties seeding completed')
//   } catch (error) {
//     console.error('Error seeding properties:', error)
//     throw error
//   }
// }

// async function main() {
//   try {
//     await seedProperties()
//   } catch (error) {
//     console.error('Error:', error)
//     throw error
//   } finally {
//     await prisma.$disconnect()
//   }
// }

// if (import.meta.url === url.pathToFileURL(process.argv[1]).href) {
//   main()
//     .catch((e) => {
//       console.error(e)
//       process.exit(1)
//     })
// }

// export { seedProperties } 