import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const sensorTypes = [
  "Nivel de Agua",
  "Pluviómetro",
  "Movimiento de Tierra",
  "Calidad de Agua"
]

const alarmaTypes = [
  "Sirena",
  "Luz de Emergencia",
  "Sistema de Alerta",
  "Notificación Móvil"
]

async function seedTools() {
  try {
    console.log('Starting tools (sensors and alarmas) seeding...')

    // Get all USNG squares
    const usngSquares = await prisma.uSNGSquare.findMany()
    
    for (const square of usngSquares) {
      // Add sensors (0-2 per square)
      const numSensors = Math.floor(Math.random() * 3)
      for (let i = 0; i < numSensors; i++) {
        await prisma.sensor.create({
          data: {
            tipo: sensorTypes[Math.floor(Math.random() * sensorTypes.length)],
            estado: Math.random() > 0.1 ? "Activo" : "Inactivo", // 90% chance of being active
            ultima_lectura: new Date(),
            valor_actual: Math.random() * 100, // Random value between 0-100
            unidad_medida: "mm",
            geometria: {
              type: "Point",
              coordinates: [
                parseFloat(square.longitudes.split(',')[0]),
                parseFloat(square.latitudes.split(',')[0])
              ]
            },
            grid: {
              connect: { id: square.id }
            }
          }
        })
      }

      // Add alarmas (0-1 per square)
      if (Math.random() > 0.7) { // 30% chance of having an alarma
        await prisma.alarma.create({
          data: {
            tipo: alarmaTypes[Math.floor(Math.random() * alarmaTypes.length)],
            estado: Math.random() > 0.1 ? "Activo" : "Inactivo",
            ultimo_mantenimiento: new Date(Date.now() - Math.floor(Math.random() * 180) * 24 * 60 * 60 * 1000), // Random date within last 180 days
            geometria: {
              type: "Point",
              coordinates: [
                parseFloat(square.longitudes.split(',')[0]),
                parseFloat(square.latitudes.split(',')[0])
              ]
            },
            grid: {
              connect: { id: square.id }
            }
          }
        })
      }
    }

    console.log('Tools seeding completed')
  } catch (error) {
    console.error('Error seeding tools:', error)
    throw error
  }
}

export { seedTools } 