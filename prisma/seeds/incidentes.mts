// import { PrismaClient } from '@prisma/client'
// import * as url from 'url'

// const prisma = new PrismaClient()

// const incidentTypes = [
//   "Inundación",
//   "Deslizamiento",
//   "Erosión",
//   "Desbordamiento"
// ]

// // const severityLevels = [
// //   "Bajo",
// //   "Medio",
// //   "Alto",
// //   "Crítico"
// // ]

// async function seedIncidentes() {
//   try {
//     console.log('Starting incidentes seeding...')

//     // First, check if we have USNGSquares
//     const usngSquare = await prisma.uSNGSquare.findFirst()
//     if (!usngSquare) {
//       throw new Error('No USNGSquare found. Please seed USNGSquare first.')
//     }

//     // Create notification and evento
//     const notification = await prisma.notificacion.create({
//       data: {}
//     })

//     const evento = await prisma.eventos.create({
//       data: {
//         notificacionId: notification.id,
//         titulo: "Evento de prueba",
//         descripcion: "Evento generado para pruebas",
//         fecha: new Date(),
//         gridId: usngSquare.id, // Use an existing USNGSquare id
//       }
//     })

//     // Get cuencas to link incidents to
//     const cuencas = await prisma.cuenca.findMany()
//     if (cuencas.length === 0) {
//       throw new Error('No cuencas found. Please seed cuencas first.')
//     }

//     // Get properties to link incidents to
//     const properties = await prisma.propiedades_Existentes.findMany()
//     console.log(`Found ${properties.length} properties`)

//     for (const cuenca of cuencas) {
//       const numIncidentes = Math.floor(Math.random() * 3) // 0-2 incidents per cuenca
      
//       for (let i = 0; i < numIncidentes; i++) {
//         try {
//           const incidentData = {
//             tipo: incidentTypes[Math.floor(Math.random() * incidentTypes.length)],
//             descripcion: `Incidente reportado en cuenca ${cuenca.codigo_cuenca}`,
//             eventoId: evento.id,
//             cuencaId: cuenca.id
//           }

//           // Create the incident first
//           const incident = await prisma.incidentes.create({
//             data: incidentData
//           })

//           // If we want to link properties, do it after creating the incident
//           if (properties.length > 0 && Math.random() > 0.5) {
//             const randomProperty = properties[Math.floor(Math.random() * properties.length)]
//             await prisma.incidentes.update({
//               where: { id: incident.id },
//               data: {
//                 propiedades: {
//                   connect: { id: randomProperty.id }
//                 }
//               }
//             })
//           }
//         } catch (error) {
//           console.error(`Error creating incidente for cuenca ${cuenca.codigo_cuenca}:`, error)
//           continue
//         }
//       }
//     }

//     console.log('Incidentes seeding completed')
//   } catch (error) {
//     console.error('Error seeding incidentes:', error)
//     throw error
//   }
// }

// async function main() {
//   try {
//     await seedIncidentes()
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

// export { seedIncidentes }
